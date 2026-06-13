import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Toaster, toast } from "sonner";

const CONTRACT = "0x2CFfF7dDEcc90C2b72e5BD19B1003Ef688cCb7C7";

type Role =
  | "Songwriter"
  | "Producer"
  | "Vocalist"
  | "Instrumentalist"
  | "Mixing Engineer";

interface Contributor {
  id: number;
  name: string;
  role: Role;
  notes: string;
}

interface SplitResult {
  name: string;
  role: Role;
  pct: number;
  rationale: string;
}

const ROLES: Role[] = [
  "Songwriter",
  "Producer",
  "Vocalist",
  "Instrumentalist",
  "Mixing Engineer",
];

const ROLE_WEIGHT: Record<Role, number> = {
  Songwriter: 30,
  Producer: 26,
  Vocalist: 24,
  Instrumentalist: 14,
  "Mixing Engineer": 10,
};

const PALETTE = [
  "#FFD700",
  "#C77DFF",
  "#9D4EDD",
  "#FF8FA3",
  "#5EE6C5",
  "#FFA94D",
];

const STEPS = [
  {
    n: "01",
    title: "Add the collaborators",
    body: "List everyone who touched the track — writers, producers, vocalists, players, engineers.",
  },
  {
    n: "02",
    title: "AI weighs the work",
    body: "The model reads each role and the notes you provide, then reasons about creative impact.",
  },
  {
    n: "03",
    title: "Mint a fair split",
    body: "Get transparent percentages with rationale, ready to lock into the on-chain royalty contract.",
  },
];

const FEATURES = [
  {
    icon: "🎚",
    title: "Role-aware reasoning",
    body: "Understands the difference between topline writing, beat production, and a mix polish.",
  },
  {
    icon: "⚖️",
    title: "Bias-checked verdicts",
    body: "Every split comes with a written rationale so no contributor is left guessing.",
  },
  {
    icon: "🔗",
    title: "On-chain settlement",
    body: "Approved splits write straight to the royalty contract — payouts flow automatically.",
  },
  {
    icon: "🎼",
    title: "Built for any medium",
    body: "Music, film scoring, design collectives, co-written books — anywhere credit is shared.",
  },
  {
    icon: "🕊",
    title: "Dispute-ready",
    body: "Transparent logic turns 'who deserves what' arguments into a signed, auditable record.",
  },
  {
    icon: "✨",
    title: "Instant re-runs",
    body: "Tweak a contribution note and re-judge in seconds — no spreadsheets, no awkward calls.",
  },
];

const DEFAULT_CONTRIBUTORS: Contributor[] = [
  {
    id: 1,
    name: "Mara V.",
    role: "Songwriter",
    notes: "Wrote the topline melody and all lyrics.",
  },
  {
    id: 2,
    name: "DJ Kovac",
    role: "Producer",
    notes: "Built the full beat, arrangement and chord progression.",
  },
  {
    id: 3,
    name: "Lena S.",
    role: "Vocalist",
    notes: "Lead vocals and harmony stacks.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

function computeSplit(contribs: Contributor[]): SplitResult[] {
  const weights = contribs.map((c) => {
    const base = ROLE_WEIGHT[c.role] ?? 12;
    const noteBonus = Math.min(c.notes.trim().length, 120) / 12; // detail rewarded
    return { c, w: base + noteBonus };
  });
  const total = weights.reduce((s, x) => s + x.w, 0) || 1;
  const raw = weights.map((x) => ({ ...x, pct: (x.w / total) * 100 }));
  // round to whole numbers and fix rounding drift on the largest share
  const rounded = raw.map((x) => ({ ...x, pct: Math.round(x.pct) }));
  const drift = 100 - rounded.reduce((s, x) => s + x.pct, 0);
  if (rounded.length) {
    const maxIdx = rounded.reduce(
      (mi, x, i, arr) => (x.pct > arr[mi].pct ? i : mi),
      0
    );
    rounded[maxIdx].pct += drift;
  }
  return rounded
    .map((x) => ({
      name: x.c.name || "Untitled",
      role: x.c.role,
      pct: x.pct,
      rationale: `${x.role} contribution weighted at ${ROLE_WEIGHT[x.role]}% base, adjusted for documented input.`,
    }))
    .sort((a, b) => b.pct - a.pct);
}

function App() {
  const [contributors, setContributors] = useState<Contributor[]>(
    DEFAULT_CONTRIBUTORS
  );
  const [nextId, setNextId] = useState(4);
  const [judging, setJudging] = useState(false);
  const [result, setResult] = useState<SplitResult[] | null>(null);
  const demoRef = useRef<HTMLDivElement>(null);

  const scrollToDemo = () =>
    demoRef.current?.scrollIntoView({ behavior: "smooth" });

  const addContributor = () => {
    if (contributors.length >= 6) {
      toast.error("Six collaborators max in the demo.");
      return;
    }
    setContributors((c) => [
      ...c,
      { id: nextId, name: "", role: "Instrumentalist", notes: "" },
    ]);
    setNextId((n) => n + 1);
  };

  const removeContributor = (id: number) =>
    setContributors((c) => c.filter((x) => x.id !== id));

  const updateContributor = (
    id: number,
    patch: Partial<Omit<Contributor, "id">>
  ) =>
    setContributors((c) =>
      c.map((x) => (x.id === id ? { ...x, ...patch } : x))
    );

  const judge = () => {
    const named = contributors.filter((c) => c.name.trim());
    if (named.length < 2) {
      toast.error("Add at least two named collaborators to judge a split.");
      return;
    }
    setJudging(true);
    setResult(null);
    toast.loading("AI is weighing each contribution…", { id: "split" });
    setTimeout(() => {
      const r = computeSplit(named);
      setResult(r);
      setJudging(false);
      toast.success(`Split decided across ${r.length} collaborators 🎶`, {
        id: "split",
      });
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-[#1A0B2E] text-purple-100 selection:bg-[#FFD700]/30">
      <Toaster theme="dark" position="top-right" richColors />

      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-purple-500/20 bg-[#1A0B2E]/85 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="#" className="flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-black text-[#1A0B2E]"
              style={{
                background:
                  "conic-gradient(from 140deg, #FFD700, #C77DFF, #FFD700)",
              }}
            >
              ♪
            </span>
            <span className="text-lg font-extrabold tracking-tight text-white">
              Split<span className="text-[#FFD700]">Royalty</span>
            </span>
          </a>
          <div className="hidden items-center gap-8 text-sm text-purple-200/70 md:flex">
            <a href="#how" className="transition hover:text-[#FFD700]">
              How it works
            </a>
            <a href="#features" className="transition hover:text-[#FFD700]">
              Features
            </a>
            <a href="#demo" className="transition hover:text-[#FFD700]">
              Try it
            </a>
          </div>
          <button
            onClick={scrollToDemo}
            className="rounded-full bg-[#FFD700] px-5 py-2 text-sm font-bold text-[#1A0B2E] transition hover:brightness-110"
          >
            Split a track
          </button>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-[#C77DFF]/30 blur-[130px]" />
        <div className="absolute -top-20 right-1/4 h-80 w-80 rounded-full bg-[#FFD700]/15 blur-[120px]" />
        <div className="relative mx-auto max-w-6xl px-6 py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-[#FFD700]/30 bg-[#FFD700]/5 px-4 py-1.5 text-xs text-[#FFD700]"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#FFD700]" />
            AI arbiter for creative royalties
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl"
          >
            Everyone played their part.
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, #FFD700, #FF8FA3, #C77DFF)",
              }}
            >
              Now split it fairly.
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="mx-auto mt-6 max-w-2xl text-base text-purple-200/70 sm:text-lg"
          >
            SplitRoyalty is the AI arbiter for creative collaborations. Tell it
            who did what, and it returns transparent, defensible ownership
            percentages — ready to settle on-chain.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <button
              onClick={scrollToDemo}
              className="w-full rounded-full bg-[#FFD700] px-8 py-3 font-bold text-[#1A0B2E] transition hover:brightness-110 sm:w-auto"
            >
              Judge a split
            </button>
            <a
              href="#how"
              className="w-full rounded-full border border-purple-400/40 px-8 py-3 font-semibold text-purple-100 transition hover:border-[#FFD700]/60 hover:text-[#FFD700] sm:w-auto"
            >
              See how it works
            </a>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 text-xs text-purple-300/50"
          >
            Royalty contract:{" "}
            <span className="text-[#FFD700]/80">{CONTRACT}</span>
          </motion.p>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-purple-500/15 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="mb-14 text-center"
          >
            <p className="mb-2 text-xs uppercase tracking-[0.3em] text-[#FFD700]/70">
              the flow
            </p>
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              From jam session to fair split
            </h2>
          </motion.div>
          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="rounded-2xl border border-purple-400/20 bg-purple-900/20 p-7"
              >
                <div className="mb-4 text-3xl font-black text-[#FFD700]">
                  {s.n}
                </div>
                <h3 className="mb-2 text-lg font-bold text-white">{s.title}</h3>
                <p className="text-sm leading-relaxed text-purple-200/70">
                  {s.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="border-t border-purple-500/15 bg-[#160826] py-24"
      >
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="mb-14 text-center"
          >
            <p className="mb-2 text-xs uppercase tracking-[0.3em] text-[#FFD700]/70">
              why creators trust it
            </p>
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              Built for shared credit
            </h2>
          </motion.div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.45, delay: (i % 3) * 0.1 }}
                className="group rounded-2xl border border-purple-400/20 bg-purple-900/15 p-6 transition hover:border-[#FFD700]/40"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#FFD700]/20 to-[#C77DFF]/20 text-xl">
                  {f.icon}
                </div>
                <h3 className="mb-2 font-bold text-white">{f.title}</h3>
                <p className="text-sm leading-relaxed text-purple-200/70">
                  {f.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo */}
      <section
        id="demo"
        ref={demoRef}
        className="border-t border-purple-500/15 py-24"
      >
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="mb-12 text-center"
          >
            <p className="mb-2 text-xs uppercase tracking-[0.3em] text-[#FFD700]/70">
              live studio
            </p>
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              Split a track in real time
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-purple-200/70">
              List your collaborators and what they brought. The AI arbiter
              returns a fair ownership split.
            </p>
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Form */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5 }}
              className="rounded-2xl border border-purple-400/25 bg-purple-900/20 p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-bold text-white">Collaborators</h3>
                <button
                  onClick={addContributor}
                  className="rounded-full border border-[#FFD700]/50 bg-[#FFD700]/10 px-3 py-1 text-xs font-semibold text-[#FFD700] transition hover:bg-[#FFD700]/20"
                >
                  + add
                </button>
              </div>

              <div className="space-y-3">
                {contributors.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-purple-400/15 bg-[#1A0B2E]/60 p-3"
                  >
                    <div className="flex gap-2">
                      <input
                        value={c.name}
                        onChange={(e) =>
                          updateContributor(c.id, { name: e.target.value })
                        }
                        placeholder="Name"
                        className="w-1/2 rounded-lg border border-purple-400/20 bg-purple-950/40 px-3 py-2 text-sm text-white placeholder:text-purple-300/40 outline-none focus:border-[#FFD700]/60"
                      />
                      <select
                        value={c.role}
                        onChange={(e) =>
                          updateContributor(c.id, {
                            role: e.target.value as Role,
                          })
                        }
                        className="w-1/2 rounded-lg border border-purple-400/20 bg-purple-950/40 px-3 py-2 text-sm text-white outline-none focus:border-[#FFD700]/60"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r} className="bg-[#1A0B2E]">
                            {r}
                          </option>
                        ))}
                      </select>
                      {contributors.length > 2 && (
                        <button
                          onClick={() => removeContributor(c.id)}
                          className="rounded-lg px-2 text-purple-300/50 transition hover:text-[#FF8FA3]"
                          aria-label="Remove collaborator"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <input
                      value={c.notes}
                      onChange={(e) =>
                        updateContributor(c.id, { notes: e.target.value })
                      }
                      placeholder="What did they contribute?"
                      className="mt-2 w-full rounded-lg border border-purple-400/20 bg-purple-950/40 px-3 py-2 text-sm text-purple-100 placeholder:text-purple-300/40 outline-none focus:border-[#FFD700]/60"
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={judge}
                disabled={judging}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#FFD700] px-5 py-3 font-bold text-[#1A0B2E] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {judging ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1A0B2E]/40 border-t-[#1A0B2E]" />
                    judging…
                  </>
                ) : (
                  "⚖️ Judge the split"
                )}
              </button>
            </motion.div>

            {/* Visualization */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="rounded-2xl border border-purple-400/25 bg-purple-900/15 p-5"
            >
              <h3 className="mb-4 font-bold text-white">Ownership split</h3>

              {!result && !judging && (
                <div className="flex h-80 flex-col items-center justify-center rounded-xl border border-dashed border-purple-400/20 text-center text-sm text-purple-300/50">
                  <span className="mb-2 text-3xl">🎤</span>
                  No split yet.
                  <br />
                  Add the credits and hit{" "}
                  <span className="text-[#FFD700]/80">judge</span>.
                </div>
              )}

              {judging && (
                <div className="flex h-80 flex-col items-center justify-center gap-3 text-sm text-purple-300/60">
                  <span className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500/40 border-t-[#FFD700]" />
                  Weighing creative impact…
                </div>
              )}

              {result && (
                <div className="space-y-5">
                  {/* Stacked share bar */}
                  <div className="flex h-5 w-full overflow-hidden rounded-full border border-purple-400/20">
                    {result.map((r, i) => (
                      <motion.div
                        key={r.name + i}
                        initial={{ width: 0 }}
                        animate={{ width: `${r.pct}%` }}
                        transition={{ duration: 0.7, delay: i * 0.1 }}
                        style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                        title={`${r.name} · ${r.pct}%`}
                      />
                    ))}
                  </div>

                  {/* Per-contributor bars */}
                  <div className="space-y-3">
                    {result.map((r, i) => (
                      <motion.div
                        key={r.name}
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.35, delay: 0.2 + i * 0.1 }}
                      >
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 font-semibold text-white">
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{
                                backgroundColor: PALETTE[i % PALETTE.length],
                              }}
                            />
                            {r.name}
                            <span className="text-xs font-normal text-purple-300/60">
                              · {r.role}
                            </span>
                          </span>
                          <span
                            className="font-bold"
                            style={{ color: PALETTE[i % PALETTE.length] }}
                          >
                            {r.pct}%
                          </span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-purple-950/60">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${r.pct}%` }}
                            transition={{ duration: 0.7, delay: 0.2 + i * 0.1 }}
                            className="h-full rounded-full"
                            style={{
                              backgroundColor: PALETTE[i % PALETTE.length],
                            }}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <button
                    onClick={() =>
                      toast.success("Split locked to royalty contract ✦")
                    }
                    className="w-full rounded-full border border-[#FFD700]/50 bg-[#FFD700]/10 px-5 py-2.5 text-sm font-bold text-[#FFD700] transition hover:bg-[#FFD700]/20"
                  >
                    Lock split on-chain
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-purple-500/15 bg-[#140622]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-purple-300/50 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#1A0B2E]"
              style={{
                background:
                  "conic-gradient(from 140deg, #FFD700, #C77DFF, #FFD700)",
              }}
            >
              ♪
            </span>
            <span className="font-extrabold text-purple-100">
              Split<span className="text-[#FFD700]">Royalty</span>
            </span>
          </div>
          <p className="text-center text-xs">
            © {new Date().getFullYear()} SplitRoyalty · AI royalty arbiter for
            creators.
          </p>
          <div className="flex gap-5 text-xs">
            <a href="#how" className="transition hover:text-[#FFD700]">
              How it works
            </a>
            <a href="#features" className="transition hover:text-[#FFD700]">
              Features
            </a>
            <a href="#demo" className="transition hover:text-[#FFD700]">
              Try it
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
