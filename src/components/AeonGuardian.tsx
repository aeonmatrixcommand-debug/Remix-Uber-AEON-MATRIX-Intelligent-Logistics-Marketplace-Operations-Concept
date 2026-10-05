import React, { useState } from 'react';
import {
  Lock,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileKey,
  Clock,
  ArrowRight,
  UserCheck,
  Sliders,
  History,
  Check,
  RefreshCw,
} from 'lucide-react';
import { AuditRecord, RiskTier } from '../types';
import { INITIAL_AUDIT_RECORDS } from '../data/mockData';

export const AeonGuardian: React.FC = () => {
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>(INITIAL_AUDIT_RECORDS);
  const [currentScopeOrders, setCurrentScopeOrders] = useState<number>(18);
  const [pendingStatus, setPendingStatus] = useState<
    'AWAITING' | 'APPROVED' | 'REJECTED' | 'FAIL_CLOSED'
  >('AWAITING');
  const [approverNotes, setApproverNotes] = useState<string>(
    'Verified via active courier heatmap in Zone-04 and telemetry hash.'
  );
  const [isTamperedSimulation, setIsTamperedSimulation] = useState<boolean>(false);

  // Compute risk tier based on scope
  const computedRiskTier: RiskTier =
    currentScopeOrders > 25 ? 'HIGH' : currentScopeOrders >= 12 ? 'MEDIUM' : 'LOW';

  const handleApprove = () => {
    const newRecord: AuditRecord = {
      auditEventId: `AUD-${Math.floor(10000 + Math.random() * 90000)}-NYC`,
      requestId: 'REQ-REBALANCE-20260925-018',
      timestampIso: new Date().toISOString(),
      evidenceHash: isTamperedSimulation
        ? 'INVALID_HASH_TAMPER_DETECTED'
        : 'sha256:c7e1f4094a8e3d8199b51fa30a840e69b0aaef55b1f13b1945bcbaee29094e1d',
      policyVersion: 'POL-DYNAMIC-DISPATCH-SEC-09.v2',
      riskTier: computedRiskTier,
      aiRecommendation: {
        action: 'CROSS_ZONE_ORDER_MIGRATION',
        orderCount: currentScopeOrders,
        sourceZone: 'ZONE-A (Zone 04)',
        targetZone: 'ZONE-C (Zone 01)',
        details: `Reassign ${currentScopeOrders} delivery orders from Zone A to Zone C courier pool.`,
      },
      humanDecision: {
        action: 'APPROVED',
        approverId: 'usr_ops_lead_774',
        timestampIso: new Date().toISOString(),
        note: approverNotes,
      },
      executionStatus: 'COMMITTED_TO_DISPATCH_SERVICE',
      cryptographicSignature: `sig_ed25519_${Math.random().toString(36).substr(2, 16)}`,
    };

    setAuditRecords([newRecord, ...auditRecords]);
    setPendingStatus('APPROVED');
  };

  const handleReject = () => {
    const newRecord: AuditRecord = {
      auditEventId: `AUD-${Math.floor(10000 + Math.random() * 90000)}-NYC`,
      requestId: 'REQ-REBALANCE-20260925-018',
      timestampIso: new Date().toISOString(),
      evidenceHash: 'sha256:c7e1f4094a8e3d8199b51fa30a840e69b0aaef55b1f13b1945bcbaee29094e1d',
      policyVersion: 'POL-DYNAMIC-DISPATCH-SEC-09.v2',
      riskTier: computedRiskTier,
      aiRecommendation: {
        action: 'CROSS_ZONE_ORDER_MIGRATION',
        orderCount: currentScopeOrders,
        sourceZone: 'ZONE-A',
        targetZone: 'ZONE-C',
        details: `Reassign ${currentScopeOrders} delivery orders from Zone A to Zone C courier pool.`,
      },
      humanDecision: {
        action: 'REJECTED',
        approverId: 'usr_ops_lead_774',
        timestampIso: new Date().toISOString(),
        note: 'Operator rejected: Zone C couriers are nearing capacity ceiling.',
      },
      executionStatus: 'REJECTED_DROPPED',
      cryptographicSignature: `sig_ed25519_${Math.random().toString(36).substr(2, 16)}`,
    };

    setAuditRecords([newRecord, ...auditRecords]);
    setPendingStatus('REJECTED');
  };

  const handleTriggerTamperFailClosed = () => {
    setIsTamperedSimulation(true);
    setPendingStatus('FAIL_CLOSED');

    const failRecord: AuditRecord = {
      auditEventId: `AUD-${Math.floor(10000 + Math.random() * 90000)}-NYC`,
      requestId: 'REQ-TAMPER-ALERT-001',
      timestampIso: new Date().toISOString(),
      evidenceHash: 'HASH_MISMATCH_SUSPECTED_CORRUPTION',
      policyVersion: 'POL-FAIL-CLOSED-SEC-01',
      riskTier: 'HIGH',
      aiRecommendation: {
        action: 'UNVERIFIED_STATE_MUTATION',
        orderCount: 18,
        sourceZone: 'ZONE-A',
        targetZone: 'ZONE-C',
        details: 'Telemetry hash signature validation failed. Invariant violated.',
      },
      humanDecision: {
        action: 'REJECTED',
        approverId: 'SYSTEM_FAIL_CLOSED_DAEMON',
        timestampIso: new Date().toISOString(),
        note: 'FAIL-CLOSED: Cryptographic signature mismatch. All automated & advisory execution blocked.',
      },
      executionStatus: 'FAIL_CLOSED_BLOCKED',
      cryptographicSignature: 'BLOCKED_INVALID_SIGNATURE',
    };

    setAuditRecords([failRecord, ...auditRecords]);
  };

  const handleResetReview = () => {
    setIsTamperedSimulation(false);
    setPendingStatus('AWAITING');
    setCurrentScopeOrders(18);
  };

  const pipelineStages = [
    { title: '1. Evidence Validation', desc: 'SHA-256 telemetry hash check', done: !isTamperedSimulation, fail: isTamperedSimulation },
    { title: '2. Policy Check', desc: 'Safety boundaries & order caps', done: !isTamperedSimulation, fail: isTamperedSimulation },
    { title: '3. Risk Assessment', desc: `Classified as ${computedRiskTier} tier`, done: !isTamperedSimulation, fail: isTamperedSimulation },
    {
      title: '4. Human Approval',
      desc: pendingStatus === 'APPROVED' ? 'Approved by Operator' : pendingStatus === 'REJECTED' ? 'Rejected by Operator' : 'Awaiting Operator Sign-Off',
      active: pendingStatus === 'AWAITING',
      done: pendingStatus === 'APPROVED',
      fail: pendingStatus === 'REJECTED' || pendingStatus === 'FAIL_CLOSED',
    },
    { title: '5. Execution Eligibility', desc: 'Ed25519 token issued', done: pendingStatus === 'APPROVED' },
    { title: '6. Immutable Audit Record', desc: 'Append-only ledger commit', done: pendingStatus === 'APPROVED' || pendingStatus === 'REJECTED' || pendingStatus === 'FAIL_CLOSED' },
  ];

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="bg-neutral-900/60 p-4 rounded-xl border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-mono text-xs font-semibold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30">
              CAPABILITY 04
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">AI Governance & Human Approval (AEON Guardian)</h2>
          </div>
          <p className="text-xs text-neutral-400 mt-1 max-w-3xl">
            Zero-trust governance plane safeguarding operational stability. Enforces evidence validation, strict policy bounds, mandatory human-in-the-loop sign-off for consequential actions, fail-closed defaults, and tamper-evident auditing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>GUARDIAN ACTIVE</span>
          </span>
        </div>
      </div>

      {/* 4 Core Governance Principles Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold">
            <FileKey className="w-4 h-4" />
            <span>NO EVIDENCE → NO DECISION</span>
          </div>
          <p className="text-[11px] text-neutral-400 font-sans mt-1.5">
            Unverified models or requests lacking cryptographically signed telemetry data are dropped at the edge gateway.
          </p>
        </div>

        <div className="bg-neutral-900/80 border border-neutral-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold">
            <UserCheck className="w-4 h-4" />
            <span>HUMAN-IN-THE-LOOP</span>
          </div>
          <p className="text-[11px] text-neutral-400 font-sans mt-1.5">
            Consequential actions (fleet redistribution, merchant window throttling) require explicit operator confirmation.
          </p>
        </div>

        <div className="bg-neutral-900/80 border border-neutral-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-rose-400 font-mono text-xs font-bold">
            <ShieldAlert className="w-4 h-4" />
            <span>FAIL-CLOSED</span>
          </div>
          <p className="text-[11px] text-neutral-400 font-sans mt-1.5">
            On network partitions, schema mismatch, or ambiguous telemetry, all AI mutations are blocked instantly.
          </p>
        </div>

        <div className="bg-neutral-900/80 border border-neutral-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold">
            <History className="w-4 h-4" />
            <span>IMMUTABLE AUDIT</span>
          </div>
          <p className="text-[11px] text-neutral-400 font-sans mt-1.5">
            Every recommendation, telemetry hash, human approval, and state change is appended to a Merkle audit ledger.
          </p>
        </div>
      </div>

      {/* 6-Stage Governance Pipeline Progress */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
        <div className="text-xs font-bold text-white uppercase font-mono tracking-wider mb-3">
          AEON Guardian Ingestion Pipeline
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {pipelineStages.map((stage, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded-lg border text-xs font-mono transition ${
                stage.fail
                  ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                  : stage.done
                  ? 'bg-emerald-950/30 border-emerald-800/80 text-emerald-300'
                  : stage.active
                  ? 'bg-cyan-950/40 border-cyan-500/80 text-cyan-300 ring-1 ring-cyan-500/30'
                  : 'bg-neutral-950/60 border-neutral-800 text-neutral-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold">{stage.title}</span>
                {stage.fail ? (
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                ) : stage.done ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : stage.active ? (
                  <Clock className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-neutral-700" />
                )}
              </div>
              <div className="text-[10px] mt-1 font-sans opacity-80">{stage.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Case Review Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Pending AI Advisory & Decision Controls (6 Cols) */}
        <div className="lg:col-span-6 bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
                  Operational Recommendation Under Review
                </h3>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  pendingStatus === 'AWAITING'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : pendingStatus === 'APPROVED'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : pendingStatus === 'FAIL_CLOSED'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                STATUS: {pendingStatus === 'AWAITING' ? 'AWAITING HUMAN APPROVAL' : pendingStatus}
              </span>
            </div>

            {/* AI Recommendation Summary */}
            <div className="mt-3 p-3 bg-neutral-950 rounded-lg border border-neutral-800 space-y-2 font-mono text-xs">
              <div className="text-neutral-400 flex justify-between">
                <span>REQUEST ID: REQ-REBALANCE-20260925-018</span>
                <span>POLICY: POL-DYNAMIC-DISPATCH-SEC-09</span>
              </div>
              <div className="text-white text-sm font-sans font-semibold pt-1">
                “Reassign <span className="text-cyan-400">{currentScopeOrders} delivery orders</span> from Zone A to Zone C courier pool.”
              </div>

              {/* Evidence Metrics */}
              <div className="mt-2 pt-2 border-t border-neutral-800 text-[11px] grid grid-cols-3 gap-2">
                <div className="bg-neutral-900 p-2 rounded">
                  <div className="text-neutral-500">Demand Delta</div>
                  <div className="text-rose-400 font-bold mt-0.5">+42% Over</div>
                </div>
                <div className="bg-neutral-900 p-2 rounded">
                  <div className="text-neutral-500">Courier Util</div>
                  <div className="text-amber-400 font-bold mt-0.5">96.2% Max</div>
                </div>
                <div className="bg-neutral-900 p-2 rounded">
                  <div className="text-neutral-500">SLA Delay Risk</div>
                  <div className="text-rose-300 font-bold mt-0.5">+14.2 min</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1 text-neutral-400">
                <span>Calculated Risk Tier:</span>
                <span
                  className={`font-bold ${
                    computedRiskTier === 'HIGH'
                      ? 'text-rose-400'
                      : computedRiskTier === 'MEDIUM'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {computedRiskTier} RISK
                </span>
              </div>
            </div>

            {/* Scope Adjustment Slider */}
            <div className="mt-3 p-3 bg-neutral-950/60 rounded-lg border border-neutral-800">
              <div className="flex items-center justify-between text-xs font-mono mb-1">
                <span className="text-neutral-300">Operator Scope Modulation:</span>
                <span className="text-cyan-400 font-bold">{currentScopeOrders} Orders</span>
              </div>
              <input
                type="range"
                min={5}
                max={35}
                value={currentScopeOrders}
                disabled={pendingStatus !== 'AWAITING'}
                onChange={(e) => setCurrentScopeOrders(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-neutral-500 mt-1">
                <span>5 Orders (Low Risk)</span>
                <span>20 Orders (Policy Cap)</span>
                <span>35 Orders (High Risk / Multi-Zone)</span>
              </div>
            </div>

            {/* Operator Notes Input */}
            <div className="mt-3">
              <label className="text-[11px] font-mono text-neutral-400 block mb-1">Operator Attestation Note:</label>
              <input
                type="text"
                value={approverNotes}
                disabled={pendingStatus !== 'AWAITING'}
                onChange={(e) => setApproverNotes(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded text-xs text-neutral-200 font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 pt-3 border-t border-neutral-800 space-y-2">
            {pendingStatus === 'AWAITING' ? (
              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <button
                  onClick={handleApprove}
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer shadow-lg shadow-emerald-600/20"
                >
                  <Check className="w-4 h-4" />
                  <span>Approve & Sign Token</span>
                </button>
                <button
                  onClick={handleReject}
                  className="py-2.5 px-3 bg-neutral-800 hover:bg-neutral-700 text-rose-300 border border-neutral-700 font-bold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject Advisory</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleResetReview}
                className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono rounded flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Review Case</span>
              </button>
            )}

            {/* Invariant Testing: Trigger Fail-Closed Simulation */}
            {pendingStatus === 'AWAITING' && (
              <button
                onClick={handleTriggerTamperFailClosed}
                className="w-full py-1.5 bg-rose-950/30 hover:bg-rose-950/60 text-rose-400 border border-rose-900/60 rounded text-[11px] font-mono flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Simulate Telemetry Tamper / Invariant Breach (Tests Fail-Closed)</span>
              </button>
            )}
          </div>
        </div>

        {/* Right: Immutable Audit Ledger Timeline (6 Cols) */}
        <div className="lg:col-span-6 bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
                  Immutable Audit Ledger
                </h3>
              </div>
              <span className="text-[10px] font-mono text-neutral-400">Cryptographically Signed</span>
            </div>

            {/* Audit Records List */}
            <div className="mt-3 space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {auditRecords.map((record) => (
                <div
                  key={record.auditEventId}
                  className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 font-mono text-xs space-y-1.5 hover:border-neutral-700 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-400 font-bold">{record.auditEventId}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        record.executionStatus === 'COMMITTED_TO_DISPATCH_SERVICE'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : record.executionStatus === 'FAIL_CLOSED_BLOCKED'
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {record.executionStatus}
                    </span>
                  </div>

                  <div className="text-neutral-300 font-sans text-[11px]">
                    {record.aiRecommendation.details}
                  </div>

                  <div className="pt-1 text-[10px] text-neutral-500 space-y-0.5">
                    <div className="flex justify-between">
                      <span>Approver: <strong className="text-neutral-300">{record.humanDecision.approverId || 'N/A'}</strong></span>
                      <span>Risk: <strong className="text-amber-300">{record.riskTier}</strong></span>
                    </div>
                    <div className="truncate">
                      Hash: <code className="text-neutral-400">{record.evidenceHash}</code>
                    </div>
                    {record.cryptographicSignature && (
                      <div className="truncate text-cyan-400/80">
                        Sig: {record.cryptographicSignature}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-neutral-800 text-[10px] font-mono text-neutral-500 flex justify-between">
            <span>Merkle Chain Integrity: 100% VERIFIED</span>
            <span>Non-Repudiation Guaranteed</span>
          </div>
        </div>
      </div>
    </div>
  );
};
