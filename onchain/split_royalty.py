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
            if isinstance(raw, dict):
                return json.dumps(raw)
            return str(raw).strip()

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            try:
                data = json.loads(leader_result.calldata)
                splits = data.get("splits")
                if not isinstance(splits, list) or len(splits) == 0:
                    return False
                total = sum(s.get("percentage", 0) for s in splits)
                if total != 100:
                    return False
                return True
            except Exception:
                return False

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
