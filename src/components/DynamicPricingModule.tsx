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

interface DynamicPricingModuleProps {
  city: CityMarketplace;
}

export const DynamicPricingModule: React.FC<DynamicPricingModuleProps> = ({ city }) => {
  const { language } = useLanguage();
  const isThai = language === 'th';

  const [selectedZoneId, setSelectedZoneId] = useState<string>(city.zones[3]?.id || city.zones[0]?.id);
  const [distanceKm, setDistanceKm] = useState<number>(4.8);
  const [demandSpikePct, setDemandSpikePct] = useState<number>(38);
  const [courierDeficitPct, setCourierDeficitPct] = useState<number>(25);
  const [enforceCeiling, setEnforceCeiling] = useState<boolean>(true);
  const [pricingLogs, setPricingLogs] = useState<PricingAuditLog[]>(INITIAL_PRICING_LOGS);
  const [justLoggedQuoteId, setJustLoggedQuoteId] = useState<string | null>(null);

  const selectedZone = city.zones.find((z) => z.id === selectedZoneId) || city.zones[0];

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
