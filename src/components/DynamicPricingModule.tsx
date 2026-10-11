import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShieldAlert,
  ShieldCheck,
  Percent,
  Sliders,
  FileCheck,
  Clock,
  History,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { CityMarketplace, PricingAuditLog, SurgeCategory } from '../types';
import { INITIAL_PRICING_LOGS } from '../data/mockData';
import { useLanguage } from '../context/LanguageContext';
import { ConceptualDynamicPricing } from './ConceptualDynamicPricing';

interface DynamicPricingModuleProps {
  city: CityMarketplace;
  onNavigateToGovernance?: (advisoryData?: any) => void;
}

export const DynamicPricingModule: React.FC<DynamicPricingModuleProps> = ({
  city,
  onNavigateToGovernance = () => {},
}) => {
  const { language } = useLanguage();
  const isThai = language === 'th';

  const [selectedZoneId, setSelectedZoneId] = useState<string>(city.zones[3]?.id || city.zones[0]?.id);
  const [distanceKm, setDistanceKm] = useState<number>(4.8);
  const [demandSpikePct, setDemandSpikePct] = useState<number>(38);
  const [courierDeficitPct, setCourierDeficitPct] = useState<number>(25);
  const [enforceCeiling, setEnforceCeiling] = useState<boolean>(true);
  const [pricingLogs, setPricingLogs] = useState<PricingAuditLog[]>(INITIAL_PRICING_LOGS);
  const [justLoggedQuoteId, setJustLoggedQuoteId] = useState<string | null>(null);

  // Operator Approval Queue State per Zone (strictly advisory until operator approves/rejects)
  const [zoneOperatorDecisions, setZoneOperatorDecisions] = useState<
    Record<
      string,
      {
        status: 'PENDING_OPERATOR_APPROVAL' | 'APPROVED' | 'MODIFIED_APPROVED' | 'REJECTED_HOLD_BASELINE';
        approvedMultiplier?: number;
        operatorNote?: string;
        decidedAt?: string;
      }
    >
  >({});
  const [operatorNoteInput, setOperatorNoteInput] = useState<string>(
    'Verified courier deficit & predicted SLA breach risk; approving advisory surge cap.'
  );
  const [customMultiplierOverride, setCustomMultiplierOverride] = useState<number | null>(null);

  const selectedZone = city.zones.find((z) => z.id === selectedZoneId) || city.zones[0];

  // Analyze real-time Courier Availability, Order Volume per Zone, and Predicted Delivery Times (SLA)
  // to suggest optimal advisory pricing adjustments for every zone
  const zonePricingAdvisories = city.zones.map((z) => {
    const orderVolumeRatio = z.demandReqMin / 115; // normalized around 115 req/min
    const courierSupplyRatio = z.availableCouriers / Math.max(1, z.demandReqMin * 1.65);
    const predictedDeliveryMin = z.medianSlaMinutes;
    const slaExcessMin = Math.max(0, predictedDeliveryMin - 25); // 25m target SLA

    // Compute optimal suggested multiplier from the 3 real-time factors
    const availabilityComponent =
      courierSupplyRatio < 1.0 ? +((1.0 - courierSupplyRatio) * 0.65).toFixed(2) : -0.08;
    const volumeComponent =
      orderVolumeRatio > 1.0 ? +((orderVolumeRatio - 1.0) * 0.45).toFixed(2) : 0;
    const predictedSlaComponent = +(slaExcessMin * 0.035).toFixed(2);

    const rawSuggested = +(1.0 + availabilityComponent + volumeComponent + predictedSlaComponent).toFixed(2);
    const boundedSuggested = Math.max(0.9, Math.min(enforceCeiling ? 2.5 : 3.2, rawSuggested));

    const baseOrderFee = 8.25;
    const suggestedFeeUsd = +(baseOrderFee * boundedSuggested).toFixed(2);
    const projectedSlaImprovementMin =
      boundedSuggested > 1.05
        ? -Math.min(slaExcessMin * 0.65, (boundedSuggested - 1.0) * 6.5).toFixed(1)
        : 0;

    const decision = zoneOperatorDecisions[z.id] || {
      status: 'PENDING_OPERATOR_APPROVAL' as const,
    };

    return {
      zone: z,
      courierAvailability: z.availableCouriers,
      orderVolumeReqMin: z.demandReqMin,
      activeOrders: z.activeOrders,
      predictedDeliveryMin,
      availabilityComponent,
      volumeComponent,
      predictedSlaComponent,
      suggestedMultiplier: boundedSuggested,
      suggestedFeeUsd,
      projectedSlaImprovementMin,
      decision,
    };
  });

  const handleOperatorPricingDecision = (
    zoneId: string,
    action: 'APPROVED' | 'MODIFIED_APPROVED' | 'REJECTED_HOLD_BASELINE',
    suggestedMult: number
  ) => {
    const targetZone = city.zones.find((z) => z.id === zoneId) || selectedZone;
    const finalMultiplier =
      action === 'REJECTED_HOLD_BASELINE'
        ? 1.0
        : action === 'MODIFIED_APPROVED' && customMultiplierOverride !== null
        ? customMultiplierOverride
        : suggestedMult;

    const timestamp = new Date().toISOString();
    setZoneOperatorDecisions((prev) => ({
      ...prev,
      [zoneId]: {
        status: action,
        approvedMultiplier: finalMultiplier,
        operatorNote: operatorNoteInput,
        decidedAt: timestamp.slice(11, 19) + ' UTC',
      },
    }));

    // Also append to the immutable pricing audit ledger
    const newQuoteId = `OP-ADV-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTotal = +(8.25 * finalMultiplier).toFixed(2);
    const newLog: PricingAuditLog = {
      auditId: `PRC-OP-${Math.floor(10000 + Math.random() * 90000)}`,
      quoteId: newQuoteId,
      zoneId: targetZone.id,
      timestamp,
      demandRate: targetZone.demandReqMin,
      couriersAvail: targetZone.availableCouriers,
      imbalancePct: targetZone.imbalancePct,
      surgeMultiplier: finalMultiplier,
      totalCustomerPrice: newTotal,
      courierSharePct: finalMultiplier > 1.0 ? 82 : 75,
      policyVersion: 'POL-ADVISORY-PRICING-HITL-V3',
      evidenceHash: `sha256:op-${targetZone.id.toLowerCase()}-${finalMultiplier.toFixed(2)}-${Date.now()
        .toString(16)
        .slice(-6)}`,
      guardianCompliance:
        action === 'REJECTED_HOLD_BASELINE'
          ? 'COMPLIANT'
          : finalMultiplier >= 2.5
          ? 'CEILING_ENFORCED'
          : 'COMPLIANT',
    };
    setPricingLogs((prev) => [newLog, ...prev]);
    setJustLoggedQuoteId(`${newQuoteId} (${zoneId}: ${action})`);
    setTimeout(() => setJustLoggedQuoteId(null), 3500);
  };

  // Dynamic calculations
  const baseFareUsd = 3.5;
  const distanceRateUsdPerKm = 1.35;
  const distanceFareUsd = +(distanceKm * distanceRateUsdPerKm).toFixed(2);
  const unadjustedSubtotalUsd = +(baseFareUsd + distanceFareUsd).toFixed(2);

  // Raw surge calculation based on simulated imbalance
  // If demand is high and courier deficit is high, multiplier increases
  const effectiveImbalance = selectedZone.imbalancePct - (demandSpikePct * 0.8) - (courierDeficitPct * 0.7);

  let rawMultiplier = 1.0;
  if (effectiveImbalance < -10) {
    rawMultiplier = +(1.0 + Math.abs(effectiveImbalance) * 0.022).toFixed(2);
  } else if (effectiveImbalance > 15) {
    // Off-peak surplus discount (stimulate volume)
    rawMultiplier = 0.9;
  }

  // Ceiling check: capped at 2.50x
  const ceilingMax = 2.5;
  const priceCeilingCapped = enforceCeiling && rawMultiplier > ceilingMax;
  const appliedMultiplier = priceCeilingCapped ? ceilingMax : rawMultiplier;

  let surgeCategory: SurgeCategory = 'NORMAL';
  if (appliedMultiplier < 1.0) surgeCategory = 'OFF_PEAK_DISCOUNT';
  else if (priceCeilingCapped) surgeCategory = 'CEILING_CAPPED';
  else if (appliedMultiplier >= 1.8) surgeCategory = 'SURGE_PEAK';
  else if (appliedMultiplier > 1.1) surgeCategory = 'SURGE_MODERATE';

  const surgeAdjustmentAmountUsd = +(unadjustedSubtotalUsd * (appliedMultiplier - 1.0)).toFixed(2);
  const totalPriceUsd = +(unadjustedSubtotalUsd + surgeAdjustmentAmountUsd).toFixed(2);

  // Split: Courier takes 75% base + 100% of positive surge bonus
  const courierShareUsd = +(
    unadjustedSubtotalUsd * 0.75 +
    Math.max(0, surgeAdjustmentAmountUsd) * 0.9
  ).toFixed(2);
  const marketplaceFeeUsd = +(totalPriceUsd - courierShareUsd).toFixed(2);
  const courierSharePct = Math.round((courierShareUsd / totalPriceUsd) * 100);

  const evidenceHash = `sha256:${Math.abs(effectiveImbalance).toFixed(0)}e97${distanceKm.toFixed(1)}f4581fb${appliedMultiplier.toFixed(2)}01da42`;

  const handleCommitPricingToAudit = () => {
    const newQuoteId = `QUO-20260925-${Math.floor(100 + Math.random() * 900)}`;
    const newLog: PricingAuditLog = {
      auditId: `PRC-AUD-${Math.floor(10000 + Math.random() * 90000)}`,
      quoteId: newQuoteId,
      zoneId: selectedZone.id,
      timestamp: new Date().toISOString(),
      demandRate: Math.round(selectedZone.demandReqMin * (1 + demandSpikePct / 100)),
      couriersAvail: Math.round(selectedZone.availableCouriers * (1 - courierDeficitPct / 100)),
      imbalancePct: +effectiveImbalance.toFixed(1),
      surgeMultiplier: appliedMultiplier,
      totalCustomerPrice: totalPriceUsd,
      courierSharePct,
      policyVersion: 'POL-DYNAMIC-PRICING-V3',
      evidenceHash,
      guardianCompliance: priceCeilingCapped ? 'CEILING_ENFORCED' : 'COMPLIANT',
    };

    setPricingLogs([newLog, ...pricingLogs]);
    setJustLoggedQuoteId(newQuoteId);
    setTimeout(() => setJustLoggedQuoteId(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-neutral-900/60 p-4 rounded-xl border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-mono text-xs font-semibold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30">
              {isThai ? 'โมดูลกำหนดราคา' : 'DYNAMIC PRICING ENGINE'}
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {isThai ? 'ระบบกำหนดราคาพลวัตและควบคุมเซิร์จ (Dynamic Pricing & Surge Control)' : 'Marketplace Dynamic Pricing & Surge Control'}
            </h2>
          </div>
          <p className="text-xs text-neutral-400 mt-1 max-w-3xl leading-relaxed">
            {isThai
              ? 'คำนวณราคาแบบเรียลไทม์ตามอุปสงค์ อุปทานของไรเดอร์ และระยะทางการจัดส่ง ควบคุมด้วยเพดานราคาตามการ์เดียน พอลิซี (POL-SURGE-CEILING-V2) พร้อมบันทึกหลักฐานลงสมุดบัญชีตรวจสอบแบบไม่สามารถแก้ไขได้'
              : 'Evaluates real-time marketplace demand, courier availability deficit, and route distance vectors. Applies dynamic surge multipliers, off-peak volume discounts, and price-ceiling safeguards with immutable audit logging.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded bg-neutral-800 text-neutral-300 font-mono text-xs border border-neutral-700 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isThai ? 'เพดานราคา 2.5x เปิดใช้งาน' : 'Price Ceiling 2.5x Active'}</span>
          </span>
        </div>
      </div>

      {/* Real-Time Zone Pricing Advisory & Operator Approval Console */}
      <div className="bg-neutral-900/85 border border-neutral-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10px] font-bold flex items-center gap-1">
                <Lock className="w-3 h-3" />
                {isThai
                  ? 'โหมดให้คำแนะนำเท่านั้น • ห้ามปรับราคาอัตโนมัติโดยไม่มีมนุษย์อนุมัติ'
                  : 'ADVISORY-ONLY MODE • AUTO-EXECUTION BLOCKED'}
              </span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-[10px]">
                POL-ADVISORY-PRICING-HITL-V3
              </span>
            </div>
            <h3 className="text-base font-bold text-white mt-1">
              {isThai
                ? `คิวอนุมัติการปรับราคาพลวัตรายโซนสำหรับผู้ควบคุม (Operator Pricing Approval Queue) — ${city.cityName}`
                : `Real-Time Zone Pricing Advisory & Operator Approval Queue — ${city.cityName}`}
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              {isThai
                ? 'วิเคราะห์ 3 ปัจจัยแบบเรียลไทม์ ได้แก่ (1) ความพร้อมของไรเดอร์ (2) ปริมาณคำสั่งซื้อต่อโซน และ (3) เวลาจัดส่งที่คาดการณ์ (Predicted SLA) เพื่อเสนอแนะตัวคูณราคาที่เหมาะสมที่สุดให้ผู้ควบคุมพิจารณาอนุมัติ'
                : 'Continuously evaluates (1) Courier Availability, (2) Order Volume per Zone, and (3) Predicted Delivery Times (SLA) to recommend optimal zone pricing adjustments for human operator approval.'}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start">
            <button
              onClick={() =>
                onNavigateToGovernance({
                  source: 'DYNAMIC_PRICING_OPERATOR_QUEUE',
                  zone: selectedZone.id,
                  imbalance: selectedZone.imbalancePct,
                  demand: selectedZone.demandReqMin,
                  couriers: selectedZone.availableCouriers,
                })
              }
              className="px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 font-mono text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>{isThai ? 'ส่งตรวจสอบที่ AEON Guardian' : 'Escalate to AEON Guardian'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Zone Advisory Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400 text-[10px] uppercase">
                <th className="pb-2">{isThai ? 'โซนปฏิบัติการ' : 'Zone'}</th>
                <th className="pb-2 text-right">{isThai ? 'ไรเดอร์ที่พร้อม' : 'Courier Avail'}</th>
                <th className="pb-2 text-right">{isThai ? 'ปริมาณออเดอร์' : 'Order Volume'}</th>
                <th className="pb-2 text-right">{isThai ? 'เวลาส่งคาดการณ์' : 'Predicted SLA'}</th>
                <th className="pb-2 text-right text-cyan-400">
                  {isThai ? 'ตัวคูณที่แนะนำ' : 'Advisory Multiplier'}
                </th>
                <th className="pb-2 text-right">{isThai ? 'ค่าส่งที่แนะนำ' : 'Suggested Fee'}</th>
                <th className="pb-2 text-center">{isThai ? 'สถานะการอนุมัติ' : 'Operator Status'}</th>
                <th className="pb-2 text-right">{isThai ? 'การตัดสินใจของผู้ควบคุม' : 'Operator Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {zonePricingAdvisories.map((item) => {
                const isSelected = item.zone.id === selectedZoneId;
                const status = item.decision.status;
                return (
                  <tr
                    key={item.zone.id}
                    onClick={() => setSelectedZoneId(item.zone.id)}
                    className={`transition cursor-pointer ${
                      isSelected ? 'bg-cyan-950/25 text-white' : 'hover:bg-neutral-900/60 text-neutral-300'
                    }`}
                  >
                    <td className="py-3">
                      <div className="font-bold text-white">{item.zone.id}</div>
                      <div className="text-[10px] text-neutral-500 font-sans">{item.zone.name}</div>
                    </td>
                    <td className="py-3 text-right">
                      <div className="text-cyan-400 font-bold">{item.courierAvailability} drv</div>
                      <div className="text-[10px] text-neutral-500">
                        {item.availabilityComponent >= 0
                          ? `+${item.availabilityComponent}x deficit`
                          : `${item.availabilityComponent}x surplus`}
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <div className="text-white font-semibold">{item.orderVolumeReqMin} req/m</div>
                      <div className="text-[10px] text-neutral-500">
                        {item.activeOrders} active (+{item.volumeComponent}x)
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <div
                        className={`font-bold ${
                          item.predictedDeliveryMin > 30
                            ? 'text-rose-400'
                            : item.predictedDeliveryMin > 25
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {item.predictedDeliveryMin} min
                      </div>
                      <div className="text-[10px] text-neutral-500">
                        Target 25m (+{item.predictedSlaComponent}x)
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-xs ${
                          item.suggestedMultiplier >= 1.5
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : item.suggestedMultiplier > 1.05
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : item.suggestedMultiplier < 1.0
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {item.suggestedMultiplier.toFixed(2)}x
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="text-emerald-400 font-bold">${item.suggestedFeeUsd.toFixed(2)}</div>
                      <div className="text-[10px] text-neutral-500">
                        {item.projectedSlaImprovementMin < 0
                          ? `${item.projectedSlaImprovementMin}m SLA est.`
                          : 'Baseline SLA'}
                      </div>
                    </td>
                    <td className="py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          status === 'APPROVED' || status === 'MODIFIED_APPROVED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : status === 'REJECTED_HOLD_BASELINE'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {status === 'PENDING_OPERATOR_APPROVAL'
                          ? isThai
                            ? 'รออนุมัติ (1.00x คงเดิม)'
                            : 'AWAITING OPERATOR (1.00x ACTIVE)'
                          : status === 'REJECTED_HOLD_BASELINE'
                          ? isThai
                            ? 'ปฏิเสธ (คงค่า 1.00x)'
                            : 'REJECTED (HELD 1.00x)'
                          : `${status} (${item.decision.approvedMultiplier?.toFixed(2)}x)`}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div
                        className="flex items-center justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() =>
                            handleOperatorPricingDecision(
                              item.zone.id,
                              'APPROVED',
                              item.suggestedMultiplier
                            )
                          }
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition cursor-pointer"
                        >
                          {isThai ? 'อนุมัติ' : 'Approve'}
                        </button>
                        <button
                          onClick={() =>
                            handleOperatorPricingDecision(
                              item.zone.id,
                              'REJECTED_HOLD_BASELINE',
                              item.suggestedMultiplier
                            )
                          }
                          className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-rose-950/80 border border-neutral-700 hover:border-rose-500/40 text-neutral-300 hover:text-rose-300 text-[10px] transition cursor-pointer"
                        >
                          {isThai ? 'คงราคา 1.0x' : 'Hold 1.0x'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Operator Custom Override & Rationale Bar */}
        <div className="bg-neutral-950 p-3.5 rounded-lg border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-mono text-neutral-400 uppercase block">
              {isThai
                ? `บันทึกเหตุผลของผู้ควบคุมสำหรับโซน ${selectedZone.id}:`
                : `Operator Attestation Rationale for Zone ${selectedZone.id}:`}
            </label>
            <input
              type="text"
              value={operatorNoteInput}
              onChange={(e) => setOperatorNoteInput(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2 self-end">
            <div className="font-mono text-xs">
              <label className="text-[10px] text-neutral-400 block">
                {isThai ? 'กำหนดตัวคูณเอง:' : 'Custom Override:'}
              </label>
              <input
                type="number"
                min={0.85}
                max={2.5}
                step={0.05}
                value={
                  customMultiplierOverride ??
                  (zonePricingAdvisories.find((a) => a.zone.id === selectedZoneId)
                    ?.suggestedMultiplier || 1.25)
                }
                onChange={(e) => setCustomMultiplierOverride(Number(e.target.value))}
                className="w-24 bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-xs font-mono text-cyan-400 font-bold"
              />
            </div>

            <button
              onClick={() => {
                const adv = zonePricingAdvisories.find((a) => a.zone.id === selectedZoneId);
                handleOperatorPricingDecision(
                  selectedZone.id,
                  'MODIFIED_APPROVED',
                  adv ? adv.suggestedMultiplier : 1.25
                );
              }}
              className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-mono font-bold transition cursor-pointer mt-3.5"
            >
              {isThai ? 'อนุมัติด้วยค่าที่แก้ไข' : 'Approve Custom Override'}
            </button>
          </div>
        </div>
      </div>

      {/* Conceptual 4-Factor Dynamic Pricing Model & Worked Examples */}
      <ConceptualDynamicPricing
        city={city}
        selectedZone={selectedZone}
        onNavigateToGovernance={onNavigateToGovernance}
      />

      {/* Main Grid: Parameters & Calculations vs Live Price Quote */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Calculation Parameters & Real-Time Adjusters (7 Cols) */}
        <div className="lg:col-span-7 bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                {isThai ? 'พารามิเตอร์การคำนวณราคาพลวัต' : 'Dynamic Pricing Input Parameters'}
              </h3>
            </div>
            <span className="text-[10px] font-mono text-neutral-400">
              Cluster: {city.cluster}
            </span>
          </div>

          {/* Zone Selector */}
          <div>
            <label className="text-[11px] font-mono text-neutral-400 block mb-1.5">
              {isThai ? 'เลือกโซนเป้าหมาย:' : 'Select Target Operational Zone:'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {city.zones.map((zone) => (
                <button
                  key={zone.id}
                  onClick={() => setSelectedZoneId(zone.id)}
                  className={`p-2 rounded text-left font-mono text-xs transition cursor-pointer border ${
                    selectedZoneId === zone.id
                      ? 'bg-cyan-950/40 border-cyan-400 text-white shadow-sm'
                      : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border-neutral-800'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>{zone.id}</span>
                    <span className="text-[9px] text-cyan-400">{zone.demandReqMin} req</span>
                  </div>
                  <div className="text-[9px] text-neutral-500 font-sans truncate">{zone.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Distance Slider */}
          <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-neutral-300">
                {isThai ? 'ระยะทางการจัดส่ง (Distance Vector):' : 'Order Route Distance Vector:'}
              </span>
              <span className="text-cyan-400 font-bold">{distanceKm.toFixed(1)} km</span>
            </div>
            <input
              type="range"
              min={1.0}
              max={20.0}
              step={0.2}
              value={distanceKm}
              onChange={(e) => setDistanceKm(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-neutral-500">
              <span>1.0 km ({isThai ? 'ในย่าน' : 'Hyperlocal'})</span>
              <span>10.0 km ({isThai ? 'ข้ามเขต' : 'Cross-Zone'})</span>
              <span>20.0 km ({isThai ? 'ระยะไกล' : 'Long-Haul Corridor'})</span>
            </div>
          </div>

          {/* Demand Surge Slider */}
          <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-neutral-300">
                {isThai ? 'ความต้องการสั่งพุ่งสูง (Surge Inflow Spike):' : 'Real-Time Demand Surge Spike:'}
              </span>
              <span className="text-rose-400 font-bold">+{demandSpikePct}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={demandSpikePct}
              onChange={(e) => setDemandSpikePct(Number(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-neutral-500">
              <span>0% ({isThai ? 'เกณฑ์ปกติ' : 'Baseline'})</span>
              <span>+50% ({isThai ? 'ฝนตก / พีคอาหารเย็น' : 'Lunch/Dinner Rush'})</span>
              <span>+100% ({isThai ? 'วิกฤตพายุ / คอนเสิร์ต' : 'Severe Shock'})</span>
            </div>
          </div>

          {/* Courier Deficit Slider */}
          <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-neutral-300">
                {isThai ? 'ภาวะขาดแคลนไรเดอร์ (Courier Pool Deficit):' : 'Courier Fleet Supply Deficit:'}
              </span>
              <span className="text-amber-400 font-bold">-{courierDeficitPct}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={60}
              value={courierDeficitPct}
              onChange={(e) => setCourierDeficitPct(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-neutral-500">
              <span>0% ({isThai ? 'กองยานเต็ม' : 'Full Supply'})</span>
              <span>-30% ({isThai ? 'เปลี่ยนกะเวลา' : 'Shift Changeover'})</span>
              <span>-60% ({isThai ? 'ขาดแคลนรุนแรง' : 'Critical Shortage'})</span>
            </div>
          </div>

          {/* Price Ceiling Policy Toggle */}
          <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-lg border border-neutral-800 text-xs font-mono">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enforceCeiling}
                onChange={(e) => setEnforceCeiling(e.target.checked)}
                className="rounded bg-neutral-800 border-neutral-700 text-cyan-500 focus:ring-0"
              />
              <span className="text-neutral-200">
                {isThai ? 'บังคับใช้เพดานราคาเซิร์จสูงสุด 2.50x (การ์เดียน พอลิซี)' : 'Enforce 2.50x Surge Ceiling Policy (AEON Guardian POL-SURGE-CEILING-V2)'}
              </span>
            </label>
            <span className="text-[10px] text-emerald-400 font-bold">
              {enforceCeiling ? (isThai ? 'เปิดใช้งาน' : 'ENFORCED') : (isThai ? 'ปิด' : 'UNRESTRICTED')}
            </span>
          </div>
        </div>

        {/* Right Column: Calculated Dynamic Quote & Revenue Split (5 Cols) */}
        <div className="lg:col-span-5 bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  {isThai ? 'การแจกแจงราคาและรายได้แบบเรียลไทม์' : 'Dynamic Fare & Revenue Split'}
                </h3>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  surgeCategory === 'OFF_PEAK_DISCOUNT'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    : surgeCategory === 'CEILING_CAPPED'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : surgeCategory === 'SURGE_PEAK'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : surgeCategory === 'SURGE_MODERATE'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-neutral-800 text-neutral-300'
                }`}
              >
                {surgeCategory === 'OFF_PEAK_DISCOUNT'
                  ? (isThai ? 'ส่วนลดช่วงว่าง 0.90x' : 'OFF-PEAK DISCOUNT')
                  : surgeCategory === 'CEILING_CAPPED'
                  ? (isThai ? 'ติดเพดานราคา 2.50x' : 'CEILING CAPPED (2.50x)')
                  : (isThai ? `เซิร์จ ${appliedMultiplier}x` : `SURGE ${appliedMultiplier}x`)}
              </span>
            </div>

            {/* Total Price Display */}
            <div className="mt-3 p-4 bg-neutral-950 rounded-lg border border-neutral-800 text-center">
              <div className="text-[11px] font-mono text-neutral-500 uppercase">
                {isThai ? 'ราคารวมที่ลูกค้าชำระ (Estimated Customer Fare)' : 'Total Estimated Customer Price'}
              </div>
              <div className="text-3xl font-bold font-mono text-emerald-400 mt-1">
                ${totalPriceUsd.toFixed(2)}
              </div>
              <div className="text-xs text-neutral-400 font-mono mt-1 flex items-center justify-center gap-2">
                <span>{isThai ? 'ตัวคูณสุทธิ:' : 'Net Multiplier:'} <strong className="text-cyan-400">{appliedMultiplier}x</strong></span>
                <span>•</span>
                <span>{isThai ? 'ระยะทาง:' : 'Distance:'} <strong className="text-white">{distanceKm.toFixed(1)} km</strong></span>
              </div>
            </div>

            {/* Itemized Line Items */}
            <div className="mt-3 space-y-2 text-xs font-mono">
              <div className="p-2.5 bg-neutral-950 rounded border border-neutral-800 space-y-1.5">
                <div className="flex justify-between text-neutral-300">
                  <span className="text-neutral-400">{isThai ? 'ค่าบริการพื้นฐาน (Base Booking):' : 'Base Booking Fare:'}</span>
                  <span>${baseFareUsd.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neutral-300">
                  <span className="text-neutral-400">{isThai ? `ค่าระยะทาง (${distanceKm.toFixed(1)} km @ $1.35/km):` : `Distance Fare (${distanceKm.toFixed(1)} km @ $1.35/km):`}</span>
                  <span>${distanceFareUsd.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neutral-300 pt-1 border-t border-neutral-800">
                  <span className="text-neutral-400">{isThai ? 'ค่าโดยสารมาตรฐานก่อนปรับเซิร์จ:' : 'Unadjusted Subtotal:'}</span>
                  <span className="font-semibold">${unadjustedSubtotalUsd.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-amber-300 font-semibold pt-1 border-t border-neutral-800">
                  <span>
                    {appliedMultiplier < 1.0
                      ? (isThai ? 'ส่วนลดกระตุ้นความต้องการ (Off-Peak):' : 'Off-Peak Demand Stimulus:')
                      : (isThai ? `ส่วนเพิ่มเซิร์จ (${appliedMultiplier}x):` : `Dynamic Surge Surcharge (${appliedMultiplier}x):`)}
                  </span>
                  <span>
                    {surgeAdjustmentAmountUsd >= 0 ? `+$${surgeAdjustmentAmountUsd.toFixed(2)}` : `-$${Math.abs(surgeAdjustmentAmountUsd).toFixed(2)}`}
                  </span>
                </div>
              </div>

              {/* Earnings Split Box */}
              <div className="p-3 bg-neutral-950 rounded border border-cyan-900/50 space-y-2">
                <div className="text-[11px] font-bold text-neutral-300 flex items-center justify-between">
                  <span>{isThai ? 'การจัดสรรรายได้ (Earnings Allocation)' : 'Platform Revenue Allocation:'}</span>
                  <span className="text-cyan-400">{courierSharePct}% {isThai ? 'คนขับ' : 'Courier'}</span>
                </div>

                {/* Progress bar split */}
                <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden flex">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${courierSharePct}%` }} />
                  <div className="h-full bg-cyan-600 transition-all" style={{ width: `${100 - courierSharePct}%` }} />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div className="bg-neutral-900 p-2 rounded">
                    <div className="text-neutral-500">{isThai ? 'รายได้ไรเดอร์' : 'Courier Payout'}</div>
                    <div className="text-emerald-400 font-bold text-sm mt-0.5">${courierShareUsd.toFixed(2)}</div>
                    <div className="text-[9px] text-neutral-500 mt-0.5">{isThai ? 'ฐาน 75% + โบนัส 90%' : '75% Base + 90% Surge'}</div>
                  </div>
                  <div className="bg-neutral-900 p-2 rounded">
                    <div className="text-neutral-500">{isThai ? 'ส่วนแบ่งแพลตฟอร์ม' : 'Marketplace Fee'}</div>
                    <div className="text-cyan-300 font-bold text-sm mt-0.5">${marketplaceFeeUsd.toFixed(2)}</div>
                    <div className="text-[9px] text-neutral-500 mt-0.5">{100 - courierSharePct}% Take Rate</div>
                  </div>
                </div>
              </div>

              {/* Invariant Evidence Manifest */}
              <div className="p-2.5 bg-neutral-950 rounded border border-neutral-800 text-[10px] text-neutral-400 space-y-0.5">
                <div className="flex justify-between">
                  <span>Policy Version:</span>
                  <span className="text-neutral-200">POL-DYNAMIC-PRICING-V3</span>
                </div>
                <div className="truncate">
                  <span>Proof Hash: </span>
                  <code className="text-cyan-400">{evidenceHash}</code>
                </div>
              </div>
            </div>
          </div>

          {/* Commit Action */}
          <div className="mt-4 pt-3 border-t border-neutral-800 space-y-2">
            <button
              onClick={handleCommitPricingToAudit}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-600/20"
            >
              <FileCheck className="w-4 h-4" />
              <span>
                {isThai ? 'บันทึกใบเสนอราคาลงสมุดบัญชีตรวจสอบ' : 'Commit & Log to Immutable Pricing Audit Ledger'}
              </span>
            </button>

            {justLoggedQuoteId && (
              <div className="p-2 bg-emerald-950/40 border border-emerald-800/60 rounded text-center text-xs font-mono text-emerald-300">
                ✓ {justLoggedQuoteId} {isThai ? 'บันทึกสำเร็จพร้อมหลักฐานแฮช' : 'successfully committed to audit ledger.'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Historical Pricing Audit Ledger Table */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
              {isThai ? 'สมุดบัญชีตรวจสอบราคาพลวัต (Dynamic Pricing Immutable Audit Ledger)' : 'Dynamic Pricing Immutable Audit Ledger'}
            </h3>
          </div>
          <span className="text-[11px] font-mono text-neutral-400">
            {pricingLogs.length} {isThai ? 'รายการบันทึกที่รับรองแล้ว' : 'Attested Pricing Decisions'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400 text-[11px]">
                <th className="pb-2">Audit ID & Quote ID</th>
                <th className="pb-2">Zone</th>
                <th className="pb-2 text-right">Demand / Supply</th>
                <th className="pb-2 text-right">Imbalance</th>
                <th className="pb-2 text-right">Surge Multiplier</th>
                <th className="pb-2 text-right">Customer Price</th>
                <th className="pb-2 text-right">Courier Share</th>
                <th className="pb-2 text-center">Compliance</th>
                <th className="pb-2">Evidence Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {pricingLogs.map((log) => (
                <tr key={log.auditId} className="hover:bg-neutral-800/40 transition">
                  <td className="py-2.5 font-bold text-white">
                    <div>{log.auditId}</div>
                    <div className="text-[10px] text-cyan-400 font-normal">{log.quoteId}</div>
                  </td>
                  <td className="py-2.5 text-neutral-300">{log.zoneId}</td>
                  <td className="py-2.5 text-right text-neutral-300">
                    {log.demandRate} / {log.couriersAvail}
                  </td>
                  <td
                    className={`py-2.5 text-right font-bold ${
                      log.imbalancePct < 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {log.imbalancePct}%
                  </td>
                  <td className="py-2.5 text-right text-amber-400 font-bold">
                    {log.surgeMultiplier}x
                  </td>
                  <td className="py-2.5 text-right font-bold text-emerald-400">
                    ${log.totalCustomerPrice.toFixed(2)}
                  </td>
                  <td className="py-2.5 text-right text-neutral-300">{log.courierSharePct}%</td>
                  <td className="py-2.5 text-center">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        log.guardianCompliance === 'COMPLIANT'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : log.guardianCompliance === 'CEILING_ENFORCED'
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {log.guardianCompliance}
                    </span>
                  </td>
                  <td className="py-2.5 text-[10px] text-neutral-500 truncate max-w-[120px]">
                    {log.evidenceHash}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
