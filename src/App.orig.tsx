// Durable workspace wrapper: mounts the shipped application 1:1 via the
// persistent shim, then appends the local Ω-Ξ laboratory beneath it.
// No package component is modified; nothing above the lab is altered.
import { useState } from 'react';
import Workbench from './components/Workbench';
import OmegaLab from './components/OmegaLab';

export default function App() {
  const [showLab, setShowLab] = useState(false);
  return (
    <>
      <Workbench />
      <div className="mx-auto w-full max-w-6xl px-4 pb-4 sm:px-6 lg:px-8">
        <button
          onClick={() => setShowLab((v) => !v)}
          className="w-full rounded-xl border border-slate-800 bg-slate-900/40 py-2 text-xs font-medium text-slate-500 transition hover:border-slate-700 hover:text-slate-300"
        >
          {showLab ? '▾ Hide' : '▸ Show'} Ω-Ξ Research Laboratory (self-tests · codec audit · hand-trace · 120k benchmark)
        </button>
      </div>
      {showLab && <OmegaLab />}
    </>
  );
}
