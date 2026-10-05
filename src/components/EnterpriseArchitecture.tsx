import React, { useState } from 'react';
import {
  Server,
  Layers,
  Cpu,
  Lock,
  Database,
  Globe,
  Radio,
  ArrowDown,
  Shield,
  Zap,
  Activity,
  CheckCircle,
  FileText,
  AlertOctagon,
  RefreshCw,
} from 'lucide-react';
import { ArchitectureComponent } from '../types';
import { ARCHITECTURE_COMPONENTS } from '../data/mockData';

export const EnterpriseArchitecture: React.FC = () => {
  const [selectedCompId, setSelectedCompId] = useState<string>('arch_aeon_guardian');

  const selectedComponent =
    ARCHITECTURE_COMPONENTS.find((c) => c.id === selectedCompId) || ARCHITECTURE_COMPONENTS[0];

  const architecturePrinciples = [
    {
      title: 'Distributed Systems',
      desc: 'Microservices partitioned by bounded context with independent scaling, multi-AZ high availability, and database-per-service isolation.',
      badge: 'High Concurrency',
    },
    {
      title: 'Event-Driven Architecture',
      desc: 'Asynchronous event streaming over Apache Kafka using Avro/Protobuf contracts. Services react to immutable facts, decoupling read/write paths.',
      badge: 'Kafka Backbone',
    },
    {
      title: 'Idempotency Guarantees',
      desc: 'All state mutation endpoints enforce atomic Redis SETNX idempotency locks with payload hashing, ensuring zero duplicate operations on retries.',
      badge: 'Zero Side-Effects',
    },
    {
      title: 'Observability & Tracing',
      desc: 'End-to-end OpenTelemetry distributed tracing across API gateways, service invocations, Kafka topics, and AI reasoning spans.',
      badge: 'Distributed Tracing',
    },
    {
      title: 'Fault Isolation & Bulkheading',
      desc: 'AI inference pipelines run asynchronously outside the synchronous critical order-dispatch loop. AI downtime has zero effect on order delivery.',
      badge: 'Non-Blocking AI',
    },
    {
      title: 'Retry & Dead-Letter Queue (DLQ)',
      desc: 'Truncated exponential backoff with full jitter for transient faults, followed by dead-letter queue diversion with full telemetry context.',
      badge: 'Graceful Degradation',
    },
    {
      title: 'Zero-Trust Authorization',
      desc: 'Strict mutual TLS (mTLS) with short-lived SPIFFE/SPIRE identity certificates and continuous hardware-token attestation for operator actions.',
      badge: 'mTLS & SPIFFE',
    },
    {
      title: 'Evidence-Based AI Decisions',
      desc: 'Probabilistic AI models are restricted from generating ungrounded actions. Every proposal must include deterministic telemetry proof.',
      badge: 'Cryptographic Proof',
    },
    {
      title: 'Human Approval for Consequential Actions',
      desc: 'High-impact interventions (dynamic zone throttling, courier redistribution) require explicit human operator confirmation.',
      badge: 'Human-in-the-Loop',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="bg-neutral-900/60 p-4 rounded-xl border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-mono text-xs font-semibold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30">
              CAPABILITY 05
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">Enterprise Distributed Architecture</h2>
          </div>
          <p className="text-xs text-neutral-400 mt-1 max-w-3xl">
            High-throughput, event-driven topology uniting the Operations Control Tower, API Gateway, core microservices, Kafka event mesh, agentic AI pool, AEON Guardian governance, and persistence layers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded bg-neutral-800 text-neutral-300 font-mono text-xs border border-neutral-700">
            Interactive Topology (Click any component)
          </span>
        </div>
      </div>

      {/* Main Architecture Diagram & Component Inspector Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Layered Diagram (7 Cols) */}
        <div className="lg:col-span-7 bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
              Control Plane & Service Topology
            </h3>
            <span className="text-[10px] font-mono text-cyan-400">Click any block to inspect spec</span>
          </div>

          {/* Layer 1: Operational Control Plane */}
          <div>
            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1">
              [LAYER 1] Operational Control Plane (Frontend)
            </div>
            <button
              onClick={() => setSelectedCompId('arch_control_tower')}
              className={`w-full p-2.5 rounded-lg border text-left font-mono transition cursor-pointer ${
                selectedCompId === 'arch_control_tower'
                  ? 'bg-cyan-950/40 border-cyan-400 ring-2 ring-cyan-500/30 text-white'
                  : 'bg-neutral-950/80 border-neutral-800 text-neutral-300 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Operations Control Tower (React / WebGL / TypeScript)
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">P99 &lt;100ms</span>
              </div>
              <div className="text-[11px] text-neutral-400 font-sans mt-0.5">
                Real-time sub-second telemetry dashboards, anomaly heatmaps, and AEON Guardian approval controls.
              </div>
            </button>
          </div>

          {/* Connector arrow */}
          <div className="flex justify-center -my-1 text-neutral-600">
            <ArrowDown className="w-4 h-4" />
          </div>

          {/* Layer 2: API Gateway */}
          <div>
            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1">
              [LAYER 2] Edge Perimeter & API Gateway
            </div>
            <button
              onClick={() => setSelectedCompId('arch_api_gateway')}
              className={`w-full p-2.5 rounded-lg border text-left font-mono transition cursor-pointer ${
                selectedCompId === 'arch_api_gateway'
                  ? 'bg-cyan-950/40 border-cyan-400 ring-2 ring-cyan-500/30 text-white'
                  : 'bg-neutral-950/80 border-neutral-800 text-neutral-300 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  Envoy / Kong Distributed API Gateway
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">mTLS + Redis SETNX</span>
              </div>
              <div className="text-[11px] text-neutral-400 font-sans mt-0.5">
                Rate limiting, zero-trust token verification, and atomic idempotency deduplication.
              </div>
            </button>
          </div>

          {/* Connector arrow */}
          <div className="flex justify-center -my-1 text-neutral-600">
            <ArrowDown className="w-4 h-4" />
          </div>

          {/* Layer 3: Core Domain Services */}
          <div>
            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1">
              [LAYER 3] Core Domain Microservices
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { id: 'arch_order_service', name: 'Order Service', sub: 'FSM & Outbox' },
                { id: 'arch_marketplace_service', name: 'Marketplace Svc', sub: 'Partition Grid' },
                { id: 'arch_dispatch_service', name: 'Dispatch Svc', sub: 'Bipartite Match' },
                { id: 'arch_routing_service', name: 'Routing Svc', sub: 'PDPTW Solver' },
              ].map((svc) => (
                <button
                  key={svc.id}
                  onClick={() => setSelectedCompId(svc.id)}
                  className={`p-2 rounded border text-left font-mono transition cursor-pointer ${
                    selectedCompId === svc.id
                      ? 'bg-cyan-950/40 border-cyan-400 text-white'
                      : 'bg-neutral-950/80 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  <div className="text-xs font-bold truncate">{svc.name}</div>
                  <div className="text-[10px] text-neutral-500 truncate">{svc.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Layer 4: Event Mesh & AI Layer Split */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {/* Kafka Mesh */}
            <button
              onClick={() => setSelectedCompId('arch_kafka')}
              className={`p-2.5 rounded-lg border text-left font-mono transition cursor-pointer ${
                selectedCompId === 'arch_kafka'
                  ? 'bg-cyan-950/40 border-cyan-400 ring-2 ring-cyan-500/30 text-white'
                  : 'bg-neutral-950/80 border-neutral-800 text-neutral-300 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <Radio className="w-3.5 h-3.5" />
                <span>Apache Kafka Event Mesh</span>
              </div>
              <div className="text-[11px] text-neutral-400 font-sans mt-1">
                Topics: orders.events, fleet.telemetry, DLQ
              </div>
            </button>

            {/* AI Agent Pool */}
            <button
              onClick={() => setSelectedCompId('arch_ai_agents')}
              className={`p-2.5 rounded-lg border text-left font-mono transition cursor-pointer ${
                selectedCompId === 'arch_ai_agents'
                  ? 'bg-cyan-950/40 border-cyan-400 ring-2 ring-cyan-500/30 text-white'
                  : 'bg-neutral-950/80 border-neutral-800 text-neutral-300 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
                <Cpu className="w-3.5 h-3.5" />
                <span>AI Operations Agent Pool</span>
              </div>
              <div className="text-[11px] text-neutral-400 font-sans mt-1">
                Advisory reasoning, bulkheaded from writes
              </div>
            </button>
          </div>

          {/* Layer 5: AEON Guardian Governance Plane */}
          <div className="pt-1">
            <button
              onClick={() => setSelectedCompId('arch_aeon_guardian')}
              className={`w-full p-2.5 rounded-lg border text-left font-mono transition cursor-pointer ${
                selectedCompId === 'arch_aeon_guardian'
                  ? 'bg-cyan-950/40 border-cyan-400 ring-2 ring-cyan-500/30 text-white'
                  : 'bg-neutral-950/80 border-neutral-800 text-neutral-300 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-2 text-rose-400">
                  <Lock className="w-4 h-4" />
                  AEON Guardian (Fail-Closed Governance Interceptor)
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30">
                  FAIL-CLOSED INVARIANT
                </span>
              </div>
              <div className="text-[11px] text-neutral-400 font-sans mt-0.5">
                Evidence verification, policy constraints evaluation, and mandatory human sign-off gatekeeper.
              </div>
            </button>
          </div>

          {/* Layer 6: Data & Persistence */}
          <div className="pt-1">
            <button
              onClick={() => setSelectedCompId('arch_persistence')}
              className={`w-full p-2.5 rounded-lg border text-left font-mono transition cursor-pointer ${
                selectedCompId === 'arch_persistence'
                  ? 'bg-cyan-950/40 border-cyan-400 ring-2 ring-cyan-500/30 text-white'
                  : 'bg-neutral-950/80 border-neutral-800 text-neutral-300 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-2 text-emerald-400">
                  <Database className="w-4 h-4" />
                  PostgreSQL OLTP, Outbox Tables & Immutable Audit Ledger
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">ACID + WAL</span>
              </div>
              <div className="text-[11px] text-neutral-400 font-sans mt-0.5">
                State machine store, transaction outbox, and cryptographically verified append-only ledger.
              </div>
            </button>
          </div>
        </div>

        {/* Right: Component Technical Inspector (5 Cols) */}
        <div className="lg:col-span-5 bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  Component Technical Specification
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                {selectedComponent.layer}
              </span>
            </div>

            {/* Component Title & Type */}
            <div className="mt-3">
              <h4 className="text-base font-bold text-white font-mono">{selectedComponent.name}</h4>
              <div className="text-xs text-neutral-400 font-mono mt-0.5">{selectedComponent.type}</div>
            </div>

            {/* Description */}
            <div className="mt-3 p-3 bg-neutral-950 rounded-lg border border-neutral-800 text-xs text-neutral-300 leading-relaxed font-sans">
              {selectedComponent.description}
            </div>

            {/* Specs Grid */}
            <div className="mt-3 space-y-2 text-xs font-mono">
              <div className="p-2.5 bg-neutral-950 rounded border border-neutral-800">
                <div className="text-[10px] text-neutral-500 uppercase">SLA & Latency Target</div>
                <div className="text-cyan-400 font-semibold mt-0.5">{selectedComponent.slaTarget}</div>
              </div>

              <div className="p-2.5 bg-neutral-950 rounded border border-neutral-800">
                <div className="text-[10px] text-neutral-500 uppercase">Protocols & Transport</div>
                <div className="text-neutral-200 mt-0.5">{selectedComponent.protocols.join(' • ')}</div>
              </div>

              <div className="p-2.5 bg-neutral-950 rounded border border-neutral-800">
                <div className="text-[10px] text-neutral-500 uppercase">Data Contract / Schema</div>
                <div className="text-neutral-300 mt-0.5">{selectedComponent.dataContracts}</div>
              </div>

              <div className="p-2.5 bg-neutral-950 rounded border border-neutral-800">
                <div className="text-[10px] text-neutral-500 uppercase">Resilience Mechanisms</div>
                <ul className="mt-1 space-y-0.5 text-neutral-300 text-[11px]">
                  {selectedComponent.resilienceMechanisms.map((r, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <span className="text-cyan-400">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-2.5 bg-rose-950/30 rounded border border-rose-900/40">
                <div className="text-[10px] text-rose-400 uppercase font-bold flex items-center gap-1">
                  <AlertOctagon className="w-3 h-3" />
                  <span>Failure Mode & Isolation Guarantee</span>
                </div>
                <div className="text-neutral-300 font-sans text-[11px] mt-1 leading-relaxed">
                  {selectedComponent.failureMode}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-800 text-[10px] font-mono text-neutral-500 flex justify-between">
            <span>Security: Zero-Trust mTLS Enforced</span>
            <span>Auditable SPIFFE Identity</span>
          </div>
        </div>
      </div>

      {/* Architecture Principles Grid */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
              Core Architectural & Reliability Principles
            </h3>
          </div>
          <span className="text-[11px] font-mono text-neutral-400">Production-Grade Invariants</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {architecturePrinciples.map((p, idx) => (
            <div
              key={idx}
              className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 hover:border-neutral-700 transition"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white font-mono">{p.title}</h4>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-800 text-cyan-400 font-mono">
                  {p.badge}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-sans mt-1.5 leading-relaxed">
                {p.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
