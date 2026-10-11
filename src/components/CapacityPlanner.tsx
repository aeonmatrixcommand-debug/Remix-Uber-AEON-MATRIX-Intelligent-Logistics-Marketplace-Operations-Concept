import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
  AreaChart,
  Area,
} from 'recharts';
import {
  Users,
  Clock,
  Sliders,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  Shield,
  ArrowUpRight,
  Zap,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Layers,
  Plus,
  Minus,
} from 'lucide-react';
import { CityMarketplace, SubMarketZone } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface CapacityPlannerProps {
  city: CityMarketplace;
  onNavigateToGovernance?: (advisoryData?: any) => void;
}

interface ZoneSimulationResult {
  zone: SubMarketZone;
  supplyDeltaPct: number;
  baselineCouriers: number;
  projectedCouriers: number;
  courierDiff: number;
  demandReqMin: number;
  baselineImbalancePct: number;
  projectedImbalancePct: number;
  baselineLatencyMin: number;
  projectedLatencyMin: number;
  latencyDeltaMin: number;
  pickupMatchLatencyMin: number;
  merchantDwellMin: number;
  lastMileTransitMin: number;
  baselineCancelRiskPct: number;
  projectedCancelRiskPct: number;
  projectedBacklog: number;
  projectedStatus: 'STABLE' | 'DEGRADED' | 'CRITICAL';
}

export const CapacityPlanner: React.FC<CapacityPlannerProps> = ({
  city,
  onNavigateToGovernance = () => {},
}) => {
  const { language } = useLanguage();
  const isThai = language === 'th';

  // Per-neighborhood courier supply adjustment percentage (-50% to +100%)
  const [zoneSupplyAdjustments, setZoneSupplyAdjustments] = useState<Record<string, number>>({});
  const [selectedFocusZoneId, setSelectedFocusZoneId] = useState<string>(
    city.zones[3]?.id || city.zones[0]?.id
  );
  const [activePreset, setActivePreset] = useState<string>('deficit_mitigation');

  // Initialize with a meaningful default simulation ("Deficit Mitigation") when city changes
  useEffect(() => {
    const initialMap: Record<string, number> = {};
    city.zones.forEach((z) => {
      if (z.status === 'CRITICAL') {
        initialMap[z.id] = 35;
      } else if (z.status === 'DEGRADED') {
        initialMap[z.id] = 20;
      } else if (z.imbalancePct > 10) {
        initialMap[z.id] = -10;
      } else {
        initialMap[z.id] = 0;
      }
    });
    setZoneSupplyAdjustments(initialMap);
    setSelectedFocusZoneId(city.zones[3]?.id || city.zones[0]?.id);
    setActivePreset('deficit_mitigation');
  }, [city.cluster]);

  const handleZoneSliderChange = (zoneId: string, newDeltaPct: number) => {
    setActivePreset('custom');
    setZoneSupplyAdjustments((prev) => ({
      ...prev,
      [zoneId]: Math.max(-50, Math.min(100, newDeltaPct)),
    }));
  };

  const applyPresetScenario = (
    preset: 'baseline' | 'deficit_mitigation' | 'peak_mobilization' | 'supply_shock'
  ) => {
    setActivePreset(preset);
    const nextMap: Record<string, number> = {};
    city.zones.forEach((z) => {
      if (preset === 'baseline') {
        nextMap[z.id] = 0;
      } else if (preset === 'deficit_mitigation') {
        if (z.status === 'CRITICAL') nextMap[z.id] = 35;
        else if (z.status === 'DEGRADED') nextMap[z.id] = 20;
        else if (z.imbalancePct > 10) nextMap[z.id] = -10;
        else nextMap[z.id] = 0;
      } else if (preset === 'peak_mobilization') {
        nextMap[z.id] = 30;
      } else if (preset === 'supply_shock') {
        nextMap[z.id] = -25;
      }
    });
    setZoneSupplyAdjustments(nextMap);
  };

  // Compute queuing & spatial dispatch latency impact per neighborhood
  const zoneResults: ZoneSimulationResult[] = city.zones.map((z) => {
    const supplyDeltaPct = zoneSupplyAdjustments[z.id] ?? 0;
    const baselineCouriers = z.availableCouriers;
    const projectedCouriers = Math.max(25, Math.round(baselineCouriers * (1 + supplyDeltaPct / 100)));
    const courierDiff = projectedCouriers - baselineCouriers;

    const baselineImbalancePct = z.imbalancePct;
    const projectedImbalancePct = +(
      ((projectedCouriers - z.demandReqMin) / z.demandReqMin) *
      100
    ).toFixed(1);

    // Queuing & Spatial Density Physics Model for Fulfillment Latency:
    // 1. Spatial pickup match time scales inversely with square root of courier density
    // 2. Queueing delay decreases nonlinearly as supply/demand ratio improves
    const supplyRatio = projectedCouriers / Math.max(1, baselineCouriers);
    const spatialDensityFactor = 1 / Math.sqrt(Math.max(0.35, supplyRatio));

    // Queue pressure penalty when demand exceeds projected couriers
    const baselineDeficit = Math.max(0, -baselineImbalancePct);
    const projectedDeficit = Math.max(0, -projectedImbalancePct);
    const queueReliefMinutes = (baselineDeficit - projectedDeficit) * 0.22;

    const rawProjectedLatency =
      z.medianSlaMinutes * (0.55 + 0.45 * spatialDensityFactor) - queueReliefMinutes;

    const projectedLatencyMin = +Math.max(14.5, Math.min(58.0, rawProjectedLatency)).toFixed(1);
    const latencyDeltaMin = +(projectedLatencyMin - z.medianSlaMinutes).toFixed(1);

    // Decompose projected latency into 3 operational stages
    const pickupMatchLatencyMin = +(projectedLatencyMin * 0.28).toFixed(1);
    const merchantDwellMin = +(projectedLatencyMin * 0.32).toFixed(1);
    const lastMileTransitMin = +(
      projectedLatencyMin -
      pickupMatchLatencyMin -
      merchantDwellMin
    ).toFixed(1);

    // Projected Cancellation Risk & Unmatched Backlog
    const latencyRatio = projectedLatencyMin / z.medianSlaMinutes;
    const projectedCancelRiskPct = +Math.max(
      0.4,
      Math.min(14.5, z.cancellationRiskPct * Math.pow(latencyRatio, 1.65))
    ).toFixed(1);

    const projectedBacklog = Math.max(
      0,
      Math.round(Math.max(0, z.demandReqMin - projectedCouriers) * 0.65)
    );

    let projectedStatus: SubMarketZone['status'] = 'STABLE';
    if (projectedImbalancePct < -25 || projectedLatencyMin > 33) {
      projectedStatus = 'CRITICAL';
    } else if (projectedImbalancePct < -12 || projectedLatencyMin > 27) {
      projectedStatus = 'DEGRADED';
    }

    return {
      zone: z,
      supplyDeltaPct,
      baselineCouriers,
      projectedCouriers,
      courierDiff,
      demandReqMin: z.demandReqMin,
      baselineImbalancePct,
      projectedImbalancePct,
      baselineLatencyMin: z.medianSlaMinutes,
      projectedLatencyMin,
      latencyDeltaMin,
      pickupMatchLatencyMin,
      merchantDwellMin,
      lastMileTransitMin,
      baselineCancelRiskPct: z.cancellationRiskPct,
      projectedCancelRiskPct,
      projectedBacklog,
      projectedStatus,
    };
  });

  // Aggregate City-Wide Metrics
  const totalBaselineCouriers = zoneResults.reduce((acc, r) => acc + r.baselineCouriers, 0);
  const totalProjectedCouriers = zoneResults.reduce((acc, r) => acc + r.projectedCouriers, 0);
  const totalCourierDiff = totalProjectedCouriers - totalBaselineCouriers;

  const avgBaselineLatency = +(
    zoneResults.reduce((acc, r) => acc + r.baselineLatencyMin, 0) / zoneResults.length
  ).toFixed(1);
  const avgProjectedLatency = +(
    zoneResults.reduce((acc, r) => acc + r.projectedLatencyMin, 0) / zoneResults.length
  ).toFixed(1);
  const avgLatencyDelta = +(avgProjectedLatency - avgBaselineLatency).toFixed(1);

  const avgBaselineCancel = +(
    zoneResults.reduce((acc, r) => acc + r.baselineCancelRiskPct, 0) / zoneResults.length
  ).toFixed(1);
  const avgProjectedCancel = +(
    zoneResults.reduce((acc, r) => acc + r.projectedCancelRiskPct, 0) / zoneResults.length
  ).toFixed(1);

  const zonesMeetingSlaCount = zoneResults.filter((r) => r.projectedLatencyMin <= 25.0).length;

  const focusedResult =
    zoneResults.find((r) => r.zone.id === selectedFocusZoneId) || zoneResults[0];

  // Chart 1 Data: Neighborhood Comparison (Baseline vs Projected Latency)
  const barChartData = zoneResults.map((r) => ({
    zoneId: r.zone.id,
    neighborhood: r.zone.name,
    baselineLatency: r.baselineLatencyMin,
    projectedLatency: r.projectedLatencyMin,
    targetSla: 25.0,
    couriers: r.projectedCouriers,
  }));

  // Chart 2 Data: Response Curve for Focused Neighborhood across supply adjustments (-40% to +80%)
  const sensitivityCurveData = [-40, -25, -10, 0, 15, 30, 45, 60, 80].map((pct) => {
    const simCouriers = Math.max(
      25,
      Math.round(focusedResult.baselineCouriers * (1 + pct / 100))
    );
    const ratio = simCouriers / Math.max(1, focusedResult.baselineCouriers);
    const densityFactor = 1 / Math.sqrt(Math.max(0.35, ratio));
    const simImbalance = ((simCouriers - focusedResult.demandReqMin) / focusedResult.demandReqMin) * 100;
    const baseDef = Math.max(0, -focusedResult.baselineImbalancePct);
    const simDef = Math.max(0, -simImbalance);
    const relief = (baseDef - simDef) * 0.22;
    const simLatency = +Math.max(
      14.5,
      Math.min(58.0, focusedResult.baselineLatencyMin * (0.55 + 0.45 * densityFactor) - relief)
    ).toFixed(1);

    return {
      adjustmentLabel: `${pct >= 0 ? '+' : ''}${pct}%`,
      couriers: simCouriers,
      projectedLatency: simLatency,
      targetSla: 25.0,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-neutral-900/75 border border-neutral-800 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <Users className="w-4 h-4" />
            <span>
              {isThai
                ? 'โมดูลวางแผนกำลังพล: CAPACITY PLANNER & LATENCY SIMULATOR'
                : 'CAPACITY PLANNER · NEIGHBORHOOD SUPPLY & FULFILLMENT LATENCY SIMULATOR'}
            </span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span className="text-amber-400">
              {isThai ? 'เฉพาะการจำลองเชิงเปรียบเทียบ' : 'ADVISORY SIMULATION'}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight mt-1">
            {isThai
              ? 'การจำลองปรับระดับอุปทานไรเดอร์รายย่านและผลกระทบต่อเวลาจัดส่ง (Fulfillment Latency)'
              : 'Neighborhood Courier Supply Allocation & Projected Fulfillment Latency'}
          </h2>
          <p className="text-xs text-neutral-400 mt-1 max-w-4xl leading-relaxed">
            {isThai
              ? 'จำลองการเพิ่มหรือลดจำนวนไรเดอร์ในแต่ละย่าน (Neighborhood Zone) เพื่อวิเคราะห์ผลกระทบต่อเวลาจับคู่งาน เวลารอรับอาหารที่ร้าน และเวลาจัดส่งรวม (Fulfillment Latency) ก่อนส่งแผนปรับสมดุลกำลังพลให้ AEON Guardian อนุมัติ'
              : 'Simulate adjusting active courier supply levels across individual neighborhoods to model real-time queuing relief, pickup match distance compression, and projected fulfillment SLA latency.'}
          </p>
        </div>

        {/* Preset Allocation Scenarios */}
        <div className="flex flex-wrap items-center gap-1.5 bg-neutral-950 p-1.5 rounded-lg border border-neutral-800 shrink-0">
          <button
            onClick={() => applyPresetScenario('deficit_mitigation')}
            className={`px-2.5 py-1.5 rounded text-xs font-mono transition cursor-pointer ${
              activePreset === 'deficit_mitigation'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {isThai ? 'แก้จุดวิกฤต (+35% โซนขาดแคลน)' : 'Target Deficit Relief'}
          </button>
          <button
            onClick={() => applyPresetScenario('peak_mobilization')}
            className={`px-2.5 py-1.5 rounded text-xs font-mono transition cursor-pointer ${
              activePreset === 'peak_mobilization'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {isThai ? 'ระดมไรเดอร์ช่วงพีค (+30% ทุกย่าน)' : 'Peak Mobilization (+30%)'}
          </button>
          <button
            onClick={() => applyPresetScenario('supply_shock')}
            className={`px-2.5 py-1.5 rounded text-xs font-mono transition cursor-pointer ${
              activePreset === 'supply_shock'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {isThai ? 'จำลองไรเดอร์ขาดแคลน (-25%)' : 'Supply Drop Stress (-25%)'}
          </button>
          <button
            onClick={() => applyPresetScenario('baseline')}
            className={`px-2.5 py-1.5 rounded text-xs font-mono transition cursor-pointer flex items-center gap-1 ${
              activePreset === 'baseline'
                ? 'bg-neutral-800 text-white border border-neutral-600 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <RotateCcw className="w-3 h-3" />
            <span>{isThai ? 'ค่าเริ่มต้น' : 'Reset (0%)'}</span>
          </button>
        </div>
      </div>

      {/* Top 4 Summary Impact Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Cluster-Wide Fleet Capacity */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
          <div className="text-[11px] font-mono text-neutral-400 uppercase">
            {isThai ? 'จำนวนไรเดอร์จำลองรวมทั้งเมือง' : 'Simulated Cluster Courier Supply'}
          </div>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-2xl font-bold font-mono text-cyan-400">
              {totalProjectedCouriers.toLocaleString()}
            </span>
            <span
              className={`text-xs font-mono font-bold ${
                totalCourierDiff > 0
                  ? 'text-emerald-400'
                  : totalCourierDiff < 0
                  ? 'text-rose-400'
                  : 'text-neutral-400'
              }`}
            >
              {totalCourierDiff > 0 ? `+${totalCourierDiff}` : totalCourierDiff} drv vs.{' '}
              {totalBaselineCouriers.toLocaleString()}
            </span>
          </div>
          <div className="text-[11px] text-neutral-500 font-mono mt-1">
            {isThai ? `ครอบคลุม ${city.zones.length} ย่านปฏิบัติการ` : `Across ${city.zones.length} neighborhood zones`}
          </div>
        </div>

        {/* Card 2: Projected Mean Fulfillment Latency */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
          <div className="text-[11px] font-mono text-neutral-400 uppercase">
            {isThai ? 'เวลาจัดส่งคาดการณ์เฉลี่ย (Fulfillment Latency)' : 'Projected Mean Fulfillment Latency'}
          </div>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-2xl font-bold font-mono text-white">
              {avgProjectedLatency} min
            </span>
            <span
              className={`text-xs font-mono font-bold flex items-center gap-0.5 ${
                avgLatencyDelta < 0
                  ? 'text-emerald-400'
                  : avgLatencyDelta > 0
                  ? 'text-rose-400'
                  : 'text-neutral-400'
              }`}
            >
              {avgLatencyDelta < 0 ? (
                <TrendingDown className="w-3.5 h-3.5" />
              ) : avgLatencyDelta > 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : null}
              {avgLatencyDelta > 0 ? `+${avgLatencyDelta}m` : `${avgLatencyDelta}m`} (Base: {avgBaselineLatency}m)
            </span>
          </div>
          <div className="text-[11px] text-neutral-500 font-mono mt-1">
            {isThai ? 'เกณฑ์เป้าหมาย SLA มาตรฐาน: ≤ 25.0 นาที' : 'Target SLA Benchmark: ≤ 25.0 min'}
          </div>
        </div>

        {/* Card 3: Neighborhood SLA Compliance */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
          <div className="text-[11px] font-mono text-neutral-400 uppercase">
            {isThai ? 'ย่านที่ผ่านเกณฑ์ SLA (≤ 25 นาที)' : 'Neighborhoods Meeting 25m SLA'}
          </div>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {zonesMeetingSlaCount} / {zoneResults.length}
            </span>
            <span className="text-xs font-mono text-neutral-300">
              {Math.round((zonesMeetingSlaCount / zoneResults.length) * 100)}%{' '}
              {isThai ? 'ของพื้นที่' : 'Zone Coverage'}
            </span>
          </div>
          <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${(zonesMeetingSlaCount / zoneResults.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Card 4: Projected Order Cancellation Risk */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
          <div className="text-[11px] font-mono text-neutral-400 uppercase">
            {isThai ? 'ความเสี่ยงคำสั่งซื้อถูกยกเลิกคาดการณ์' : 'Projected Cancellation Risk'}
          </div>
          <div className="flex items-baseline justify-between mt-1.5">
            <span
              className={`text-2xl font-bold font-mono ${
                avgProjectedCancel <= 2.5 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {avgProjectedCancel}%
            </span>
            <span className="text-xs font-mono text-neutral-400">
              vs. {avgBaselineCancel}% {isThai ? 'ก่อนปรับ' : 'Baseline'}
            </span>
          </div>
          <div className="text-[11px] text-neutral-500 font-mono mt-1">
            {isThai ? 'ลดลงเมื่อเวลารอจับคู่ไรเดอร์สั้นลง' : 'Driven by pickup queue compression'}
          </div>
        </div>
      </div>

      {/* Main Workspace: Left Neighborhood Sliders (6 Cols) + Right Visual Latency Analytics (6 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Per-Neighborhood Supply Sliders & Latency Impact Cards */}
        <div className="lg:col-span-6 bg-neutral-900/85 border border-neutral-800 rounded-xl p-4 space-y-3.5">
          <div className="flex items-center justify-between pb-2.5 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-white">
                {isThai
                  ? 'ปรับระดับอุปทานไรเดอร์รายย่าน (Neighborhood Supply Controls)'
                  : 'Adjust Courier Supply by Neighborhood'}
              </h3>
            </div>
            <span className="text-[11px] font-mono text-neutral-400">
              {isThai ? 'คลิกที่ย่านเพื่อดูกราฟความไว' : 'Click zone to inspect curve'}
            </span>
          </div>

          <div className="space-y-3">
            {zoneResults.map((item) => {
              const isFocused = item.zone.id === selectedFocusZoneId;
              const isImproved = item.latencyDeltaMin < 0;
              const isWorse = item.latencyDeltaMin > 0;

              return (
                <div
                  key={item.zone.id}
                  onClick={() => setSelectedFocusZoneId(item.zone.id)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer ${
                    isFocused
                      ? 'bg-neutral-950 border-cyan-500/60 ring-1 ring-cyan-500/30'
                      : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  {/* Top Row: Neighborhood Name, Demand, and Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          item.projectedStatus === 'STABLE'
                            ? 'bg-emerald-400'
                            : item.projectedStatus === 'DEGRADED'
                            ? 'bg-amber-400'
                            : 'bg-rose-500 animate-pulse'
                        }`}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-white">
                            {item.zone.id}
                          </span>
                          <span className="text-xs font-semibold text-neutral-200">
                            {item.zone.name}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-neutral-400 mt-0.5">
                          {isThai ? 'อุปสงค์:' : 'Demand:'}{' '}
                          <strong className="text-neutral-200">{item.demandReqMin} req/min</strong>
                          <span className="mx-1.5 text-neutral-600">·</span>
                          <span>
                            {isThai ? 'สมดุลใหม่:' : 'Projected Balance:'}{' '}
                            <strong
                              className={
                                item.projectedImbalancePct < 0
                                  ? 'text-rose-400'
                                  : 'text-emerald-400'
                              }
                            >
                              {item.projectedImbalancePct > 0
                                ? `+${item.projectedImbalancePct}%`
                                : `${item.projectedImbalancePct}%`}
                            </strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Projected Fulfillment Latency Readout */}
                    <div className="text-right font-mono">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-xs text-neutral-500 line-through">
                          {item.baselineLatencyMin}m
                        </span>
                        <span
                          className={`text-base font-bold ${
                            item.projectedLatencyMin <= 25.0
                              ? 'text-emerald-400'
                              : item.projectedLatencyMin <= 31.0
                              ? 'text-amber-300'
                              : 'text-rose-400'
                          }`}
                        >
                          {item.projectedLatencyMin}m
                        </span>
                        {item.latencyDeltaMin !== 0 && (
                          <span
                            className={`text-[11px] font-bold ${
                              isImproved ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            ({item.latencyDeltaMin > 0 ? `+${item.latencyDeltaMin}m` : `${item.latencyDeltaMin}m`})
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        {isThai ? 'เวลาจัดส่งคาดการณ์ (SLA)' : 'Projected Fulfillment Latency'}
                      </div>
                    </div>
                  </div>

                  {/* Interactive Supply Slider + Step Controls */}
                  <div className="mt-3 pt-2.5 border-t border-neutral-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-neutral-300">
                        {isThai ? 'อุปทานไรเดอร์ในย่าน:' : 'Neighborhood Courier Supply:'}{' '}
                        <strong className="text-cyan-400">{item.projectedCouriers}</strong>{' '}
                        <span className="text-neutral-500">
                          (Base: {item.baselineCouriers})
                        </span>
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleZoneSliderChange(item.zone.id, item.supplyDeltaPct - 5);
                          }}
                          className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer"
                          title="Decrease supply by 5%"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span
                          className={`min-w-[52px] text-center font-bold ${
                            item.supplyDeltaPct > 0
                              ? 'text-emerald-400'
                              : item.supplyDeltaPct < 0
                              ? 'text-rose-400'
                              : 'text-neutral-400'
                          }`}
                        >
                          {item.supplyDeltaPct > 0
                            ? `+${item.supplyDeltaPct}%`
                            : `${item.supplyDeltaPct}%`}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleZoneSliderChange(item.zone.id, item.supplyDeltaPct + 5);
                          }}
                          className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer"
                          title="Increase supply by 5%"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <input
                      type="range"
                      min={-50}
                      max={100}
                      step={5}
                      value={item.supplyDeltaPct}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        handleZoneSliderChange(item.zone.id, Number(e.target.value))
                      }
                      className="w-full accent-cyan-500 cursor-pointer"
                    />

                    {/* Latency Stage Decomposition Bar */}
                    <div className="grid grid-cols-3 gap-2 pt-1 text-[10px] font-mono text-neutral-400">
                      <div className="bg-neutral-900/90 px-2 py-1 rounded border border-neutral-800/80 flex justify-between">
                        <span>{isThai ? 'รับงาน:' : 'Pickup:'}</span>
                        <span className="text-cyan-300 font-semibold">{item.pickupMatchLatencyMin}m</span>
                      </div>
                      <div className="bg-neutral-900/90 px-2 py-1 rounded border border-neutral-800/80 flex justify-between">
                        <span>{isThai ? 'รอที่ร้าน:' : 'Prep Dwell:'}</span>
                        <span className="text-amber-300 font-semibold">{item.merchantDwellMin}m</span>
                      </div>
                      <div className="bg-neutral-900/90 px-2 py-1 rounded border border-neutral-800/80 flex justify-between">
                        <span>{isThai ? 'วิ่งส่ง:' : 'Last-Mile:'}</span>
                        <span className="text-emerald-300 font-semibold">{item.lastMileTransitMin}m</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Latency Comparison Charts & Governance Handoff */}
        <div className="lg:col-span-6 space-y-5 flex flex-col justify-between">
          {/* Chart 1: Baseline vs Projected Latency by Neighborhood */}
          <div className="bg-neutral-900/85 border border-neutral-800 rounded-xl p-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span>
                    {isThai
                      ? 'เปรียบเทียบเวลาจัดส่งก่อนและหลังปรับอุปทานรายย่าน (นาที)'
                      : 'Baseline vs. Projected Fulfillment Latency by Neighborhood (Min)'}
                  </span>
                </h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {isThai
                    ? 'เส้นประสีเขียวมรกตแสดงเกณฑ์มาตรฐาน SLA เป้าหมายที่ 25.0 นาที'
                    : 'Dashed emerald line denotes the 25.0-minute target SLA threshold'}
                </p>
              </div>
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={barChartData} margin={{ top: 10, right: 16, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis
                    dataKey="zoneId"
                    stroke="#a3a3a3"
                    tick={{ fill: '#a3a3a3', fontSize: 11, fontFamily: 'monospace' }}
                  />
                  <YAxis
                    stroke="#a3a3a3"
                    tick={{ fill: '#a3a3a3', fontSize: 11, fontFamily: 'monospace' }}
                    domain={[0, 45]}
                    unit="m"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0a0a0a',
                      borderColor: '#262626',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                  <ReferenceLine
                    y={25}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    label={{
                      value: '25m SLA Target',
                      position: 'insideTopRight',
                      fill: '#10b981',
                      fontSize: 10,
                    }}
                  />
                  <Bar
                    dataKey="baselineLatency"
                    name={isThai ? 'เวลาจัดส่งเดิม (Baseline m)' : 'Baseline Latency (min)'}
                    fill="#525252"
                    radius={[4, 4, 0, 0]}
                    barSize={24}
                  />
                  <Bar
                    dataKey="projectedLatency"
                    name={isThai ? 'เวลาจัดส่งคาดการณ์ (Projected m)' : 'Projected Latency (min)'}
                    fill="#06b6d4"
                    radius={[4, 4, 0, 0]}
                    barSize={24}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Supply-to-Latency Sensitivity Curve for Focused Neighborhood */}
          <div className="bg-neutral-900/85 border border-neutral-800 rounded-xl p-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>
                    {isThai
                      ? `กราฟความไวของเวลาจัดส่งต่อจำนวนไรเดอร์: ${focusedResult.zone.id} (${focusedResult.zone.name})`
                      : `Fulfillment Latency Sensitivity Curve: ${focusedResult.zone.id} (${focusedResult.zone.name})`}
                  </span>
                </h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {isThai
                    ? 'แสดงความสัมพันธ์แบบไม่เชิงเส้นระหว่างการเพิ่มไรเดอร์ (-40% ถึง +80%) และการลดลงของเวลาจัดส่ง'
                    : 'Illustrates non-linear queuing compression as neighborhood courier supply scales from -40% to +80%'}
                </p>
              </div>
              <span className="text-xs font-mono text-cyan-400 font-bold">
                {focusedResult.projectedCouriers} drv → {focusedResult.projectedLatencyMin}m
              </span>
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={sensitivityCurveData}
                  margin={{ top: 10, right: 16, left: -10, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="latencyCurveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis
                    dataKey="adjustmentLabel"
                    stroke="#a3a3a3"
                    tick={{ fill: '#a3a3a3', fontSize: 11, fontFamily: 'monospace' }}
                  />
                  <YAxis
                    stroke="#a3a3a3"
                    tick={{ fill: '#a3a3a3', fontSize: 11, fontFamily: 'monospace' }}
                    domain={[12, 48]}
                    unit="m"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0a0a0a',
                      borderColor: '#262626',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                    }}
                  />
                  <ReferenceLine y={25} stroke="#10b981" strokeDasharray="4 4" />
                  <Area
                    type="monotone"
                    dataKey="projectedLatency"
                    name={isThai ? 'เวลาจัดส่งคาดการณ์ (นาที)' : 'Projected Latency (min)'}
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    fill="url(#latencyCurveGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Governance Handoff Panel */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-neutral-300 font-bold flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-amber-400" />
                {isThai
                  ? 'การส่งแผนจัดสรรกำลังพลให้ AEON Guardian ตรวจสอบ'
                  : 'AEON Guardian Capacity Reallocation Attestation'}
              </span>
              <span className="text-amber-400">POL-FLEET-REBALANCE-V2</span>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              {isThai
                ? `แผนจำลองนี้ปรับจำนวนไรเดอร์สุทธิ ${
                    totalCourierDiff >= 0 ? `+${totalCourierDiff}` : totalCourierDiff
                  } คน ส่งผลให้เวลาจัดส่งเฉลี่ยเปลี่ยนจาก ${avgBaselineLatency} นาที เป็น ${avgProjectedLatency} นาที ระบบจะไม่ส่งสัญญาณเรียกไรเดอร์อัตโนมัติจนกว่าผู้ดูแลจะอนุมัติผ่าน AEON Guardian`
                : `Simulated capacity plan adjusts cluster supply by ${
                    totalCourierDiff >= 0 ? `+${totalCourierDiff}` : totalCourierDiff
                  } couriers, shifting mean fulfillment latency from ${avgBaselineLatency}m to ${avgProjectedLatency}m. Dispatch incentives remain strictly advisory until human sign-off.`}
            </p>

            <button
              onClick={() =>
                onNavigateToGovernance({
                  module: 'CapacityPlanner',
                  cityCluster: city.cluster,
                  totalProjectedCouriers,
                  totalCourierDiff,
                  avgBaselineLatency,
                  avgProjectedLatency,
                  zoneBreakdown: zoneResults.map((r) => ({
                    zoneId: r.zone.id,
                    supplyDeltaPct: r.supplyDeltaPct,
                    projectedCouriers: r.projectedCouriers,
                    projectedLatencyMin: r.projectedLatencyMin,
                  })),
                })
              }
              className="w-full py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-mono font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span>
                {isThai
                  ? `ส่งแผนจำลองกำลังพล (${avgProjectedLatency}m SLA) ไปยัง AEON Guardian`
                  : `Submit Neighborhood Capacity Plan (${avgProjectedLatency}m Projected SLA) to AEON Guardian`}
              </span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
