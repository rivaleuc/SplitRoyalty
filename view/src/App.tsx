import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster, toast } from "sonner";
import { connectWallet, isWalletConnected } from "./genlayer";

const CONTRACT = "0x2CFfF7dDEcc90C2b72e5BD19B1003Ef688cCb7C7";

type Role =
  | "Songwriter"
  | "Producer"
  | "Vocalist"
  | "Instrumentalist"
  | "Mixing Engineer";

interface Channel {
  id: number;
  name: string;
  role: Role;
  gain: number; // user "tracking level" 0-100, a hint to the AI
  pct: number | null; // resolved split after judging
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

const STRIP_COLORS = [
  "#FFD700",
  "#C77DFF",
  "#5EE6C5",
  "#FF8FA3",
  "#FFA94D",
  "#7BC8FF",
];

let _id = 100;
const newId = () => ++_id;

const DEFAULT_CHANNELS: Channel[] = [
  { id: 1, name: "Mara V.", role: "Songwriter", gain: 70, pct: null },
  { id: 2, name: "DJ Kovac", role: "Producer", gain: 65, pct: null },
  { id: 3, name: "Lena S.", role: "Vocalist", gain: 60, pct: null },
];

function computeSplit(channels: Channel[]): number[] {
  const weights = channels.map((c) => {
    const base = ROLE_WEIGHT[c.role] ?? 12;
    return base * (0.6 + c.gain / 100); // gain nudges the verdict
  });
  const total = weights.reduce((s, w) => s + w, 0) || 1;
  const rounded = weights.map((w) => Math.round((w / total) * 100));
  const drift = 100 - rounded.reduce((s, x) => s + x, 0);
  if (rounded.length) {
    const maxIdx = rounded.reduce((mi, x, i, a) => (x > a[mi] ? i : mi), 0);
    rounded[maxIdx] += drift;
  }
  return rounded;
}

/* ----- A single mixer channel strip ----- */
function ChannelStrip({
  channel,
  color,
  judged,
  canRemove,
  onChange,
  onRemove,
}: {
  channel: Channel;
  color: string;
  judged: boolean;
  canRemove: boolean;
  onChange: (patch: Partial<Channel>) => void;
  onRemove: () => void;
}) {
  // fader sits on the user gain OR the resolved pct (scaled) after judging
  const faderValue =
    judged && channel.pct !== null ? Math.min(channel.pct * 2.2, 100) : channel.gain;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className="flex w-[112px] shrink-0 flex-col items-center rounded-lg border border-[#FFD700]/15 bg-gradient-to-b from-[#2A1547] to-[#1c0d33] p-3 shadow-[0_8px_30px_rgba(0,0,0,0.45)]"
    >
      {/* channel header */}
      <div className="mb-2 flex w-full items-center justify-between">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
        />
        {canRemove && (
          <button
            onClick={onRemove}
            className="text-purple-300/40 transition hover:text-[#FF8FA3]"
            aria-label="Remove channel"
          >
            ✕
          </button>
        )}
      </div>

      {/* role select */}
      <select
        value={channel.role}
        onChange={(e) => onChange({ role: e.target.value as Role })}
        className="mb-3 w-full rounded bg-[#120722] px-1.5 py-1 text-[10px] uppercase tracking-wide text-purple-200 outline-none focus:ring-1 focus:ring-[#FFD700]/50"
      >
        {ROLES.map((r) => (
          <option key={r} value={r} className="bg-[#1A0B2E]">
            {r}
          </option>
        ))}
      </select>

      {/* the % readout (lights up after judging) */}
      <div
        className="mb-3 flex h-9 w-full items-center justify-center rounded font-mono text-base font-bold"
        style={{
          color: judged ? "#1A0B2E" : color,
          backgroundColor: judged ? color : "#120722",
          textShadow: judged ? "none" : `0 0 10px ${color}`,
        }}
      >
        {judged && channel.pct !== null ? `${channel.pct}%` : "––"}
      </div>

      {/* vertical fader */}
      <div className="relative my-2 flex h-44 w-full items-center justify-center">
        {/* track */}
        <div className="absolute h-full w-1.5 rounded-full bg-[#0e0519]" />
        {/* tick marks */}
        <div className="absolute flex h-full flex-col justify-between py-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <span key={i} className="h-px w-3 bg-[#FFD700]/15" />
          ))}
        </div>
        {/* filled level */}
        <motion.div
          className="absolute bottom-0 w-1.5 rounded-full"
          style={{ backgroundColor: color }}
          initial={false}
          animate={{ height: `${faderValue}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
        />
        {/* the fader cap (range input, rotated) */}
        <input
          type="range"
          min={0}
          max={100}
          value={channel.gain}
          disabled={judged}
          onChange={(e) => onChange({ gain: Number(e.target.value) })}
          className="absolute h-44 w-44 -rotate-90 cursor-pointer appearance-none bg-transparent accent-[#FFD700] disabled:cursor-not-allowed"
          aria-label={`${channel.name} fader`}
        />
        {/* fader knob marker */}
        <motion.div
          className="pointer-events-none absolute left-1/2 h-3 w-9 -translate-x-1/2 rounded-sm border border-black/40 bg-gradient-to-b from-[#f5f0ff] to-[#b9a7d6] shadow-md"
          initial={false}
          animate={{ bottom: `calc(${faderValue}% - 6px)` }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
        />
      </div>

      {/* name input */}
      <input
        value={channel.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="Channel"
        className="mt-2 w-full rounded bg-[#120722] px-2 py-1 text-center text-xs font-semibold text-white outline-none placeholder:text-purple-300/30 focus:ring-1 focus:ring-[#FFD700]/50"
      />
    </motion.div>
  );
}

function App() {
  const [channels, setChannels] = useState<Channel[]>(DEFAULT_CHANNELS);
  const [judged, setJudged] = useState(false);
  const [judging, setJudging] = useState(false);
  const [wallet, setWallet] = useState<string | null>(null);

  async function handleConnect() {
    try {
      const addr = await connectWallet();
      setWallet(addr);
      toast.success("Wallet connected", { description: `${addr.slice(0, 6)}…${addr.slice(-4)}` });
    } catch (e: any) {
      toast.error("Wallet connection failed", { description: e?.message ?? String(e) });
    }
  }

  const update = (id: number, patch: Partial<Channel>) => {
    setChannels((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    if (judged) setJudged(false);
  };

  const addChannel = () => {
    if (channels.length >= 6) {
      toast.error("Console is full — 6 channels max.");
      return;
    }
    setChannels((cs) => [
      ...cs,
      { id: newId(), name: "", role: "Instrumentalist", gain: 50, pct: null },
    ]);
    setJudged(false);
  };

  const removeChannel = (id: number) => {
    setChannels((cs) => cs.filter((c) => c.id !== id));
    setJudged(false);
  };

  const judge = () => {
    const named = channels.filter((c) => c.name.trim());
    if (named.length < 2) {
      toast.error("Name at least two channels before bouncing the mix.");
      return;
    }
    setJudging(true);
    setJudged(false);
    toast.loading("AI is riding the faders…", { id: "mix" });
    setTimeout(() => {
      const pcts = computeSplit(channels);
      setChannels((cs) =>
        cs.map((c, i) => ({ ...c, pct: c.name.trim() ? pcts[i] : 0 }))
      );
      setJudging(false);
      setJudged(true);
      toast.success("Mix bounced — split is locked to the faders 🎚", {
        id: "mix",
      });
    }, 2600);
  };

  const master = judged
    ? channels
        .filter((c) => c.name.trim())
        .map((c, i) => ({
          name: c.name,
          pct: c.pct ?? 0,
          color: STRIP_COLORS[channels.indexOf(c) % STRIP_COLORS.length],
          i,
        }))
        .sort((a, b) => b.pct - a.pct)
    : [];

  return (
    <div className="min-h-screen bg-[#1A0B2E] font-sans text-purple-100">
      <Toaster theme="dark" position="top-center" richColors />

      {/* Console top rail */}
      <header className="border-b border-[#FFD700]/20 bg-[#120722]/80 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#FFD700] font-black text-[#1A0B2E]">
              ♪
            </span>
            <div>
              <h1 className="text-lg font-extrabold leading-none tracking-tight text-white">
                Split<span className="text-[#FFD700]">Royalty</span>
              </h1>
              <p className="font-mono text-[10px] text-purple-300/50">
                ROYALTY CONSOLE · v2
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] text-purple-300/50">
            <button
              onClick={handleConnect}
              className={`rounded-full px-3 py-1.5 text-[10px] font-bold transition ${
                (wallet ?? isWalletConnected())
                  ? "border border-[#5EE6C5]/40 bg-[#5EE6C5]/10 text-[#5EE6C5]"
                  : "bg-[#FFD700] text-[#1A0B2E] hover:brightness-110"
              }`}
            >
              {wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : "Connect Wallet"}
            </button>
            <span
              className={`h-2 w-2 rounded-full ${
                judging ? "animate-pulse bg-[#FFD700]" : "bg-[#5EE6C5]"
              }`}
            />
            {judging ? "BOUNCING" : judged ? "MIX LOCKED" : "READY"}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Console chassis */}
        <section className="rounded-2xl border border-[#FFD700]/15 bg-[#160826] p-5 shadow-[inset_0_2px_30px_rgba(0,0,0,0.5)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-[0.25em] text-[#FFD700]">
                Channel Rack
              </h2>
              <p className="text-xs text-purple-300/50">
                Each contributor is a channel strip. Set a tracking level, then
                let the AI ride the faders to a fair split.
              </p>
            </div>
            <button
              onClick={addChannel}
              className="rounded-full border border-[#FFD700]/40 bg-[#FFD700]/10 px-4 py-1.5 text-xs font-bold text-[#FFD700] transition hover:bg-[#FFD700]/20"
            >
              + add channel
            </button>
          </div>

          {/* strips */}
          <div className="flex gap-3 overflow-x-auto pb-3">
            <AnimatePresence mode="popLayout">
              {channels.map((c) => (
                <ChannelStrip
                  key={c.id}
                  channel={c}
                  color={STRIP_COLORS[channels.indexOf(c) % STRIP_COLORS.length]}
                  judged={judged}
                  canRemove={channels.length > 2}
                  onChange={(patch) => update(c.id, patch)}
                  onRemove={() => removeChannel(c.id)}
                />
              ))}
            </AnimatePresence>

            {/* Master strip */}
            <div className="flex w-[150px] shrink-0 flex-col rounded-lg border border-[#FFD700]/30 bg-gradient-to-b from-[#3a1d5e] to-[#1c0d33] p-3">
              <span className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-[#FFD700]">
                Master
              </span>
              <button
                onClick={judge}
                disabled={judging}
                className="mb-3 flex items-center justify-center gap-1.5 rounded bg-[#FFD700] px-2 py-2 text-xs font-extrabold text-[#1A0B2E] transition hover:brightness-110 disabled:opacity-60"
              >
                {judging ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#1A0B2E]/40 border-t-[#1A0B2E]" />
                ) : (
                  "⚖ BOUNCE"
                )}
              </button>

              {/* master split breakdown bar (vertical) */}
              <div className="relative flex flex-1 items-end justify-center overflow-hidden rounded bg-[#0e0519] p-1">
                {judged ? (
                  <div className="flex h-full w-full flex-col overflow-hidden rounded">
                    {master.map((m) => (
                      <motion.div
                        key={m.name + m.i}
                        initial={{ height: 0 }}
                        animate={{ height: `${m.pct}%` }}
                        transition={{ duration: 0.7, delay: m.i * 0.08 }}
                        className="flex items-center justify-center text-[9px] font-bold text-[#1A0B2E]"
                        style={{ backgroundColor: m.color }}
                        title={`${m.name} · ${m.pct}%`}
                      >
                        {m.pct >= 12 ? `${m.pct}%` : ""}
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <span className="pb-6 text-center font-mono text-[9px] text-purple-300/40">
                    awaiting
                    <br />
                    bounce
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Split readout / legend */}
        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-purple-400/15 bg-[#160826] p-5">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-[#FFD700]">
              Split Sheet
            </h3>
            {judged ? (
              <ul className="space-y-2">
                {master.map((m) => (
                  <motion.li
                    key={m.name + m.i}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + m.i * 0.08 }}
                    className="flex items-center justify-between border-b border-purple-400/10 pb-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: m.color }}
                      />
                      <span className="font-semibold text-white">{m.name}</span>
                    </span>
                    <span
                      className="font-mono font-bold"
                      style={{ color: m.color }}
                    >
                      {m.pct}%
                    </span>
                  </motion.li>
                ))}
              </ul>
            ) : (
              <p className="py-8 text-center text-sm text-purple-300/40">
                Bounce the mix to print the split sheet.
              </p>
            )}
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-purple-400/15 bg-[#160826] p-5">
            <div>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-[#FFD700]">
                On-chain settlement
              </h3>
              <p className="text-xs leading-relaxed text-purple-300/60">
                When the mix is locked, push the fader levels straight to the
                royalty contract. Payouts then flow automatically to every
                channel.
              </p>
            </div>
            <div className="mt-4">
              <p className="mb-2 font-mono text-[10px] text-purple-300/40">
                contract&nbsp;
                <span className="text-[#FFD700]/70">{CONTRACT}</span>
              </p>
              <button
                onClick={() =>
                  judged
                    ? toast.success("Split levels written to the contract ✦")
                    : toast.error("Bounce the mix first.")
                }
                className="w-full rounded-full bg-[#FFD700] px-5 py-2.5 text-sm font-bold text-[#1A0B2E] transition hover:brightness-110"
              >
                Lock split on-chain
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
