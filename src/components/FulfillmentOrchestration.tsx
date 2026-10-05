import React, { useState } from 'react';
import {
  Layers,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  Zap,
  Clock,
  Terminal,
  Server,
  FileCode,
  CornerDownRight,
  RefreshCw,
  Sliders,
  Star,
} from 'lucide-react';
import { OrderFsmStatus, FulfillmentStepInfo } from '../types';
import { CONNECTORS_DATA } from '../data/mockData';
import { CustomerCourierTracking } from './CustomerCourierTracking';

interface FulfillmentOrchestrationProps {
  onNavigateToFeedback?: (orderId: string, courierId: string) => void;
}

export const FulfillmentOrchestration: React.FC<FulfillmentOrchestrationProps> = ({
  onNavigateToFeedback,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(5); // COURIER_ASSIGNED
  const [idempotencyKey, setIdempotencyKey] = useState<string>('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d');
  const [isDuplicateTestRun, setIsDuplicateTestRun] = useState<boolean>(false);
  const [duplicateResponse, setDuplicateResponse] = useState<string | null>(null);
  const [activeConnectorTab, setActiveConnectorTab] = useState<string>('conn_oms');
  const [simulatedFailure, setSimulatedFailure] = useState<'NONE' | 'RETRY' | 'OUT_OF_STOCK' | 'DLQ'>('NONE');
  const [retryAttempt, setRetryAttempt] = useState<number>(0);

  const steps: FulfillmentStepInfo[] = [
    {
      status: 'ORDER_CREATED',
      label: '1. Customer Order',
      system: 'Merchant OMS',
      description: 'Order ingested via API Gateway with client Idempotency-Key. Payment hold pre-authorized.',
      timestamp: '01:10:02.104Z',
      telemetryPayload: {
        orderId: 'ORD-98214',
        customerId: 'CUST-3891',
        totalUsd: 48.5,
        itemsCount: 3,
        idempotencyKey: idempotencyKey,
        merchantId: 'M-401',
      },
    },
    {
      status: 'INVENTORY_CONFIRMED',
      label: '2. Inventory Check',
      system: 'WMS / Retail Store',
      description: 'Real-time SKU reservation lock acquired across distributed inventory partitions.',
      timestamp: '01:10:02.320Z',
      telemetryPayload: {
        reservationId: 'RES-88910',
        skusLocked: ['SKU-BEV-99', 'SKU-SNK-12', 'SKU-HOT-01'],
        locationId: 'HUB-MIDTOWN-04',
        lockDurationSec: 900,
      },
    },
    {
      status: 'PICKING',
      label: '3. Picking Wave',
      system: 'WMS Pick-to-Light',
      description: 'Wave picking route calculated. Picker terminal confirmed item barcode scans.',
      timestamp: '01:11:15.890Z',
      telemetryPayload: {
        pickerId: 'EMP-771',
        zoneAisle: 'Aisle-4-Bay-B',
        binId: 'BIN-104',
        scanVerification: '100%_MATCH',
      },
    },
    {
      status: 'PACKED',
      label: '4. Packing & Verification',
      system: 'Pack Station Scales',
      description: 'Automated gravimetric weight check passed (1.42 kg ±0.02kg). Tamper-evident seal applied.',
      timestamp: '01:12:44.210Z',
      telemetryPayload: {
        scaleWeightGrams: 1422,
        expectedWeightGrams: 1420,
        toleranceDelta: '+0.14%',
        barcodeBagId: 'BAG-NYC-4401',
      },
    },
    {
      status: 'COURIER_REQUESTED',
      label: '5. Courier Request',
      system: 'Dispatch Service',
      description: 'Bipartite matching algorithm evaluates courier proximity, delivery window, and vehicle capacity.',
      timestamp: '01:12:45.002Z',
      telemetryPayload: {
        searchRadiusMeters: 1200,
        candidateCouriersEvaluated: 14,
        routingCostScore: 0.94,
        targetEtaToMerchantMin: 3.5,
      },
    },
    {
      status: 'COURIER_ASSIGNED',
      label: '6. Courier Assignment',
      system: 'Delivery API / TMS',
      description: 'Assignment token accepted by Courier VH-CARGO-54. GPS telemetry streaming active.',
      timestamp: '01:13:01.440Z',
      telemetryPayload: {
        courierId: 'CR-8841',
        vehicleType: 'E-Cargo Bike',
        currentDistanceMeters: 420,
        merchantArrivalEtaMin: 2.8,
        telemetryFrequencyMs: 1000,
      },
    },
    {
      status: 'OUT_FOR_DELIVERY',
      label: '7. Out For Delivery',
      system: 'TMS & GPS Geo-fence',
      description: 'Courier picked up parcel at merchant window. Real-time customer tracking URL active.',
      timestamp: '01:16:10.118Z',
      telemetryPayload: {
        pickupVerificationPin: '9921',
        originMerchant: 'M-401',
        destination: '240 W 40th St',
        estDeliveryWindow: '01:28 - 01:34 UTC',
      },
    },
    {
      status: 'DELIVERED',
      label: '8. Proof of Delivery',
      system: 'Audit Ledger / Pod Service',
      description: 'Geo-fence drop-off verified (<12m radius). Photo POD & customer signature recorded on chain.',
      timestamp: '01:29:42.890Z',
      telemetryPayload: {
        podMethod: 'PHOTO_AND_GEO_COORDINATES',
        geoDropoffAccuracyMeters: 4.8,
        auditRecordHash: 'sha256:7f991b10a2f...ee8',
        lifecycleTotalSeconds: 1180,
      },
    },
  ];

  const currentStep = steps[currentStepIndex] || steps[0];

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
      setSimulatedFailure('NONE');
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      setSimulatedFailure('NONE');
    }
  };

  const handleReset = () => {
    setCurrentStepIndex(0);
    setSimulatedFailure('NONE');
    setRetryAttempt(0);
  };

  // Test Idempotency with atomic cache simulation
  const handleTestDuplicateRequest = () => {
    setIsDuplicateTestRun(true);
    setTimeout(() => {
      setDuplicateResponse(`HTTP 200 OK (CACHED_IDEMPOTENT_RESPONSE)
Cache-Status: HIT_IDEMPOTENCY_FILTER
Original-Request-Id: ${idempotencyKey}
Status: COMMITTED (State was NOT duplicated)
SHA-256 Payload Hash: sha256:c18fa4e...99e
Execution: Zero side-effects triggered.`);
      setIsDuplicateTestRun(false);
    }, 400);
  };

  const generateNewKey = () => {
    const newKey = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    setIdempotencyKey(newKey);
    setDuplicateResponse(null);
  };

  // Inject failure simulation
  const handleSimulateRetry = () => {
    setSimulatedFailure('RETRY');
    setRetryAttempt((prev) => (prev < 3 ? prev + 1 : 1));
  };

  const handleSimulateOutOfStock = () => {
    setSimulatedFailure('OUT_OF_STOCK');
  };

  const handleSimulateDlq = () => {
    setSimulatedFailure('DLQ');
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="bg-neutral-900/60 p-4 rounded-xl border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-mono text-xs font-semibold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30">
              CAPABILITY 02
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">Intelligent Fulfillment Orchestration</h2>
          </div>
          <p className="text-xs text-neutral-400 mt-1 max-w-3xl">
            Monotonic finite state machine orchestrating end-to-end order lifecycles across OMS, WMS, TMS, and delivery APIs. Demonstrates strict idempotency guarantees, truncated exponential backoff with jitter, outbox CDC streaming, and dead-letter recovery.
          </p>
        </div>

        {/* Stepper Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-xs font-mono text-neutral-300 border border-neutral-700 cursor-pointer"
          >
            ← Previous State
          </button>
          <button
            onClick={handleNext}
            disabled={currentStepIndex === steps.length - 1}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-xs font-mono font-semibold text-white shadow-md shadow-cyan-600/20 cursor-pointer"
          >
            Advance State →
          </button>
          <button
            onClick={handleReset}
            className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-mono text-neutral-400 border border-neutral-700 cursor-pointer"
            title="Reset to Order Created"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Step Visualizer Bar */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="flex items-center justify-between relative">
            {/* Connecting Track */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-neutral-800 -translate-y-1/2 z-0" />
            <div
              className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-cyan-500 to-emerald-500 -translate-y-1/2 z-0 transition-all duration-300"
              style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
            />

            {steps.map((step, idx) => {
              const isPassed = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <div
                  key={step.status}
                  onClick={() => {
                    setCurrentStepIndex(idx);
                    setSimulatedFailure('NONE');
                  }}
                  className="relative z-10 flex flex-col items-center cursor-pointer group"
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all duration-200 ${
                      isCurrent
                        ? 'bg-cyan-500 text-neutral-950 ring-4 ring-cyan-500/20 scale-110'
                        : isPassed
                        ? 'bg-emerald-500 text-neutral-950'
                        : 'bg-neutral-800 text-neutral-500 border border-neutral-700'
                    }`}
                  >
                    {isPassed ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <div
                    className={`text-[10px] font-mono mt-2 text-center whitespace-nowrap ${
                      isCurrent ? 'text-cyan-400 font-bold' : isPassed ? 'text-neutral-300' : 'text-neutral-500'
                    }`}
                  >
                    {step.status}
                  </div>
                  <div className="text-[9px] text-neutral-500 font-sans">{step.system}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* State Detail & Resilience Sandbox Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Active State Details & Event Payload (7 Cols) */}
        <div className="lg:col-span-7 bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  State Machine Inspection: {currentStep.status}
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300 font-mono text-[10px]">
                {currentStep.system}
              </span>
            </div>

            {/* Description & Invariants */}
            <div className="mt-3 p-3 bg-neutral-950 rounded-lg border border-neutral-800/80">
              <div className="text-xs text-neutral-300 font-sans leading-relaxed">
                {currentStep.description}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-mono text-neutral-400 pt-2 border-t border-neutral-800/60">
                <span>Timestamp: <strong className="text-neutral-200">{currentStep.timestamp}</strong></span>
                <span>•</span>
                <span>Kafka Event: <strong className="text-cyan-400">orders.fulfillment.{currentStep.status.toLowerCase()}</strong></span>
              </div>
            </div>

            {/* Event Payload Schema */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mb-1.5">
                <span className="flex items-center gap-1">
                  <FileCode className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Transactional Outbox Payload (CDC Streamed)</span>
                </span>
                <span className="text-emerald-400 font-semibold">Idempotent Token Enforced</span>
              </div>
              <pre className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 text-cyan-300 font-mono text-xs overflow-x-auto">
                {JSON.stringify(
                  {
                    event_id: `evt_${Math.random().toString(36).substr(2, 9)}`,
                    idempotency_key: idempotencyKey,
                    state: currentStep.status,
                    system_origin: currentStep.system,
                    payload: currentStep.telemetryPayload,
                    schema_version: 'v2.4.0',
                  },
                  null,
                  2
                )}
              </pre>
            </div>

            {/* Delivered State: Customer Feedback Trigger */}
            {currentStep.status === 'DELIVERED' && (
              <div className="mt-3 p-3 bg-emerald-950/40 border border-emerald-800/80 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2 text-emerald-300">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                  <span>Order Delivered: Prompt customer to rate courier (1-5★) and submit quality feedback.</span>
                </div>
                {onNavigateToFeedback && (
                  <button
                    onClick={() => onNavigateToFeedback('ORD-98214', 'CR-8841')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold transition cursor-pointer shrink-0 shadow-sm"
                  >
                    Rate Courier (1-5★) →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Failure Injection Controls */}
          <div className="mt-4 pt-3 border-t border-neutral-800">
            <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>Chaos & Resilience Simulation Injector:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleSimulateRetry}
                className="px-2.5 py-1.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-mono flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Inject Transient Timeout (Retry + Jitter)</span>
              </button>
              <button
                onClick={handleSimulateOutOfStock}
                className="px-2.5 py-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-mono flex items-center gap-1.5 cursor-pointer"
              >
                <AlertCircle className="w-3 h-3" />
                <span>Simulate Out-of-Stock (SAGA Compensation)</span>
              </button>
              <button
                onClick={handleSimulateDlq}
                className="px-2.5 py-1.5 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-mono flex items-center gap-1.5 cursor-pointer"
              >
                <CornerDownRight className="w-3 h-3" />
                <span>Route to Dead-Letter Queue (DLQ)</span>
              </button>
            </div>

            {/* Failure Outcome Banner */}
            {simulatedFailure === 'RETRY' && (
              <div className="mt-2.5 p-2.5 bg-amber-950/40 border border-amber-900/60 rounded text-xs font-mono text-amber-300">
                <div className="font-bold flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Truncated Exponential Backoff with Full Jitter: Attempt #{retryAttempt} of 5</span>
                </div>
                <div className="text-[11px] text-neutral-300 mt-1">
                  Formula: <code className="text-amber-200">T_sleep = min(T_max, T_base * 2^attempt) * Uniform(0, 1)</code>
                  <br />
                  Current sleep duration: {Math.round(Math.min(5000, 100 * Math.pow(2, retryAttempt)) * 0.72)}ms. State preserved in transactional outbox.
                </div>
              </div>
            )}

            {simulatedFailure === 'OUT_OF_STOCK' && (
              <div className="mt-2.5 p-2.5 bg-rose-950/40 border border-rose-900/60 rounded text-xs font-mono text-rose-300">
                <div className="font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>SAGA Compensation Triggered: Transition to ORDER_CANCELLED</span>
                </div>
                <div className="text-[11px] text-neutral-300 mt-1">
                  Event emitted: <code className="text-rose-200">orders.compensation.refund_initiated</code>. Merchant release acquired. Zero dangling locks.
                </div>
              </div>
            )}

            {simulatedFailure === 'DLQ' && (
              <div className="mt-2.5 p-2.5 bg-purple-950/40 border border-purple-900/60 rounded text-xs font-mono text-purple-300">
                <div className="font-bold flex items-center gap-1">
                  <CornerDownRight className="w-3.5 h-3.5 text-purple-400" />
                  <span>Max Retries Exceeded (5/5). Diverted to DLQ: orders.fulfillment.dlq</span>
                </div>
                <div className="text-[11px] text-neutral-300 mt-1">
                  Dead-letter message preserved with original headers, exception stack, and correlation tokens. Ready for operator replay.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Idempotency Testing & Integration Connectors (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Idempotency Test Laboratory */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  Idempotency Guarantee Lab
                </h3>
              </div>
              <button
                onClick={generateNewKey}
                className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 cursor-pointer"
              >
                Generate New UUID
              </button>
            </div>

            <div className="mt-3 space-y-2">
              <div className="text-[11px] text-neutral-400 font-mono">
                Idempotency-Key Header:
              </div>
              <div className="p-2 bg-neutral-950 border border-neutral-800 rounded font-mono text-xs text-neutral-200 flex items-center justify-between">
                <span className="truncate">{idempotencyKey}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">UUIDv4</span>
              </div>

              <button
                onClick={handleTestDuplicateRequest}
                disabled={isDuplicateTestRun}
                className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs font-mono flex items-center justify-center gap-2 transition cursor-pointer border border-neutral-700"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Simulate Duplicate Ingestion (Network Retry)</span>
              </button>

              {duplicateResponse && (
                <div className="mt-2 p-2.5 bg-neutral-950 border border-emerald-900/50 rounded font-mono text-[11px] text-emerald-300 leading-relaxed">
                  <pre className="whitespace-pre-wrap">{duplicateResponse}</pre>
                </div>
              )}
            </div>
          </div>

          {/* Integration Connectors Catalog */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  Integration Connectors
                </h3>
              </div>
              <span className="text-[10px] font-mono text-neutral-500">7 Active Connectors</span>
            </div>

            {/* Connector selector tabs */}
            <div className="mt-2.5 flex flex-wrap gap-1">
              {CONNECTORS_DATA.map((conn) => (
                <button
                  key={conn.id}
                  onClick={() => setActiveConnectorTab(conn.id)}
                  className={`px-2 py-1 rounded text-[10px] font-mono transition cursor-pointer ${
                    activeConnectorTab === conn.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                  }`}
                >
                  {conn.category}
                </button>
              ))}
            </div>

            {/* Selected Connector Spec */}
            {(() => {
              const selectedConn = CONNECTORS_DATA.find((c) => c.id === activeConnectorTab) || CONNECTORS_DATA[0];
              return (
                <div className="mt-3 p-3 bg-neutral-950 rounded-lg border border-neutral-800 space-y-1.5 text-xs font-mono">
                  <div className="flex items-center justify-between font-bold text-neutral-200">
                    <span>{selectedConn.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        selectedConn.health === 'HEALTHY'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {selectedConn.health}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400 font-sans">{selectedConn.description}</div>
                  <div className="pt-2 border-t border-neutral-800/80 space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Protocol:</span>
                      <span className="text-neutral-300">{selectedConn.protocol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">P99 SLA:</span>
                      <span className="text-cyan-400">{selectedConn.slaP99}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Retry Policy:</span>
                      <span className="text-neutral-300">{selectedConn.retryPolicy}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Embedded Real-Time Customer Courier Tracking Map */}
      <div className="pt-2">
        <CustomerCourierTracking orderId="ORD-98214" />
      </div>
    </div>
  );
};
