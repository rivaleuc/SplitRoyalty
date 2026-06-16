# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
import json
from genlayer import *


class SplitRoyalty(gl.Contract):
    projects: TreeMap[str, str]
    project_count: u256

    def __init__(self):
        self.project_count = u256(0)

    @gl.public.write
    def create_project(self, title: str, contributors_json: str, description: str) -> str:
        title = str(title).strip()
        if not title:
            raise Exception("title required")
        try:
            raw = contributors_json
            if isinstance(raw, list):
                contributors = raw
            else:
                contributors = json.loads(str(raw))
        except Exception:
            raise Exception("contributors_json must be valid JSON array")

        key = str(int(self.project_count))
        project = {
            "creator": str(gl.message.sender_address),
            "title": title,
            "description": str(description).strip()[:1000],
            "contributors": contributors,
            "splits": [],
            "judged": False,
        }
        self.projects[key] = json.dumps(project)
        self.project_count += u256(1)
        return key

    @gl.public.write
    def judge_splits(self, project_key: str) -> None:
        project_key = str(project_key)
        if project_key not in self.projects:
            raise Exception("unknown project")
        project = json.loads(self.projects[project_key])

        verdict = self._evaluate_contributions(project)
        project["splits"] = verdict["splits"]
        project["judged"] = True
        self.projects[project_key] = json.dumps(project)

    def _evaluate_contributions(self, project: dict) -> dict:
        title = project["title"]
        desc = project["description"]
        contributors = project["contributors"]

        def leader_fn() -> str:
            contribs_str = "\n".join([f"- {c['name']}: {c['role']}" for c in contributors])
            prompt = f"""You are judging contribution percentages for a collaborative project.

PROJECT: {title}
DESCRIPTION: {desc}

CONTRIBUTORS:
{contribs_str}

RULES:
1. Assign a percentage to each contributor (must sum to exactly 100).
2. Base it on the creative/technical weight of their role.
3. Be fair — all roles matter but some require more skill/time.

Reply ONLY valid JSON:
{{"splits": [{{"name": "...", "percentage": <int>}}], "reasoning": "<brief>"}}"""
            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            data = raw if isinstance(raw, dict) else json.loads(str(raw).strip())
            reasoning = str(data.get("reasoning", "")).strip()

            # Canonical contributor names define the split set (guarantees >=2 + non-empty names).
            names = [str(c.get("name", "")).strip() for c in contributors]
            names = [n for n in names if n]
            if len(names) < 2:
                # Fallback to any named splits the model returned.
                names = []
                for s in (data.get("splits") or []):
                    if isinstance(s, dict):
                        nm = str(s.get("name", "")).strip()
                        if nm and nm not in names:
                            names.append(nm)

            # Map model percentages by name; reject bools, clamp to [0, 100].
            pct_by_name = {}
            for s in (data.get("splits") or []):
                if not isinstance(s, dict):
                    continue
                nm = str(s.get("name", "")).strip()
                p = s.get("percentage", 0)
                if isinstance(p, bool):
                    p = 0
                try:
                    p = int(p)
                except Exception:
                    p = 0
                if nm:
                    pct_by_name[nm] = max(0, min(100, p))

            splits = [{"name": nm, "percentage": pct_by_name.get(nm, 0)} for nm in names]

            # Normalize percentages to sum to exactly 100 (deterministic).
            total = sum(s["percentage"] for s in splits)
            n = len(splits)
            if n == 0:
                # Should not happen (>=2 contributors expected), but keep output well-formed.
                splits = [{"name": "unknown_1", "percentage": 50}, {"name": "unknown_2", "percentage": 50}]
            elif total == 0:
                base = 100 // n
                for s in splits:
                    s["percentage"] = base
                rem = 100 - base * n
                for i in range(rem):
                    splits[i]["percentage"] += 1
            elif total != 100:
                scaled = [int(s["percentage"] * 100 / total) for s in splits]
                for i, s in enumerate(splits):
                    s["percentage"] = scaled[i]
                rem = 100 - sum(scaled)
                order = sorted(range(n), key=lambda i: -splits[i]["percentage"])
                j = 0
                while rem > 0:
                    splits[order[j % n]]["percentage"] += 1
                    rem -= 1
                    j += 1
            return json.dumps({"splits": splits, "reasoning": reasoning})

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            try:
                data = json.loads(leader_result.calldata)
            except Exception:
                return False
            splits = data.get("splits")
            # at least 2 splits
            if not isinstance(splits, list) or len(splits) < 2:
                return False
            total = 0
            for s in splits:
                if not isinstance(s, dict):
                    return False
                name = s.get("name")
                pct = s.get("percentage")
                # every name a non-empty str
                if not isinstance(name, str) or not name.strip():
                    return False
                # percentage must be a real int (not bool) in [0, 100]
                if isinstance(pct, bool) or not isinstance(pct, int):
                    return False
                if pct < 0 or pct > 100:
                    return False
                total += pct
            # cross-field invariant: percentages sum to exactly 100
            if total != 100:
                return False
            return True

        return json.loads(gl.vm.run_nondet_unsafe(leader_fn, validator_fn))

    @gl.public.view
    def get_project(self, key: str) -> dict:
        key = str(key)
        if key not in self.projects:
            return {"exists": False}
        return json.loads(self.projects[key])

    @gl.public.view
    def read_splits(self, key: str) -> dict:
        key = str(key)
        if key not in self.projects:
            return {"judged": False}
        p = json.loads(self.projects[key])
        return {"judged": p["judged"], "splits": p["splits"]}

    @gl.public.view
    def stats(self) -> dict:
        return {"total_projects": int(self.project_count)}
