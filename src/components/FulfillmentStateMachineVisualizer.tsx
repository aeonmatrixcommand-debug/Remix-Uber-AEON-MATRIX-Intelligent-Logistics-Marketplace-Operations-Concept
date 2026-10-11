import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  ArrowRight,
  Server,
  ShieldCheck,
  Truck,
  PackageCheck,
  Navigation,
  Play,
  Pause,
  RotateCcw,
  Layers,
  Database,
  Radio,
  Lock,
  AlertTriangle,
  Cpu,
  GitCommit,
  Activity,
} from 'lucide-react';
import { OrderFsmStatus } from '../types';

interface StateNodeMeta {
  status: OrderFsmStatus;
  stepNum: string;
  shortLabel: string;
  systemBadge: 'OMS' | 'WMS' | 'DISPATCH' | 'TMS' | 'POD LEDGER';
  systemFullName: string;
  protocol: string;
  kafkaTopic: string;
  slaBudgetMs: string;
  isHighlightedKeyState?: boolean;
  managementSummary: string;
  integrationPoints: {
    sourceSystem: string;
    targetSystem: string;
    contract: string;
    invariants: string[];
  };
}

const FSM_NODES: StateNodeMeta[] = [
  {
    status: 'ORDER_CREATED',
    stepNum: '01',
    shortLabel: 'Order Created',
    systemBadge: 'OMS',
    systemFullName: 'Merchant Order Management System (OMS)',
    protocol: 'REST HTTPS / Idempotency-Key',
    kafkaTopic: 'orders.fulfillment.order_created',
    slaBudgetMs: '45ms P99',
    managementSummary:
      'Ingests checkout request via API Gateway, validates UUIDv4 Idempotency-Key in Redis atomic lock, pre-authorizes payment hold, and writes initial event to transactional outbox.',
    integrationPoints: {
      sourceSystem: 'Checkout Gateway / Client App',
      targetSystem: 'OMS Core & Payment Service',
      contract: 'POST /v2/orders (Idempotency-Key enforced)',
      invariants: [
        'Strict deduplication via SHA-256 payload fingerprint',
        'Pre-auth capture hold verified before state emission',
      ],
    },
  },
  {
    status: 'INVENTORY_CONFIRMED',
    stepNum: '02',
    shortLabel: 'Inventory Confirmed',
    systemBadge: 'WMS',
    systemFullName: 'Warehouse & Retail Store Management (WMS)',
    protocol: 'gRPC / Two-Phase SKU Lock',
    kafkaTopic: 'orders.fulfillment.inventory_confirmed',
    slaBudgetMs: '85ms P99',
    isHighlightedKeyState: true,
    managementSummary:
      'Acquires distributed pessimistic SKU reservation lock across micro-fulfillment dark stores or merchant POS inventory partitions with a 900-second TTL lease.',
    integrationPoints: {
      sourceSystem: 'OMS Outbox CDC Stream',
      targetSystem: 'WMS Inventory Partition & Retail POS',
      contract: 'rpc ReserveInventory(SkuLockRequest) returns (ReservationLease)',
      invariants: [
        'Atomic decrement of available-to-promise (ATP) stock across SKU-BEV-99, SKU-SNK-12',
        'Auto-triggers SAGA compensation (ORDER_CANCELLED) if any item fails stock lock',
        '900s lease timer prevents phantom inventory starvation',
      ],
    },
  },
  {
    status: 'PICKING',
    stepNum: '03',
    shortLabel: 'Picking Wave',
    systemBadge: 'WMS',
    systemFullName: 'WMS Pick-to-Light & Dark Store RF',
    protocol: 'MQTT / Mobile RF Scanner',
    kafkaTopic: 'orders.fulfillment.picking',
    slaBudgetMs: '180s Wave SLA',
    managementSummary:
      'Generates optimal aisle traversal path inside fulfillment center. Warehouse associate scans bin & item GS1 barcodes to verify 100% SKU accuracy.',
    integrationPoints: {
      sourceSystem: 'WMS Reservation Engine',
      targetSystem: 'Associate RF Terminal & Pick-to-Light Hardware',
      contract: 'WMS_WAVE_DISPATCH_V3',
      invariants: [
        'Barcode scan verification must match locked SKU GTIN',
        'Temperature zone separation (Ambient / Chilled / Frozen)',
      ],
    },
  },
  {
    status: 'PACKED',
    stepNum: '04',
    shortLabel: 'Packed & Sealed',
    systemBadge: 'WMS',
    systemFullName: 'WMS Pack Station & Gravimetric Scale',
    protocol: 'IoT Serial / gRPC Telemetry',
    kafkaTopic: 'orders.fulfillment.packed',
    slaBudgetMs: '60s Pack SLA',
    managementSummary:
      'Verifies physical package weight on calibrated scale (1,422g vs 1,420g expected ±0.14% tolerance) and prints tamper-evident thermal staging label.',
    integrationPoints: {
      sourceSystem: 'Pack Station IoT Scale',
      targetSystem: 'WMS Staging & Dispatch Bridge',
      contract: 'GRAVIMETRIC_VERIFY_ACK',
      invariants: [
        'Weight drift > 2.5% halts transition for manual audit',
        'Tamper-evident bag ID bound to order manifest',
      ],
    },
  },
  {
    status: 'COURIER_REQUESTED',
    stepNum: '05',
    shortLabel: 'Courier Requested',
    systemBadge: 'DISPATCH',
    systemFullName: 'Spatial Dispatch & Bipartite Matching Engine',
    protocol: 'gRPC / H3 Hex Index',
    kafkaTopic: 'orders.fulfillment.courier_requested',
    slaBudgetMs: '120ms Solver',
    managementSummary:
      'Broadcasts ready-time prediction to H3 hexagonal spatial index (radius 1,200m), evaluating 14 candidate couriers by ETA, vehicle capacity, and batching affinity.',
    integrationPoints: {
      sourceSystem: 'WMS Ready-Time Estimator',
      targetSystem: 'Uber × AEON Spatial Solver & TMS',
      contract: 'rpc SolveBipartiteDispatch(DispatchBatch)',
      invariants: [
        'Minimizes courier wait dwell at merchant pickup window',
        'Verifies thermal bag & E-Cargo weight capacity',
      ],
    },
  },
  {
    status: 'COURIER_ASSIGNED',
    stepNum: '06',
    shortLabel: 'Courier Assigned',
    systemBadge: 'TMS',
    systemFullName: 'Transportation Management System (TMS / Delivery API)',
    protocol: 'WebSocket + Signed JWT Offer',
    kafkaTopic: 'orders.fulfillment.courier_assigned',
    slaBudgetMs: '8.5s Offer Lock',
    isHighlightedKeyState: true,
    managementSummary:
      'Binds Courier CR-8841 (E-Cargo Bike) via cryptographically signed assignment token. Initiates 1Hz GPS telemetry stream and locks merchant arrival ETA (2.8m).',
    integrationPoints: {
      sourceSystem: 'Spatial Dispatch Solver',
      targetSystem: 'TMS Fleet Telemetry & Courier App',
      contract: 'TMS_ASSIGNMENT_COMMIT_V2',
      invariants: [
        'Exclusive lease prevents double-dispatch across concurrent zones',
        'Activates 1,000ms continuous GPS coordinate ingestion stream',
        'Automatic re-dispatch fallback if courier movement stalls > 180s',
      ],
    },
  },
  {
    status: 'OUT_FOR_DELIVERY',
    stepNum: '07',
    shortLabel: 'Out For Delivery',
    systemBadge: 'TMS',
    systemFullName: 'TMS Route Corridor & Geo-Fence Engine',
    protocol: 'WebSocket 1Hz GPS / Webhook',
    kafkaTopic: 'orders.fulfillment.out_for_delivery',
    slaBudgetMs: 'Real-Time Stream',
    isHighlightedKeyState: true,
    managementSummary:
      'Triggered upon dual custody handoff (Merchant PIN 9921 + bag barcode scan). Streams live turn-by-turn route telemetry, dynamic traffic ETA, and customer tracking link.',
    integrationPoints: {
      sourceSystem: 'TMS Custody Handoff & GPS Stream',
      targetSystem: 'Customer Tracking Gateway & Geo-Fence Monitor',
      contract: 'CUSTODY_TRANSFER_PIN_VERIFIED',
      invariants: [
        'Requires cryptographic PIN (9921) + physical bag scan at pickup window',
        'Continuous corridor deviation monitoring & dynamic SLA recalculation',
        'Arms 12-meter destination drop-off geofence trigger',
      ],
    },
  },
  {
    status: 'DELIVERED',
    stepNum: '08',
    shortLabel: 'Delivered (POD)',
    systemBadge: 'POD LEDGER',
    systemFullName: 'Immutable Audit Ledger & Proof-of-Delivery Service',
    protocol: 'HTTPS / SHA-256 Attestation',
    kafkaTopic: 'orders.fulfillment.delivered',
    slaBudgetMs: 'Final Terminal State',
    managementSummary:
      'Verifies courier GPS inside <12m drop-off geofence (actual 4.8m), records photo POD & signature hash on immutable ledger, and settles merchant/courier payout.',
    integrationPoints: {
      sourceSystem: 'TMS Mobile POD Capture',
      targetSystem: 'OMS Settlement & AEON Audit Ledger',
      contract: 'POD_ATTESTATION_COMMIT',
      invariants: [
        'Geofence accuracy <= 12.0m verified prior to terminal commit',
        'Immutable SHA-256 receipt hash written to audit ledger',
      ],
    },
  },
];

interface FulfillmentStateMachineVisualizerProps {
  activeStepIndex?: number;
  onSelectStepIndex?: (index: number) => void;
}

export const FulfillmentStateMachineVisualizer: React.FC<FulfillmentStateMachineVisualizerProps> = ({
  activeStepIndex: externalStepIndex,
  onSelectStepIndex,
}) => {
  const [internalStepIndex, setInternalStepIndex] = useState<number>(5); // Default to COURIER_ASSIGNED
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [highlightedSpotlight, setHighlightedSpotlight] = useState<
    'ALL' | 'INVENTORY_CONFIRMED' | 'COURIER_ASSIGNED' | 'OUT_FOR_DELIVERY'
  >('ALL');

  const currentIndex = externalStepIndex !== undefined ? externalStepIndex : internalStepIndex;

  const setStepIndex = (idx: number) => {
    if (onSelectStepIndex) {
      onSelectStepIndex(idx);
    } else {
      setInternalStepIndex(idx);
    }
  };

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      const nextIdx = (currentIndex + 1) % FSM_NODES.length;
      setStepIndex(nextIdx);
    }, 2400);
    return () => clearInterval(interval);
  }, [isAutoPlaying, currentIndex]);

  const activeNode = FSM_NODES[currentIndex] || FSM_NODES[0];

  const getSystemBadgeStyle = (sys: StateNodeMeta['systemBadge']) => {
    switch (sys) {
      case 'OMS':
        return 'text-sky-300 border-sky-500/30 bg-sky-500/10';
      case 'WMS':
        return 'text-amber-300 border-amber-500/30 bg-amber-500/10';
      case 'DISPATCH':
        return 'text-purple-300 border-purple-500/30 bg-purple-500/10';
      case 'TMS':
        return 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10';
      case 'POD LEDGER':
        return 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10';
    }
  };

  const keySpotlightStates = FSM_NODES.filter((n) => n.isHighlightedKeyState);

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 space-y-5">
      {/* Top Header & Simulation Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <GitCommit className="w-4 h-4" />
            <span>UBER × AEON MATRIX · FINITE STATE MACHINE ARCHITECTURE</span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span className="text-emerald-400">MONOTONIC OUTBOX CDC</span>
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight mt-1">
            Intelligent Fulfillment Orchestration State Machine (ORDER_CREATED → DELIVERED)
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5 max-w-3xl">
            End-to-end visual state machine topology mapping state transitions across OMS, WMS, Spatial Dispatch, TMS, and Proof-of-Delivery systems with deep-dive governance on <code className="text-amber-300">INVENTORY_CONFIRMED</code>, <code className="text-cyan-300">COURIER_ASSIGNED</code>, and <code className="text-emerald-300">OUT_FOR_DELIVERY</code>.
          </p>
        </div>

        {/* Interactive Playback & Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
              isAutoPlaying
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700'
            }`}
          >
            {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{isAutoPlaying ? 'Pause Lifecycle Stream' : 'Simulate Live Order Flow'}</span>
          </button>

          <button
            onClick={() => {
              setIsAutoPlaying(false);
              setStepIndex(0);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-mono text-neutral-300 border border-neutral-700 flex items-center gap-1 cursor-pointer"
            title="Reset to ORDER_CREATED"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* System Integration Architecture Swimlane Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {[
          {
            sys: 'OMS (Merchant Order Mgmt)',
            states: 'ORDER_CREATED',
            proto: 'REST + Idempotency-Key',
            accent: 'border-l-2 border-l-sky-400',
            meta: 'Order ingestion & payment pre-auth',
          },
          {
            sys: 'WMS (Warehouse / Retail)',
            states: 'INVENTORY_CONFIRMED → PACKED',
            proto: 'gRPC + IoT Scales',
            accent: 'border-l-2 border-l-amber-400',
            meta: '2-Phase SKU lock, RF pick & weight check',
          },
          {
            sys: 'Dispatch Matching Engine',
            states: 'COURIER_REQUESTED',
            proto: 'H3 Spatial Solver',
            accent: 'border-l-2 border-l-purple-400',
            meta: 'Bipartite courier-order graph matching',
          },
          {
            sys: 'TMS (Delivery & Fleet API)',
            states: 'COURIER_ASSIGNED → OUT_FOR_DELIVERY',
            proto: 'WebSocket 1Hz GPS',
            accent: 'border-l-2 border-l-cyan-400',
            meta: 'Offer lock, PIN handoff & live corridor ETA',
          },
          {
            sys: 'POD & Audit Ledger',
            states: 'DELIVERED',
            proto: 'SHA-256 Geofence POD',
            accent: 'border-l-2 border-l-emerald-400',
            meta: '<12m drop-off verification & settlement',
          },
        ].map((lane) => (
          <div
            key={lane.sys}
            className={`bg-neutral-950/90 border border-neutral-800/90 ${lane.accent} rounded-lg p-2.5 flex flex-col justify-between`}
          >
            <div>
              <div className="text-[11px] font-mono font-bold text-white truncate">{lane.sys}</div>
              <div className="text-[10px] font-mono text-cyan-400 mt-0.5 truncate">{lane.states}</div>
            </div>
            <div className="mt-2 pt-1.5 border-t border-neutral-800/70 flex items-center justify-between text-[10px] font-mono text-neutral-400">
              <span>{lane.proto}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Interactive 8-State Visual State Machine Topology Diagram */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 overflow-x-auto">
        <div className="flex items-center justify-between mb-3 text-xs font-mono text-neutral-400">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-neutral-200 font-semibold">
              STATE TRANSITION TOPOLOGY (Click any state node to inspect system integration & payload contracts)
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Committed
            </span>
            <span className="flex items-center gap-1 text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" /> Active State
            </span>
            <span className="flex items-center gap-1 text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> Highlighted Control Point
            </span>
          </div>
        </div>

        <div className="min-w-[980px] py-2">
          {/* Main State Pipeline Nodes */}
          <div className="grid grid-cols-8 gap-2 relative">
            {FSM_NODES.map((node, idx) => {
              const isPassed = idx < currentIndex;
              const isCurrent = idx === currentIndex;
              const isKeyHighlight = node.isHighlightedKeyState;

              return (
                <div key={node.status} className="relative flex flex-col">
                  {/* Connector Arrow to Next Node */}
                  {idx < FSM_NODES.length - 1 && (
                    <div className=" -right-2 top-10 z-20 flex items-center justify-center pointer-events-none">
                      <ArrowRight
                        className={`w-3.5 h-3.5 ${
                          isPassed ? 'text-emerald-400' : isCurrent ? 'text-cyan-400 animate-pulse' : 'text-neutral-700'
                        }`}
                      />
                    </div>
                  )}

                  <button
                    onClick={() => setStepIndex(idx)}
                    className={`text-left rounded-lg p-2.5 border transition-all cursor-pointer flex flex-col justify-between min-h-[142px] relative ${
                      isCurrent
                        ? 'bg-cyan-950/40 border-cyan-400 ring-2 ring-cyan-500/30 shadow-lg shadow-cyan-500/10'
                        : isPassed
                        ? 'bg-neutral-900/90 border-emerald-500/40 hover:border-emerald-400'
                        : isKeyHighlight
                        ? 'bg-neutral-900/70 border-amber-500/40 hover:border-amber-400'
                        : 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    {/* Top Row: Step Number + System Integration Tag */}
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-[10px] font-mono font-bold ${
                            isCurrent ? 'text-cyan-300' : isPassed ? 'text-emerald-400' : 'text-neutral-500'
                          }`}
                        >
                          #{node.stepNum}
                        </span>
                        <span
                          className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border ${getSystemBadgeStyle(
                            node.systemBadge
                          )}`}
                        >
                          {node.systemBadge}
                        </span>
                      </div>

                      {/* State Identifier */}
                      <div
                        className={`font-mono text-[10px] font-bold mt-2 break-words leading-tight ${
                          isCurrent ? 'text-white' : isPassed ? 'text-neutral-200' : 'text-neutral-400'
                        }`}
                      >
                        {node.status}
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-0.5 leading-snug">{node.shortLabel}</div>
                    </div>

                    {/* Bottom Row: Protocol & Key Status Indicator */}
                    <div className="mt-2 pt-1.5 border-t border-neutral-800/80">
                      <div className="text-[9px] font-mono text-neutral-400 truncate" title={node.protocol}>
                        {node.protocol}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[9px] font-mono text-cyan-400/90">{node.slaBudgetMs}</span>
                        {isKeyHighlight && (
                          <span className="text-[8px] font-mono uppercase tracking-wider text-amber-300 font-semibold">
                            KEY GATE
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Exception & Compensation Branching Bus */}
          <div className="mt-3 pt-3 border-t border-neutral-800/80 grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px] font-mono">
            <div className="bg-neutral-900/70 border border-neutral-800 rounded-lg px-3 py-2 flex items-center justify-between">
              <div>
                <span className="text-amber-400 font-bold">TRANSIENT_RETRY_LOOP</span>
                <div className="text-[10px] text-neutral-400 font-sans">
                  Truncated exponential backoff + jitter on OMS/WMS/TMS RPC timeouts (max 5 attempts)
                </div>
              </div>
              <span className="text-[10px] text-amber-300 shrink-0 ml-2">Self-Healing</span>
            </div>

            <div className="bg-neutral-900/70 border border-neutral-800 rounded-lg px-3 py-2 flex items-center justify-between">
              <div>
                <span className="text-rose-400 font-bold">SAGA_COMPENSATION → ORDER_CANCELLED</span>
                <div className="text-[10px] text-neutral-400 font-sans">
                  Triggered if <code className="text-rose-300">INVENTORY_CONFIRMED</code> fails SKU lock; voids payment hold atomically
                </div>
              </div>
              <span className="text-[10px] text-rose-300 shrink-0 ml-2">Zero Dangling Locks</span>
            </div>

            <div className="bg-neutral-900/70 border border-neutral-800 rounded-lg px-3 py-2 flex items-center justify-between">
              <div>
                <span className="text-purple-400 font-bold">DEAD_LETTER_QUEUE (orders.dlq)</span>
                <div className="text-[10px] text-neutral-400 font-sans">
                  Captures unrecoverable schema or downstream outages after 5 retries for operator replay
                </div>
              </div>
              <span className="text-[10px] text-purple-300 shrink-0 ml-2">Fail-Closed Audit</span>
            </div>
          </div>
        </div>
      </div>

      {/* Highlighted Statuses Deep-Dive Management Panel: INVENTORY_CONFIRMED, COURIER_ASSIGNED, OUT_FOR_DELIVERY */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              Critical State Management & Cross-System Integration Deep-Dive
            </h4>
          </div>

          {/* Interactive Filter Buttons for the 3 Highlighted States */}
          <div className="flex flex-wrap items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
            {(
              [
                { id: 'ALL', label: 'All 3 Critical States' },
                { id: 'INVENTORY_CONFIRMED', label: 'INVENTORY_CONFIRMED (WMS)' },
                { id: 'COURIER_ASSIGNED', label: 'COURIER_ASSIGNED (TMS)' },
                { id: 'OUT_FOR_DELIVERY', label: 'OUT_FOR_DELIVERY (Geo-Fence)' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setHighlightedSpotlight(tab.id);
                  if (tab.id !== 'ALL') {
                    const targetIdx = FSM_NODES.findIndex((n) => n.status === tab.id);
                    if (targetIdx !== -1) setStepIndex(targetIdx);
                  }
                }}
                className={`px-2.5 py-1 rounded text-[10px] font-mono transition cursor-pointer ${
                  highlightedSpotlight === tab.id
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {keySpotlightStates
            .filter((node) => highlightedSpotlight === 'ALL' || node.status === highlightedSpotlight)
            .map((node) => {
              const nodeIdx = FSM_NODES.findIndex((n) => n.status === node.status);
              const isSelected = currentIndex === nodeIdx;

              return (
                <div
                  key={node.status}
                  onClick={() => setStepIndex(nodeIdx)}
                  className={`rounded-xl p-4 border transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-neutral-950 border-cyan-500/60 ring-1 ring-cyan-500/30'
                      : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700'
                  } ${highlightedSpotlight !== 'ALL' ? 'lg:col-span-3' : ''}`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-neutral-800">
                      <div className="flex items-center gap-2">
                        {node.status === 'INVENTORY_CONFIRMED' && (
                          <PackageCheck className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                        {node.status === 'COURIER_ASSIGNED' && (
                          <Truck className="w-4 h-4 text-cyan-400 shrink-0" />
                        )}
                        {node.status === 'OUT_FOR_DELIVERY' && (
                          <Navigation className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                        <span className="font-mono text-xs font-bold text-white">{node.status}</span>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-400">
                        {node.systemBadge} · {node.slaBudgetMs}
                      </span>
                    </div>

                    <div className="mt-2.5 text-xs text-neutral-300 leading-relaxed">{node.managementSummary}</div>

                    {/* Integration Contract Box */}
                    <div className="mt-3 p-2.5 rounded-lg bg-neutral-900/90 border border-neutral-800/90 font-mono text-[11px] space-y-1">
                      <div className="flex justify-between gap-2">
                        <span className="text-neutral-500">Integration Bus:</span>
                        <span className="text-neutral-200 text-right">
                          {node.integrationPoints.sourceSystem} → {node.integrationPoints.targetSystem}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-neutral-500">Contract:</span>
                        <span className="text-cyan-300 text-right truncate">{node.integrationPoints.contract}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-neutral-500">Kafka Outbox:</span>
                        <span className="text-emerald-400 text-right truncate">{node.kafkaTopic}</span>
                      </div>
                    </div>

                    {/* State Management Invariants */}
                    <div className="mt-3 space-y-1">
                      <div className="text-[10px] font-mono uppercase text-neutral-400">
                        State Governance & Invariants:
                      </div>
                      {node.integrationPoints.invariants.map((inv, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[11px] text-neutral-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{inv}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-neutral-800/80 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-neutral-400">System: {node.systemFullName}</span>
                    <span className="text-cyan-400 font-semibold">
                      {isSelected ? 'ACTIVE IN INSPECTOR' : 'Inspect State →'}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};
