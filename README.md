# SplitRoyalty

AI-judged royalty splits for creative collaborations. Describe contributions, GenLayer validators assign fair percentages by consensus.

## Why GenLayer

Judging creative contribution is inherently subjective:

- **No formula exists for "fair."** Who contributed more — the lyricist or the producer? The lead vocalist or the mixing engineer? This is a judgment call, not a calculation.
- **Validators assess independently.** Each model evaluates the creative weight of each role without coordination, then consensus emerges. No single judge's bias dominates.
- **Splits must sum to exactly 100%.** The validator function enforces this constraint — consensus only accepts mathematically valid splits.
- **Removes the "band argument."** Every creative team fights about splits. An impartial AI jury with no stake in the outcome resolves it fairly.

## Deployed

**GenLayer (Bradbury):** `0x2CFfF7dDEcc90C2b72e5BD19B1003Ef688cCb7C7`

## Test result

Project: "Beat Tape" — Ali (producer) + Sara (vocalist)
→ **Ali: 60% / Sara: 40%** — AI judged production as higher creative weight.

## Structure

```
SplitRoyalty/
├── onchain/
│   ├── split_royalty.py     ← GenLayer contract
│   └── RoyaltySplitter.sol  ← Auto-splits ETH by percentages
├── view/                    ← Solid.js frontend
└── README.md
```
