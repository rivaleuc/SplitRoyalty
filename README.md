# SplitRoyalty

AI-judged royalty splits for creative collaborations. Describe contributions, GenLayer validators assign fair percentages by consensus.

## Why This Exists

Creative collaborations break down over money. Who deserves more — the songwriter or the producer? The designer or the developer? There's no formula. SplitRoyalty lets collaborators describe what they did, and AI validators judge fair percentage splits.

## Why GenLayer

- **Subjectivity is the point** — "I wrote the lyrics" vs "I produced the beat" has no mathematical answer. It requires judgment about creative value, time investment, and industry norms.
- **Independent assessment prevents bias** — Multiple validators evaluate contributions separately, preventing any single perspective from dominating.
- **Context-aware reasoning** — Validators understand that "produced the entire track from scratch" means more than "added a hi-hat loop." Deterministic contracts can't weigh qualitative descriptions.
- **Consensus = fairness** — The final split emerges from multiple independent judgments, approximating what a panel of industry professionals would decide.
- **No gaming the system** — Because validators reason about meaning, inflating your contribution description doesn't work the way keyword-stuffing would against a rules-based system.

## Structure

```
SplitRoyalty/
├── onchain/        # GenLayer contract (.py) + Solidity payment splitter (.sol)
├── view/           # Solid.js frontend
└── README.md
```

## Test Results

```
Input:  Ali — "Produced the entire beat, mixed and mastered"
        Sara — "Wrote and performed vocals"
Output: Ali: 60% | Sara: 40%
```

## Deployment

- **Network:** GenLayer Testnet
- **Contract:** `0x2CFfF7dDEcc90C2b72e5BD19B1003Ef688cCb7C7`

## Quick Start

```bash
cd view && npm install && npm run dev
# Each collaborator describes their contribution
# Validators return consensus percentage split
```
