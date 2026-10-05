import React from 'react';
import { ShieldCheck, Terminal, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-neutral-800/80 bg-neutral-950 py-10 px-4 mt-12 text-xs">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Core Ending Attestation as specified in instructions */}
        <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 text-center max-w-3xl mx-auto space-y-2">
          <div className="text-neutral-300 font-mono text-xs font-semibold">
            “Designed as an independent systems-engineering demonstration for discussions around large-scale marketplace, logistics, AI, and operational reliability.”
          </div>
          <div className="text-[11px] text-neutral-500 font-sans">
            Independent concept portfolio. Not affiliated with or endorsed by Uber Technologies, Inc. No proprietary Uber internal information or production access used.
          </div>
        </div>

        {/* Creator Info & Metadata */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-neutral-800/50 text-neutral-400 font-mono text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>
              Creator: <strong className="text-white">Nuttida Goedseesuk</strong> — System Creator &amp; Designer | Independent AI Engineer / Architect
            </span>
          </div>

          <div className="flex items-center gap-4 text-neutral-500">
            <span>AEON MATRIX v2.6.0</span>
            <span>•</span>
            <span>TypeScript / React / Distributed Systems</span>
            <span>•</span>
            <span>Zero-Trust Fail-Closed</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
