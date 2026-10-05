import React, { useState } from 'react';
import {
  HelpCircle,
  Radio,
  Database,
  Cpu,
  FileCheck,
  Sparkles,
  Lock,
  UserCheck,
  Server,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

export const UberProblemExploration: React.FC = () => {
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<number>(0);

  const workflowSteps = [
    {
      id: 'step_1',
      title: '1. Marketplace Events',
      icon: Radio,
      category: 'Ingestion Layer',
      latency: '&lt;5ms stream',
      description: 'Couriers online, trip acceptances, cancellations, merchant order backlogs, driver dwell times streamed via Kafka.',
      invariants: 'Immutable domain events, zero data loss guarantee (acks=all).',
    },
    {
      id: 'step_2',
      title: '2. Operational Data',
      icon: Database,
      category: 'Aggregation Layer',
      latency: '&lt;50ms sliding window',
      description: 'Partition-level feature calculation: rolling SLA trend lines, localized weather/traffic factors, supply-demand divergence.',
      invariants: 'Spatial partitioning using Uber H3 hexagonal indexing.',
    },
    {
      id: 'step_3',
      title: '3. AI Analysis',
      icon: Cpu,
      category: 'Inference Layer',
      latency: '&lt;250ms asynchronous',
      description: 'Graph neural networks & anomaly detectors flag early-stage bottlenecks (e.g. merchant prep stalls in Zone X) 15–20 minutes before SLA breaches.',
      invariants: 'Asynchronously decoupled from synchronous order write paths.',
    },
    {
      id: 'step_4',
      title: '4. Evidence',
      icon: FileCheck,
      category: 'Attestation Layer',
      latency: 'Deterministic hash',
      description: 'Deterministic proof bundle generated: historical baseline delta, unserviced order queue velocity, courier density, cryptographic SHA-256 hash.',
      invariants: 'NO EVIDENCE → NO DECISION invariant enforced.',
    },
    {
      id: 'step_5',
      title: '5. Recommendation',
      icon: Sparkles,
      category: 'Advisory Layer',
      latency: 'Advisory manifest',
      description: 'Scoped operational suggestion formulated: "Suggest shifting courier incentives toward Zone X; adjust merchant prep window by +6 minutes."',
      invariants: 'Execution locked. Advisory-only. Cannot mutate dispatch state.',
    },
    {
      id: 'step_6',
      title: '6. Governance',
      icon: Lock,
      category: 'AEON Guardian',
      latency: 'Instant intercept',
      description: 'Guardian evaluates safety policy limits, verifies cryptographic evidence hash, checks boundary constraints, and ensures fail-closed readiness.',
      invariants: 'FAIL-CLOSED: Defaults to blocking on any ambiguity.',
    },
    {
      id: 'step_7',
      title: '7. Human Decision',
      icon: UserCheck,
      category: 'HITL Review',
      latency: 'Human operator SLA',
      description: 'Marketplace Operations Lead reviews curated evidence on the Control Tower and approves, rejects, or modifies the recommendation.',
      invariants: 'HUMAN-IN-THE-LOOP invariant for all consequential actions.',
    },
    {
      id: 'step_8',
      title: '8. Operational System',
      icon: Server,
      category: 'Dispatch Execution',
      latency: '&lt;15ms commit',
      description: 'Dispatch API applies approved modifications with signed token; outcome recorded in immutable audit ledger with Ed25519 signature.',
      invariants: 'IMMUTABLE AUDIT record appended to tamper-evident ledger.',
    },
  ];

  const currentStep = workflowSteps[activeWorkflowStep];

  return (
    <div className="space-y-6">
      {/* Section Header with Core Exploration Question */}
      <div className="bg-neutral-900/60 p-5 rounded-xl border border-neutral-800 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-mono text-xs font-semibold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30">
            SYSTEM DESIGN PROPOSAL
          </span>
          <span className="text-xs font-mono text-neutral-400">Targeting Large-Scale Mobility & Delivery</span>
        </div>

        <div className="border-l-4 border-cyan-500 pl-4 py-1">
          <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider font-bold">
            Example Problem I Would Explore at Uber
          </div>
          <h2 className="text-lg md:text-xl font-bold text-white tracking-tight mt-1">
            “How can an AI operations layer help Uber-like delivery networks identify operational constraints earlier while preserving human control over consequential marketplace decisions?”
          </h2>
        </div>

        <p className="text-xs text-neutral-400 leading-relaxed max-w-4xl">
          At massive scale, threshold-based alerts trigger only after delivery SLAs have already degraded. Conversely, fully autonomous algorithmic interventions risk unintended consequences across merchant relationships, driver earnings, and customer trust. The AEON MATRIX conceptual framework resolves this tension through early signal detection, deterministic evidence bundles, and fail-closed human governance.
        </p>
      </div>

      {/* 8-Step Interactive Conceptual Workflow */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
              8-Stage End-to-End Conceptual Workflow (Click steps to trace)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveWorkflowStep((prev) => (prev > 0 ? prev - 1 : 7))}
              className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-xs font-mono cursor-pointer"
            >
              ← Prev
            </button>
            <button
              onClick={() => setActiveWorkflowStep((prev) => (prev < 7 ? prev + 1 : 0))}
              className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-mono font-bold cursor-pointer"
            >
              Next Step →
            </button>
          </div>
        </div>

        {/* Workflow Horizontal Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
          {workflowSteps.map((step, idx) => {
            const Icon = step.icon;
            const isActive = activeWorkflowStep === idx;
            return (
              <button
                key={step.id}
                onClick={() => setActiveWorkflowStep(idx)}
                className={`p-2.5 rounded-lg border text-left font-mono transition cursor-pointer flex flex-col justify-between ${
                  isActive
                    ? 'bg-cyan-950/50 border-cyan-400 ring-2 ring-cyan-500/30 text-white shadow-lg'
                    : 'bg-neutral-950/80 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-neutral-500'}`} />
                    <span className="text-[9px] text-neutral-500">0{idx + 1}</span>
                  </div>
                  <div className={`text-[11px] font-bold mt-1.5 line-clamp-1 ${isActive ? 'text-cyan-300' : ''}`}>
                    {step.title.split('. ')[1]}
                  </div>
                </div>
                <div className="text-[9px] text-neutral-500 mt-2 truncate">{step.category}</div>
              </button>
            );
          })}
        </div>

        {/* Active Step Deep-Dive Card */}
        <div className="mt-4 p-4 bg-neutral-950 rounded-xl border border-neutral-800/80 flex flex-col md:flex-row items-start justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 font-mono text-xs font-bold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30">
                ACTIVE STAGE 0{activeWorkflowStep + 1}
              </span>
              <h4 className="text-sm font-bold text-white font-mono">{currentStep.title}</h4>
            </div>
            <p className="text-xs text-neutral-300 font-sans leading-relaxed">
              {currentStep.description}
            </p>
            <div className="pt-2 flex items-center gap-2 text-[11px] font-mono text-neutral-400">
              <span className="text-emerald-400 font-bold">Invariant:</span>
              <span>{currentStep.invariants}</span>
            </div>
          </div>

          <div className="bg-neutral-900 p-3 rounded-lg border border-neutral-800 text-xs font-mono text-right shrink-0 min-w-[180px]">
            <div className="text-neutral-500 text-[10px]">LATENCY BUDGET</div>
            <div className="text-cyan-400 font-bold mt-0.5">{currentStep.latency}</div>
            <div className="text-neutral-500 text-[10px] mt-2">LAYER CLASSIFICATION</div>
            <div className="text-neutral-200 mt-0.5">{currentStep.category}</div>
          </div>
        </div>
      </div>

      {/* 4 Architectural Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Early Bottleneck Detection */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold">
            <TrendingUp className="w-4 h-4" />
            <span>1. Early Bottleneck Detection (Leading vs Lagging)</span>
          </div>
          <p className="text-xs text-neutral-300 font-sans mt-2 leading-relaxed">
            Traditional threshold-based alerts trigger after delivery times have already deteriorated. Machine learning models evaluating high-frequency event streams (such as merchant prep dwell increases and courier rejection spikes) identify leading indicators 15–20 minutes before customer SLA breaches occur.
          </p>
        </div>

        {/* 2. Deterministic Evidence Bundling */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold">
            <FileCheck className="w-4 h-4" />
            <span>2. Deterministic Evidence Bundling</span>
          </div>
          <p className="text-xs text-neutral-300 font-sans mt-2 leading-relaxed">
            Rather than producing opaque recommendations, the agent compiles a cryptographically signed evidence bundle containing active queue rates, baseline comparison deltas, courier density ratios, and confidence intervals. Every recommendation is deterministically verifiable.
          </p>
        </div>

        {/* 3. Preserving Human Authority */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold">
            <UserCheck className="w-4 h-4" />
            <span>3. Preserving Human Control Over Consequential Actions</span>
          </div>
          <p className="text-xs text-neutral-300 font-sans mt-2 leading-relaxed">
            High-impact marketplace interventions—such as adjusting dynamic fees, altering dispatch radiuses, or throttling merchant ingestion—remain gated behind human operator confirmation. Operators review clear diagnostic dashboards rather than sifting through raw system logs.
          </p>
        </div>

        {/* 4. Continuous Feedback Loops */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-purple-400 font-mono text-xs font-bold">
            <RotateCcw className="w-4 h-4" />
            <span>4. Continuous Feedback & Closed-Loop Auditing</span>
          </div>
          <p className="text-xs text-neutral-300 font-sans mt-2 leading-relaxed">
            Operator decisions (approve, modify scope, or reject) are logged back into the training and analytics pipelines alongside the resulting marketplace outcome. This enables continuous measurement of advisory precision, operator agreement rates, and intervention effectiveness.
          </p>
        </div>
      </div>
    </div>
  );
};
