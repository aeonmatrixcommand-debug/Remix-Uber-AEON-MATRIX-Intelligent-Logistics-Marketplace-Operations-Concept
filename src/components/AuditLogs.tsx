import React, { useState, useMemo } from 'react';
import {
  History,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Search,
  Filter,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  FileCode,
  Hash,
  UserCheck,
  Eye,
  AlertTriangle,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';
import { AuditRecord, RiskTier } from '../types';
import { INITIAL_AUDIT_RECORDS } from '../data/mockData';
import { useLanguage } from '../context/LanguageContext';

interface AuditLogsProps {
  records?: AuditRecord[];
  onNavigateToGovernance?: () => void;
}

export const AuditLogs: React.FC<AuditLogsProps> = ({
  records = INITIAL_AUDIT_RECORDS,
  onNavigateToGovernance,
}) => {
  const { language } = useLanguage();
  const isThai = language === 'th';

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(records[0]?.auditEventId || null);
  const [merkleVerified, setMerkleVerified] = useState<boolean>(true);
  const [isVerifyingMerkle, setIsVerifyingMerkle] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter read-only audit records
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      const matchesStatus = statusFilter === 'ALL' || rec.executionStatus === statusFilter;
      const matchesRisk = riskFilter === 'ALL' || rec.riskTier === riskFilter;
      const query = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !query ||
        rec.auditEventId.toLowerCase().includes(query) ||
        rec.requestId.toLowerCase().includes(query) ||
        rec.evidenceHash.toLowerCase().includes(query) ||
        rec.aiRecommendation.action.toLowerCase().includes(query) ||
        rec.aiRecommendation.details.toLowerCase().includes(query) ||
        (rec.humanDecision.approverId || '').toLowerCase().includes(query) ||
        (rec.humanDecision.note || '').toLowerCase().includes(query);

      return matchesStatus && matchesRisk && matchesQuery;
    });
  }, [records, statusFilter, riskFilter, searchQuery]);

  const selectedRecord = useMemo(() => {
    return (
      filteredRecords.find((r) => r.auditEventId === selectedRecordId) ||
      filteredRecords[0] ||
      records[0]
    );
  }, [filteredRecords, selectedRecordId, records]);

  // Stats counters
  const stats = useMemo(() => {
    const total = records.length;
    const committed = records.filter((r) => r.executionStatus === 'COMMITTED_TO_DISPATCH_SERVICE').length;
    const rejected = records.filter((r) => r.executionStatus === 'REJECTED_DROPPED').length;
    const failClosed = records.filter((r) => r.executionStatus === 'FAIL_CLOSED_BLOCKED').length;
    return { total, committed, rejected, failClosed };
  }, [records]);

  const handleVerifyIntegrity = () => {
    setIsVerifyingMerkle(true);
    setTimeout(() => {
      setIsVerifyingMerkle(false);
      setMerkleVerified(true);
    }, 600);
  };

  const handleCopyHash = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleExportAuditJson = () => {
    const exportPayload = {
      ledgerName: 'AEON_GUARDIAN_IMMUTABLE_AUDIT_LOG',
      exportedAtIso: new Date().toISOString(),
      readOnlyGuarantee: 'APPEND_ONLY_MERKLE_VERIFIED',
      totalRecords: filteredRecords.length,
      records: filteredRecords,
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aeon-guardian-audit-ledger-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusLabel = (status: AuditRecord['executionStatus']) => {
    if (!isThai) return status;
    switch (status) {
      case 'COMMITTED_TO_DISPATCH_SERVICE':
        return 'อนุมัติและส่งคำสั่งสำเร็จ (COMMITTED)';
      case 'REJECTED_DROPPED':
        return 'ปฏิเสธและยกเลิกข้อเสนอแนะ (REJECTED)';
      case 'FAIL_CLOSED_BLOCKED':
        return 'ระงับอัตโนมัติแบบ Fail-Closed (BLOCKED)';
      case 'PENDING_APPROVAL':
        return 'รอการอนุมัติจากมนุษย์ (PENDING)';
      default:
        return status;
    }
  };

  const getDecisionLabel = (action: AuditRecord['humanDecision']['action']) => {
    if (!isThai) return action;
    switch (action) {
      case 'APPROVED':
        return 'อนุมัติโดยผู้ควบคุม (APPROVED)';
      case 'MODIFIED_APPROVED':
        return 'ปรับขอบเขตและอนุมัติ (MODIFIED & APPROVED)';
      case 'REJECTED':
        return 'ไม่อนุมัติ / ปฏิเสธ (REJECTED)';
      case 'AWAITING':
        return 'รอดำเนินการ (AWAITING)';
      default:
        return action;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold">
                {isThai
                  ? 'บันทึกเหตุการณ์แบบอ่านอย่างเดียว (PERSISTENT READ-ONLY AUDIT LEDGER)'
                  : 'PERSISTENT READ-ONLY AUDIT LEDGER'}
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono flex items-center gap-1">
                <Lock className="w-3 h-3" />
                {isThai ? 'ห้ามแก้ไขหรือลบย้อนหลัง (APPEND-ONLY)' : 'IMMUTABLE APPEND-ONLY'}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <History className="w-6 h-6 text-cyan-400" />
              {isThai
                ? 'สมุดบันทึกการตรวจสอบการตัดสินใจของ AEON Guardian (Audit Logs)'
                : 'AEON Guardian Transparency & Decision Audit Logs'}
            </h2>
            <p className="text-xs text-neutral-400 mt-1 max-w-3xl leading-relaxed">
              {isThai
                ? 'จำลองระบบจัดเก็บประวัติการตัดสินใจแบบถาวรและอ่านได้อย่างเดียว (Read-Only) บันทึกทุกการประเมินของ AEON Guardian พร้อมเวลาประทับ (Timestamp), เหตุผลประกอบการตัดสินใจ (Decision Rationale), ลายเซ็นดิจิทัล และสถานะผลลัพธ์ เพื่อความโปร่งใสในการตรวจสอบ 100%'
                : 'Simulates a persistent, read-only cryptographic event log capturing every decision evaluated by AEON Guardian—including timestamps, AI rationale, human operator attestation, and execution outcomes.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleVerifyIntegrity}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-mono text-emerald-300 transition cursor-pointer"
            >
              <ShieldCheck className={`w-4 h-4 text-emerald-400 ${isVerifyingMerkle ? 'animate-spin' : ''}`} />
              <span>
                {isVerifyingMerkle
                  ? isThai
                    ? 'กำลังตรวจสอบแฮช...'
                    : 'Verifying Chain...'
                  : isThai
                  ? 'ตรวจสอบความถูกต้อง Merkle Chain'
                  : 'Verify Merkle Integrity'}
              </span>
            </button>

            <button
              onClick={handleExportAuditJson}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-xs font-mono font-semibold text-cyan-300 transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span>{isThai ? 'ส่งออกไฟล์ Audit (JSON)' : 'Export Audit Log (JSON)'}</span>
            </button>
          </div>
        </div>

        {/* Summary KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-neutral-800/80">
          <div className="bg-neutral-950/70 border border-neutral-800 rounded-lg p-3">
            <div className="text-[11px] text-neutral-400 font-mono">
              {isThai ? 'รายการบันทึกทั้งหมด (Total Logs)' : 'Total Immutable Logs'}
            </div>
            <div className="text-xl font-bold text-white font-mono mt-1 flex items-center justify-between">
              <span>{stats.total}</span>
              <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                READ-ONLY
              </span>
            </div>
          </div>

          <div className="bg-neutral-950/70 border border-neutral-800 rounded-lg p-3">
            <div className="text-[11px] text-neutral-400 font-mono">
              {isThai ? 'อนุมัติและดำเนินการแล้ว (Committed)' : 'Approved & Committed'}
            </div>
            <div className="text-xl font-bold text-emerald-400 font-mono mt-1">{stats.committed}</div>
          </div>

          <div className="bg-neutral-950/70 border border-neutral-800 rounded-lg p-3">
            <div className="text-[11px] text-neutral-400 font-mono">
              {isThai ? 'ปฏิเสธโดยผู้ควบคุม (Operator Rejected)' : 'Rejected by Operator'}
            </div>
            <div className="text-xl font-bold text-amber-400 font-mono mt-1">{stats.rejected}</div>
          </div>

          <div className="bg-neutral-950/70 border border-neutral-800 rounded-lg p-3">
            <div className="text-[11px] text-neutral-400 font-mono">
              {isThai ? 'บล็อกอัตโนมัติ (Fail-Closed Blocked)' : 'Fail-Closed Blocked'}
            </div>
            <div className="text-xl font-bold text-rose-400 font-mono mt-1">{stats.failClosed}</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isThai
                ? 'ค้นหา รหัสเหตุการณ์, แฮช, ผู้ตรวจสอบ, เหตุผล...'
                : 'Search Event ID, hash, approver, rationale...'
            }
            className="w-full pl-9 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 font-mono focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end text-xs font-mono">
          <span className="text-neutral-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            {isThai ? 'สถานะผลลัพธ์:' : 'Outcome:'}
          </span>
          {[
            { id: 'ALL', label: isThai ? 'ทั้งหมด' : 'All' },
            { id: 'COMMITTED_TO_DISPATCH_SERVICE', label: isThai ? 'อนุมัติแล้ว' : 'Committed' },
            { id: 'REJECTED_DROPPED', label: isThai ? 'ปฏิเสธ' : 'Rejected' },
            { id: 'FAIL_CLOSED_BLOCKED', label: 'Fail-Closed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-2.5 py-1 rounded transition cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
              }`}
            >
              {tab.label}
            </button>
          ))}

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1 text-xs text-neutral-300 font-mono focus:border-cyan-500 focus:outline-none"
          >
            <option value="ALL">{isThai ? 'ทุกระดับความเสี่ยง (All Risk)' : 'All Risk Tiers'}</option>
            <option value="LOW">{isThai ? 'ความเสี่ยงต่ำ (LOW)' : 'LOW Risk'}</option>
            <option value="MEDIUM">{isThai ? 'ความเสี่ยงปานกลาง (MEDIUM)' : 'MEDIUM Risk'}</option>
            <option value="HIGH">{isThai ? 'ความเสี่ยงสูง (HIGH)' : 'HIGH Risk'}</option>
          </select>
        </div>
      </div>

      {/* Main Master-Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Read-Only Event Log Table / Stream (7 Cols) */}
        <div className="lg:col-span-7 bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase font-mono">
                  {isThai
                    ? `ลำดับเหตุการณ์การตัดสินใจ (${filteredRecords.length} รายการ)`
                    : `Immutable Decision Event Stream (${filteredRecords.length})`}
                </h3>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {merkleVerified
                  ? isThai
                    ? 'ยืนยันแฮช SHA-256 ครบถ้วน'
                    : 'SHA-256 Chain Intact'
                  : 'Checking...'}
              </span>
            </div>

            <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
              {filteredRecords.map((rec, index) => {
                const isSelected = selectedRecord?.auditEventId === rec.auditEventId;
                return (
                  <div
                    key={rec.auditEventId}
                    onClick={() => setSelectedRecordId(rec.auditEventId)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-neutral-950 border-cyan-500/60 ring-1 ring-cyan-500/30'
                        : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-400 text-[10px]">
                          BLK #{records.length - index}
                        </span>
                        <span className="text-cyan-400 font-bold">{rec.auditEventId}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            rec.riskTier === 'HIGH'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : rec.riskTier === 'MEDIUM'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {rec.riskTier}
                        </span>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          rec.executionStatus === 'COMMITTED_TO_DISPATCH_SERVICE'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : rec.executionStatus === 'FAIL_CLOSED_BLOCKED'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {getStatusLabel(rec.executionStatus)}
                      </span>
                    </div>

                    {/* Recommendation & Rationale Summary */}
                    <div className="text-xs text-neutral-200 font-medium">
                      {rec.aiRecommendation.details}
                    </div>

                    <div className="text-[11px] text-neutral-400 bg-neutral-900/90 border border-neutral-800/80 rounded p-2 font-sans">
                      <strong className="text-cyan-400 font-mono">
                        {isThai ? 'เหตุผลการตัดสินใจ (Rationale): ' : 'Decision Rationale: '}
                      </strong>
                      {rec.humanDecision.note ||
                        (isThai ? 'ผ่านการตรวจสอบตามนโยบายความปลอดภัย' : 'Verified under standard policy bounds.')}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[10px] font-mono text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-neutral-400" />
                        {new Date(rec.timestampIso).toLocaleString(isThai ? 'th-TH' : 'en-US')}
                      </span>
                      <span>
                        {isThai ? 'ผู้ตรวจสอบ:' : 'Approver:'}{' '}
                        <strong className="text-neutral-300">{rec.humanDecision.approverId || 'SYSTEM'}</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between text-[11px] font-mono text-neutral-500">
            <span>{isThai ? 'สถานะการจัดเก็บ: WORM (เขียนครั้งเดียว อ่านได้หลายครั้ง)' : 'Storage Mode: WORM (Write-Once-Read-Many)'}</span>
            {onNavigateToGovernance && (
              <button
                onClick={onNavigateToGovernance}
                className="text-cyan-400 hover:underline cursor-pointer"
              >
                {isThai ? 'ไปยังหน้าอนุมัติ AEON Guardian →' : 'Go to AEON Guardian Approval →'}
              </button>
            )}
          </div>
        </div>

        {/* Right: Cryptographic Evidence & Decision Rationale Inspector (5 Cols) */}
        <div className="lg:col-span-5 bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 flex flex-col justify-between">
          {selectedRecord ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold">
                    {isThai ? 'รายละเอียดใบรับรองการตัดสินใจ' : 'DECISION CERTIFICATE INSPECTOR'}
                  </span>
                  <h4 className="text-base font-bold text-white font-mono mt-0.5">
                    {selectedRecord.auditEventId}
                  </h4>
                </div>
                <span className="px-2 py-1 rounded bg-neutral-950 border border-neutral-700 text-[10px] font-mono text-neutral-300">
                  READ-ONLY RECORD
                </span>
              </div>

              {/* Timestamp & Policy Metadata */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3.5 space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-neutral-500">{isThai ? 'เวลาประทับ (ISO):' : 'Timestamp (ISO):'}</span>
                  <span className="text-neutral-200">{selectedRecord.timestampIso}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">{isThai ? 'รหัสคำขอ (Request ID):' : 'Request ID:'}</span>
                  <span className="text-cyan-300">{selectedRecord.requestId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">{isThai ? 'เวอร์ชันนโยบาย:' : 'Policy Version:'}</span>
                  <span className="text-emerald-400">{selectedRecord.policyVersion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">{isThai ? 'ระดับความเสี่ยง:' : 'Risk Classification:'}</span>
                  <span className="text-amber-400 font-bold">{selectedRecord.riskTier}</span>
                </div>
              </div>

              {/* AI Advisory Proposal Section */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3.5 space-y-2">
                <div className="text-[11px] font-mono font-bold text-cyan-400 uppercase">
                  {isThai ? '1. ข้อเสนอแนะจากเอไอ (AI Advisory Proposal)' : '1. AI Advisory Proposal'}
                </div>
                <div className="text-xs font-mono text-white">
                  Action: <span className="text-cyan-300">{selectedRecord.aiRecommendation.action}</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  {selectedRecord.aiRecommendation.details}
                </p>
                <div className="grid grid-cols-3 gap-2 pt-2 text-[11px] font-mono">
                  <div className="bg-neutral-900 p-2 rounded border border-neutral-800">
                    <span className="text-neutral-500 block">{isThai ? 'จำนวนออเดอร์' : 'Orders'}</span>
                    <span className="text-white font-bold">{selectedRecord.aiRecommendation.orderCount}</span>
                  </div>
                  <div className="bg-neutral-900 p-2 rounded border border-neutral-800">
                    <span className="text-neutral-500 block">{isThai ? 'โซนต้นทาง' : 'Source'}</span>
                    <span className="text-rose-300 font-bold">{selectedRecord.aiRecommendation.sourceZone}</span>
                  </div>
                  <div className="bg-neutral-900 p-2 rounded border border-neutral-800">
                    <span className="text-neutral-500 block">{isThai ? 'โซนปลายทาง' : 'Target'}</span>
                    <span className="text-emerald-300 font-bold">{selectedRecord.aiRecommendation.targetZone}</span>
                  </div>
                </div>
              </div>

              {/* Human Decision Rationale & Outcome */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3.5 space-y-2">
                <div className="text-[11px] font-mono font-bold text-amber-400 uppercase">
                  {isThai
                    ? '2. เหตุผลประกอบการตัดสินใจและผลลัพธ์ (Rationale & Outcome)'
                    : '2. Decision Rationale & Outcome Status'}
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-neutral-400">{isThai ? 'การตัดสินใจ:' : 'Human Decision:'}</span>
                  <span className="text-white font-bold">
                    {getDecisionLabel(selectedRecord.humanDecision.action)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-neutral-400">{isThai ? 'ผู้มีอำนาจตัดสินใจ:' : 'Approver ID:'}</span>
                  <span className="text-cyan-300">{selectedRecord.humanDecision.approverId || 'N/A'}</span>
                </div>
                <div className="p-2.5 bg-neutral-900 rounded border border-neutral-800 text-xs text-neutral-200 leading-relaxed">
                  <span className="text-[10px] font-mono text-neutral-400 block mb-1">
                    {isThai ? 'บันทึกเหตุผลของผู้ตรวจสอบ:' : 'Recorded Rationale / Attestation Note:'}
                  </span>
                  “{selectedRecord.humanDecision.note}”
                </div>
              </div>

              {/* Cryptographic Hashes */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3.5 space-y-2 font-mono text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-cyan-400" />
                    Evidence SHA-256 Hash:
                  </span>
                  <button
                    onClick={() => handleCopyHash(selectedRecord.auditEventId, selectedRecord.evidenceHash)}
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === selectedRecord.auditEventId ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copy
                      </>
                    )}
                  </button>
                </div>
                <div className="p-2 bg-neutral-900 rounded text-[10px] text-neutral-300 break-all border border-neutral-800">
                  {selectedRecord.evidenceHash}
                </div>

                {selectedRecord.cryptographicSignature && (
                  <div className="pt-1">
                    <span className="text-neutral-400 block mb-1">Ed25519 Signature:</span>
                    <div className="p-2 bg-neutral-900 rounded text-[10px] text-emerald-400 break-all border border-neutral-800">
                      {selectedRecord.cryptographicSignature}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <div className="mt-4 pt-3 border-t border-neutral-800 text-[11px] font-mono text-neutral-500 flex items-center justify-between">
            <span>AEON Ledger Protocol v2.6</span>
            <span className="text-emerald-400">TAMPER-PROOF</span>
          </div>
        </div>
      </div>
    </div>
  );
};
