import React from 'react';
import {
  Cpu,
  Layers,
  Network,
  Server,
  Lock,
  Activity,
  ArrowRightLeft,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export const WhatICanContribute: React.FC = () => {
  const contributions = [
    {
      title: 'Enterprise AI Architecture',
      subtitle: 'Design AI systems that operate within real business constraints.',
      icon: Cpu,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/30',
      points: [
        'Enforce deterministic boundaries between probabilistic model inference and core transactional services.',
        'Prevent unverified state mutations by architecting advisory-only reasoning pipelines.',
        'Design resilient fallback strategies to ensure zero operational downtime during AI provider disruptions.',
      ],
    },
    {
      title: 'Retail & Logistics Systems',
      subtitle: 'Design workflows across OMS, WMS, TMS, fulfillment, inventory, and delivery.',
      icon: Layers,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      points: [
        'Architect multi-tier fulfillment pipelines with robust inventory reservation locks and real-time SLA tracking.',
        'Deep integration experience with warehouse wave picking, pack-station verification, and carrier manifests.',
        'Design last-mile courier matching and dispatching with dynamic urban geo-fencing.',
      ],
    },
    {
      title: 'Agentic AI',
      subtitle: 'Build specialized agents for operations, analysis, optimization, governance, and incident response.',
      icon: Sparkles,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      points: [
        'Build purpose-driven operational agents (Operations Intelligence, Route Optimization, Incident Analysis, Demand Forecast).',
        'Equip agents with explicit constraint validation, bounded operational scopes, and auditable reasoning artifacts.',
        'Prevent hallucinations by anchoring agent reasoning directly to deterministic system telemetry.',
      ],
    },
    {
      title: 'Backend Engineering',
      subtitle: 'Design APIs, distributed services, event-driven systems, validation, testing, and reliability controls.',
      icon: Server,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      points: [
        'Build resilient microservices using SAGA transaction orchestration and transactional outbox CDC patterns.',
        'Design high-throughput, low-latency APIs with strict atomic idempotency (Redis SETNX) and token-bucket rate limiting.',
        'Implement truncated exponential backoff with full jitter and dead-letter queue (DLQ) automated reconciliation.',
      ],
    },
    {
      title: 'AI Governance',
      subtitle: 'Implement evidence validation, policy enforcement, human approval, immutable auditing, and fail-closed behavior.',
      icon: Lock,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/30',
      points: [
        'Architect fail-closed governance layers (AEON Guardian) preventing unverified autonomous execution.',
        'Enforce cryptographic evidence hashes (SHA-256) and non-repudiation digital signatures (Ed25519) on all human approvals.',
        'Build tamper-evident append-only audit ledgers providing end-to-end traceability for regulatory compliance.',
      ],
    },
    {
      title: 'Operational Intelligence',
      subtitle: 'Turn real-time system signals into explainable recommendations for operators.',
      icon: Activity,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      points: [
        'Convert noisy event streams into explainable, actionable intelligence for control room operators.',
        'Surface leading indicators (e.g. merchant prep dwell times, driver deficit trajectories) 15–20 minutes before SLA breaches.',
        'Build data-dense, desktop-first operational control towers optimized for rapid operator situational awareness.',
      ],
    },
    {
      title: 'Business-to-Engineering Translation',
      subtitle: 'Translate business requirements into architecture, workflows, APIs, KPIs, and measurable pilot outcomes.',
      icon: ArrowRightLeft,
      color: 'text-teal-400',
      bgColor: 'bg-teal-500/10',
      borderColor: 'border-teal-500/30',
      points: [
        'Bridge operations leadership, product management, and platform engineering teams with clear technical contracts.',
        'Map high-level business goals (e.g. reduce cancellation rate by 20%, improve fleet efficiency) into measurable P99 latency budgets and state machines.',
        'Design phased pilot roadmaps and observability metrics to validate engineering value in production.',
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="bg-neutral-900/60 p-4 rounded-xl border border-neutral-800">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-mono text-xs font-semibold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30">
            EXPERTISE & VALUE
          </span>
          <h2 className="text-xl font-bold text-white tracking-tight">What I Can Contribute</h2>
        </div>
        <p className="text-xs text-neutral-400 mt-1 max-w-3xl">
          Core engineering competencies spanning enterprise AI systems design, large-scale logistics, distributed event-driven microservices, fail-closed governance, and strategic business-to-engineering translation.
        </p>
      </div>

      {/* 7 Core Capabilities Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contributions.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className={`p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 transition flex flex-col justify-between ${
                idx === 6 ? 'md:col-span-2 lg:col-span-3' : ''
              }`}
            >
              <div>
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${item.bgColor} border ${item.borderColor}`}>
                    <Icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-mono">{item.title}</h3>
                    <div className="text-[11px] text-neutral-400 font-sans">{item.subtitle}</div>
                  </div>
                </div>

                <ul className="mt-3.5 space-y-2 text-xs text-neutral-300 font-sans">
                  {item.points.map((pt, pIdx) => (
                    <li key={pIdx} className="flex items-start gap-2">
                      <span className={`${item.color} font-mono font-bold mt-0.5`}>•</span>
                      <span className="leading-relaxed">{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-[10px] font-mono text-neutral-500">
                <span>Production-Proven Invariants</span>
                <span className="text-neutral-400">Ready for Enterprise Scale</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
