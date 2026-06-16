# SplitRoyalty

**AI-judged royalty splits for collaborations — describe who did what, and validators agree on a fair percentage breakdown.**

SplitRoyalty settles the hardest conversation in any collaboration: who gets what slice. A creator lists the contributors and their roles; GenLayer validators weigh the creative and technical contribution of each role and reach consensus on a split that sums to exactly 100% — an impartial judge instead of an argument, recorded on-chain for an EVM splitter to pay out against.

- **Contract (Bradbury, chain 4221):** `0x043476C5f3cD1AC2304100444651766EE4C1A590`
- **Explorer:** https://explorer-bradbury.genlayer.com/contract/0x043476C5f3cD1AC2304100444651766EE4C1A590
- **Live app:** https://splitroyalty.pages.dev

## What it does

The lifecycle is **create → judge → read splits**:

1. **`create_project(title, contributors_json, description)`** — a creator opens a project. `contributors_json` is a JSON array of `{name, role}` entries. Stored as JSON in `projects: TreeMap[str, str]`, keyed by an incrementing `project_count`, with `judged=False` and empty `splits`.
2. **`judge_splits(project_key)`** — triggers AI adjudication via the internal `_evaluate_contributions`, then writes the resulting `splits` back to storage and sets `judged=True`.
3. **Adjudication (the core).** Inside `_evaluate_contributions`, a `leader_fn` builds a prompt from the project title, description, and the list of contributors/roles, then calls **`gl.nondet.exec_prompt(prompt, response_format="json")`**, instructing the model to assign each contributor a percentage that sums to exactly 100 based on the creative/technical weight of their role and reply `{"splits":[{"name","percentage"}], "reasoning"}`. (Unlike the other apps in this set, SplitRoyalty judges from the *submitted contribution descriptions* — it does not crawl the web via `gl.nondet.web`, because the evidence is the declared collaboration itself, not an external page.)
4. **Consensus.** The verdict is finalized through **`gl.vm.run_nondet_unsafe(leader_fn, validator_fn)`**. The `validator_fn` re-checks the leader's `gl.vm.Return.calldata` for *structure and an invariant*: `splits` is a non-empty list **and the percentages sum to exactly 100**. Validators agree the breakdown is well-formed and balanced, not that their wording matches — a split that doesn't total 100 is rejected.
5. **`read_splits(project_key)`** — the resolver an EVM splitter reads to route payouts (`judged`, `splits`). `get_project` and `stats` are views.

## Why GenLayer

A deterministic EVM cannot decide that a producer deserves 26% and a vocalist 24%. There is no formula in Solidity for the *creative weight* of a role — it's a judgement call over a natural-language description of who contributed what. Hardcoding fixed percentages defeats the point, and an off-chain script would just move the trust to whoever ran it. The fair-split decision needs an LLM's reasoning, applied consistently and agreed upon by many independent nodes.

GenLayer's **Optimistic Democracy** delivers that: a leader validator proposes the split, others re-evaluate it, and it finalizes when a supermajority agrees the breakdown is *reasonable* and balanced — with the sum-to-100 invariant enforced by every validator. Disagreement triggers an appeal.

**Use GenLayer when** the allocation is subjective and must be agreed trustlessly (how much was each collaborator worth?). **Use a plain backend when** the split is a fixed, pre-agreed constant — that's just a deterministic transfer and belongs in the EVM splitter, which only *reads* the judged result.

## Architecture

| Intelligent contract (GenLayer) | Frontend dir | EVM / off-chain |
| --- | --- | --- |
| `onchain/split_royalty.py` — `SplitRoyalty(gl.Contract)`: `create_project`, `judge_splits`, `read_splits`, sum-to-100 split via `run_nondet_unsafe` | `view/` (Vite + React + TS) | `onchain/RoyaltySplitter.sol` — routes payouts on `read_splits`; judgement reasons over submitted contributions (no off-chain crawl) |

## Tech

**Contract** — GenVM Python, pinned to `py-genlayer:1jb45aa8…jpz09h6` via the `# { "Depends": ... }` header. State is a single `projects: TreeMap[str, str]` store with a `u256 project_count`; each project is a JSON blob holding contributors, the resolved splits, and a `judged` flag. The split judgement runs as a `leader_fn`/`validator_fn` pair through `gl.vm.run_nondet_unsafe`, with the validator enforcing the percentages-sum-to-100 invariant.

**Frontend** — Vite + React 19 + TypeScript with Tailwind v4, `framer-motion`, and `sonner`. `src/genlayer.ts` wraps `genlayer-js`: reads via `createClient({ chain: testnetBradbury }).readContract`; writes connect MetaMask (`eth_requestAccounts`), switch the wallet to chain `0x107d` (4221) via `wallet_switchEthereumChain`/`wallet_addEthereumChain` (no GenLayer snap required), then `writeContract` and await a `FINALIZED` receipt. The UI is a **mixing-console** metaphor in deep purple and gold: each contributor is a vertical-fader channel strip with a role selector and a tracking-level "gain," a master strip with a **BOUNCE** action that resolves the split, an animated split-sheet readout, and a "Lock split on-chain" control that maps the console's faders to the contract's judged percentages.

## Project structure

```
SplitRoyalty/
├── onchain/
│   ├── split_royalty.py      # SplitRoyalty(gl.Contract) — intelligent contract
│   └── RoyaltySplitter.sol   # EVM splitter, routes payouts on read_splits
├── view/                     # frontend (Vite + React + TS)
│   ├── src/
│   │   ├── App.tsx           # mixing-console split UI
│   │   ├── genlayer.ts       # genlayer-js reads + MetaMask writes
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
└── README.md
```

## Develop

```bash
cd view
npm install
npm run dev      # local dev server
npm run build    # tsc -b && vite build → dist/
```

## Deploy the frontend

Deployed on **Cloudflare Pages**:

- **Root directory:** `view`
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Environment:** `NODE_VERSION=20`

## Why GenLayer (engineering notes)

- **No floats.** Percentages are integers and must sum to exactly 100; `project_count` is `u256`. For finer-grained royalties, use integer basis points (10000 = 100%), never floats in contract state.
- **Validate structure *and* invariants, not exact match.** `validator_fn` confirms `splits` is a non-empty list and the percentages total 100. It never matches the leader's reasoning text — non-deterministic LLM output can't be compared exactly, so consensus checks shape plus the balance invariant.
- **ACCEPTED ≠ executed.** A finalized `judge_splits` means validators agreed the breakdown is reasonable and balanced; no royalties move until `RoyaltySplitter` reads `read_splits` and pays out.
- **Optimistic finality paces writes.** A judged split is only trustworthy after the appeal window — the frontend waits for a `FINALIZED` receipt (retries 60 × 5s), so judging takes ~30–60s. Don't distribute before finality.
- **Evidence is untrusted / greybox.** The contributor list is creator-supplied and self-reported — names and roles can be inflated. The prompt is told to weigh demonstrated role contribution, and the sum-to-100 invariant bounds the output; treat the submitted contributions as claims, not facts.

## License

MIT
