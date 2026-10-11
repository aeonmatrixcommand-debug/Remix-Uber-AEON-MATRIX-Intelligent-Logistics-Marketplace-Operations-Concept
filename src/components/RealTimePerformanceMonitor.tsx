import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  Activity,
  Clock,
  Users,
  CheckCircle2,
  Star,
  Radio,
  Play,
  Pause,
  Sparkles,
  ArrowUpRight,
  Layers,
  Gauge,
  Sliders,
} from 'lucide-react';
import { CityMarketplace } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface RealTimePerformanceMonitorProps {
  city: CityMarketplace;
  onNavigateToGovernance?: (advisoryData?: any) => void;
}

type TelemetryTimeWindow = '15m' | '1h' | '4h';
type OperatingRegime = 'nominal' | 'prep_bottleneck' | 'peak_surge' | 'optimized_recovery';

interface StreamTickPoint {
  timestamp: string;
  avgFulfillmentMin: number;
  p95FulfillmentMin: number;
  courierUtilizationPct: number;
  slaAdherencePct: number;
  estimatedCsatScore: number; // 1.00 - 5.00
  csatPositivePct: number;
}

export const RealTimePerformanceMonitor: React.FC<RealTimePerformanceMonitorProps> = ({
  city,
  onNavigateToGovernance,
}) => {
  const { language } = useLanguage();
  const isThai = language === 'th';

  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(true);
  const [timeWindow, setTimeWindow] = useState<TelemetryTimeWindow>('15m');
  const [regime, setRegime] = useState<OperatingRegime>('nominal');
  const [selectedZoneId, setSelectedZoneId] = useState<string>(city.zones[0]?.id || 'Z-01');
  const [tickCounter, setTickCounter] = useState<number>(0);

  // Regime modifiers for realistic interactive KPI behavior
  const regimeConfig: Record<
    OperatingRegime,
    {
      labelEn: string;
      labelTh: string;
      fulfillDeltaMin: number;
      utilizationDeltaPct: number;
      slaDeltaPct: number;
      csatDelta: number;
    }
  > = {
    nominal: {
      labelEn: 'Nominal Telemetry Stream',
      labelTh: 'สตรีมข้อมูลสถานะปกติ',
      fulfillDeltaMin: 0,
      utilizationDeltaPct: 0,
      slaDeltaPct: 0,
      csatDelta: 0,
    },
    prep_bottleneck: {
      labelEn: 'Merchant Kitchen Prep Dwell (+5.8m)',
      labelTh: 'คอขวดร้านค้าเตรียมอาหารล่าช้า (+5.8 นาที)',
      fulfillDeltaMin: 5.8,
      utilizationDeltaPct: 8.4,
      slaDeltaPct: -9.5,
      csatDelta: -0.38,
    },
    peak_surge: {
      labelEn: 'Peak Dinner Order Surge (+35% Load)',
      labelTh: 'คำสั่งซื้อพุ่งสูงช่วงมื้อเย็น (+35%)',
      fulfillDeltaMin: 4.2,
      utilizationDeltaPct: 12.6,
      slaDeltaPct: -6.8,
      csatDelta: -0.24,
    },
    optimized_recovery: {
      labelEn: 'Rebalanced Fleet Posture (SLA Recovery)',
      labelTh: 'หลังปรับสมดุลกองยานไรเดอร์ (ฟื้นฟู SLA)',
      fulfillDeltaMin: -3.1,
      utilizationDeltaPct: 2.2,
      slaDeltaPct: 4.1,
      csatDelta: 0.19,
    },
  };

  // Base KPIs anchored to the selected city
  const baseFulfillmentMin = city.avgSlaMinutes;
  const baseUtilizationPct = useMemo(() => {
    const rawRatio = (city.activeOrders / Math.max(1, city.availableCouriers * 2.1)) * 100;
    return Math.min(92, Math.max(64, +rawRatio.toFixed(1)));
  }, [city]);

  const baseSlaAdherencePct = useMemo(() => {
    const penalty = Math.max(0, (city.avgSlaMinutes - 22) * 1.35) + city.cancellationRiskPct * 0.9;
    return Math.min(99.2, Math.max(76.0, +(98.5 - penalty).toFixed(1)));
  }, [city]);

  const baseCsatScore = useMemo(() => {
    const raw = 4.92 - Math.max(0, city.avgSlaMinutes - 21) * 0.032 - city.cancellationRiskPct * 0.04;
    return Math.min(4.98, Math.max(3.6, +raw.toFixed(2)));
  }, [city]);

  // Initial time-series history buffer
  const [streamSeries, setStreamSeries] = useState<StreamTickPoint[]>([]);

  // Reset/initialize series when city, regime, or window changes
  useEffect(() => {
    const rMod = regimeConfig[regime];
    const points: StreamTickPoint[] = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const t = new Date(now.getTime() - i * 15000);
      const timeLabel = t.toTimeString().slice(0, 8);
      const wave = Math.sin(i * 0.65) * 0.6;

      const avgFulfillmentMin = Math.max(
        16.5,
        +(baseFulfillmentMin + rMod.fulfillDeltaMin + wave).toFixed(1)
      );
      const p95FulfillmentMin = +(avgFulfillmentMin * 1.34 + 1.8).toFixed(1);
      const courierUtilizationPct = Math.min(
        98.5,
        Math.max(52, +(baseUtilizationPct + rMod.utilizationDeltaPct + wave * 1.4).toFixed(1))
      );
      const slaAdherencePct = Math.min(
        99.5,
        Math.max(68.0, +(baseSlaAdherencePct + rMod.slaDeltaPct - wave * 0.9).toFixed(1))
      );
      const estimatedCsatScore = Math.min(
        5.0,
        Math.max(3.2, +(baseCsatScore + rMod.csatDelta - wave * 0.03).toFixed(2))
      );
      const csatPositivePct = Math.min(99, Math.max(65, Math.round((estimatedCsatScore / 5) * 100)));

      points.push({
        timestamp: timeLabel,
        avgFulfillmentMin,
        p95FulfillmentMin,
        courierUtilizationPct,
        slaAdherencePct,
        estimatedCsatScore,
        csatPositivePct,
      });
    }
    setStreamSeries(points);
    setSelectedZoneId(city.zones[0]?.id || 'Z-01');
  }, [city.cityId, regime, timeWindow]);

  // Live heartbeat interval (every 2.5 seconds when active)
  useEffect(() => {
    if (!isLiveStreaming) return;
    const interval = setInterval(() => {
      setTickCounter((prev) => prev + 1);
      setStreamSeries((prevSeries) => {
        if (prevSeries.length === 0) return prevSeries;
        const rMod = regimeConfig[regime];
        const nowLabel = new Date().toTimeString().slice(0, 8);
        const jitter = (Math.random() - 0.48) * 0.7;

        const avgFulfillmentMin = Math.max(
          16.0,
          +(baseFulfillmentMin + rMod.fulfillDeltaMin + jitter).toFixed(1)
        );
        const p95FulfillmentMin = +(avgFulfillmentMin * 1.33 + 1.9).toFixed(1);
        const courierUtilizationPct = Math.min(
          98.8,
          Math.max(50.0, +(baseUtilizationPct + rMod.utilizationDeltaPct + jitter * 1.5).toFixed(1))
        );
        const slaAdherencePct = Math.min(
          99.6,
          Math.max(66.0, +(baseSlaAdherencePct + rMod.slaDeltaPct - jitter * 1.1).toFixed(1))
        );
        const estimatedCsatScore = Math.min(
          5.0,
          Math.max(3.1, +(baseCsatScore + rMod.csatDelta - jitter * 0.04).toFixed(2))
        );
        const csatPositivePct = Math.min(99, Math.max(62, Math.round((estimatedCsatScore / 5) * 100)));

        const nextPoint: StreamTickPoint = {
          timestamp: nowLabel,
          avgFulfillmentMin,
          p95FulfillmentMin,
          courierUtilizationPct,
          slaAdherencePct,
          estimatedCsatScore,
          csatPositivePct,
        };
        return [...prevSeries.slice(1), nextPoint];
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [isLiveStreaming, regime, baseFulfillmentMin, baseUtilizationPct, baseSlaAdherencePct, baseCsatScore]);

  const latestPoint = streamSeries[streamSeries.length - 1] || {
    timestamp: 'LIVE',
    avgFulfillmentMin: baseFulfillmentMin,
    p95FulfillmentMin: +(baseFulfillmentMin * 1.34).toFixed(1),
    courierUtilizationPct: baseUtilizationPct,
    slaAdherencePct: baseSlaAdherencePct,
    estimatedCsatScore: baseCsatScore,
    csatPositivePct: Math.round((baseCsatScore / 5) * 100),
  };

  // End-to-End Fulfillment Time Stage Decomposition
  const fulfillmentStageBreakdown = useMemo(() => {
    const total = latestPoint.avgFulfillmentMin;
    const dispatchMatchMin = +(total * 0.11).toFixed(1);
    const courierPickupMin = +(total * 0.24).toFixed(1);
    const merchantPrepDwellMin =
      regime === 'prep_bottleneck'
        ? +(total * 0.34).toFixed(1)
        : +(total * 0.25).toFixed(1);
    const lastMileTransitMin = +(
      total -
      dispatchMatchMin -
      courierPickupMin -
      merchantPrepDwellMin
    ).toFixed(1);

    return [
      {
        stage: isThai ? '1. จับคู่งาน (Dispatch)' : '1. Dispatch Match',
        minutes: dispatchMatchMin,
        targetMin: 2.5,
      },
      {
        stage: isThai ? '2. เดินทางไปร้าน (Pickup)' : '2. En-Route to Merchant',
        minutes: courierPickupMin,
        targetMin: 5.5,
      },
      {
        stage: isThai ? '3. รออาหารที่ร้าน (Prep Dwell)' : '3. Merchant Prep Dwell',
        minutes: merchantPrepDwellMin,
        targetMin: 6.0,
      },
      {
        stage: isThai ? '4. จัดส่งถึงลูกค้า (Last-Mile)' : '4. Last-Mile Delivery',
        minutes: lastMileTransitMin,
        targetMin: 11.0,
      },
    ];
  }, [latestPoint.avgFulfillmentMin, regime, isThai]);

  // Zone-by-Zone Real-Time KPI Matrix
  const zoneKpiRows = useMemo(() => {
    const rMod = regimeConfig[regime];
    return city.zones.map((z) => {
      const fulfillMin = Math.max(
        15.5,
        +(z.medianSlaMinutes + rMod.fulfillDeltaMin * (z.status === 'CRITICAL' ? 1.15 : 0.85)).toFixed(1)
      );
      const utilPct = Math.min(
        98.5,
        Math.max(
          54.0,
          +(
            76.0 -
            z.imbalancePct * 0.42 +
            rMod.utilizationDeltaPct * 0.85
          ).toFixed(1)
        )
      );
      const slaAdherence = Math.min(
        99.4,
        Math.max(
          64.0,
          +(
            97.5 -
            Math.max(0, fulfillMin - 22) * 1.45 -
            z.cancellationRiskPct * 0.8 +
            rMod.slaDeltaPct * 0.7
          ).toFixed(1)
        )
      );
      const csat = Math.min(
        4.98,
        Math.max(
          3.25,
          +(4.92 - Math.max(0, fulfillMin - 21) * 0.038 - z.cancellationRiskPct * 0.035 + rMod.csatDelta * 0.8).toFixed(2)
        )
      );

      return {
        zone: z,
        fulfillMin,
        utilPct,
        slaAdherence,
        csat,
      };
    });
  }, [city.zones, regime, tickCounter]);

  const focusedZoneKpi =
    zoneKpiRows.find((r) => r.zone.id === selectedZoneId) || zoneKpiRows[0];

  return (
    <div className="space-y-6">
      {/* Top Control Header */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold flex items-center gap-1.5">
              <Radio className={`w-3 h-3 ${isLiveStreaming ? 'animate-pulse text-emerald-400' : 'text-neutral-500'}`} />
              {isLiveStreaming
                ? isThai
                  ? 'สตรีมข้อมูลสดทำงานอยู่ (2.5s HEARTBEAT)'
                  : 'LIVE KPI TELEMETRY STREAM (2.5s HEARTBEAT)'
                : isThai
                ? 'หยุดสตรีมชั่วคราว'
                : 'STREAM PAUSED'}
            </span>
            <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-[10px]">
              Cluster: {city.cluster}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight mt-1">
            {isThai
              ? `แดชบอร์ดตรวจสอบประสิทธิภาพโลจิสติกส์แบบเรียลไทม์ (Real-Time Logistics Performance Monitor) — ${city.cityName}`
              : `Real-Time Logistics Performance Monitoring Dashboard — ${city.cityName}`}
          </h2>
          <p className="text-xs text-neutral-400 mt-1 max-w-4xl leading-relaxed">
            {isThai
              ? 'นิยามและติดตามดัชนีชี้วัดผลการดำเนินงานหลัก (KPIs) แบบเรียลไทม์ ได้แก่ (1) เวลาเฉลี่ยในการจัดส่งสำเร็จ (2) อัตราการใช้ประโยชน์ไรเดอร์ (3) เปอร์เซ็นต์การรักษามาตรฐาน SLA และ (4) คะแนนความพึงพอใจของลูกค้าโดยประมาณ (CSAT)'
              : 'Defines and continuously monitors core logistics KPIs in real time: (1) Average Order Fulfillment Time, (2) Courier Utilization Rate, (3) SLA Adherence Percentage, and (4) Estimated Customer Satisfaction Score (CSAT).'}
          </p>
        </div>

        {/* Stream Controls & Time Window Selector */}
        <div className="flex flex-wrap items-center gap-2 self-start">
          <div className="flex items-center bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs font-mono">
            {(['15m', '1h', '4h'] as TelemetryTimeWindow[]).map((w) => (
              <button
                key={w}
                onClick={() => setTimeWindow(w)}
                className={`px-2.5 py-1 rounded transition cursor-pointer ${
                  timeWindow === w
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {w === '15m' ? '15m Live' : w === '1h' ? '1h Rolling' : '4h Shift'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsLiveStreaming(!isLiveStreaming)}
            className={`px-3 py-1.5 rounded-lg font-mono text-xs font-semibold border flex items-center gap-1.5 transition cursor-pointer ${
              isLiveStreaming
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            {isLiveStreaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isLiveStreaming ? (isThai ? 'หยุดสตรีม' : 'Pause Stream') : (isThai ? 'เริ่มสตรีม' : 'Resume Stream')}</span>
          </button>
        </div>
      </div>

      {/* Operating Stress Regime Selector Bar */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-mono text-neutral-300">
          <Sliders className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            {isThai
              ? 'จำลองสภาวะโหลดของระบบเพื่อทดสอบการตอบสนองของ KPI:'
              : 'Simulate Real-Time Operational Load Regime:'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(Object.keys(regimeConfig) as OperatingRegime[]).map((rKey) => {
            const cfg = regimeConfig[rKey];
            const active = regime === rKey;
            return (
              <button
                key={rKey}
                onClick={() => setRegime(rKey)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer border ${
                  active
                    ? 'bg-cyan-500/20 border-cyan-400 text-white font-bold shadow-sm'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {isThai ? cfg.labelTh : cfg.labelEn}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4 Dedicated Core KPI Cards with Mathematical Definitions & Live Thresholds */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Average Order Fulfillment Time */}
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-neutral-400 font-bold">
                {isThai ? 'KPI 01 • เวลาจัดส่งเฉลี่ย' : 'KPI 01 • AVG ORDER FULFILLMENT TIME'}
              </span>
              <Clock className="w-4 h-4 text-cyan-400" />
            </div>

            <div className="mt-2 flex items-baseline justify-between">
              <div className="text-2xl font-bold font-mono text-white">
                {latestPoint.avgFulfillmentMin.toFixed(1)}{' '}
                <span className="text-xs font-normal text-neutral-400">min</span>
              </div>
              <span
                className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                  latestPoint.avgFulfillmentMin <= 25.0
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : latestPoint.avgFulfillmentMin <= 30.0
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {latestPoint.avgFulfillmentMin <= 25.0 ? 'ON TARGET' : 'SLA BREACH RISK'}
              </span>
            </div>

            <div className="mt-1 text-[11px] font-mono text-neutral-400 flex justify-between">
              <span>Target SLA: ≤ 25.0m</span>
              <span className="text-amber-300">P95 Tail: {latestPoint.p95FulfillmentMin}m</span>
            </div>
          </div>

          <div className="pt-2.5 border-t border-neutral-800/80 text-[10px] font-mono text-neutral-500 space-y-1">
            <div className="text-neutral-300 font-semibold">
              {isThai ? 'นิยามตัวชี้วัด (KPI Formula):' : 'KPI Definition:'}
            </div>
            <div>T_fulfill = T_dispatch + T_pickup + T_prep + T_transit</div>
          </div>
        </div>

        {/* KPI 2: Courier Utilization Rate */}
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-neutral-400 font-bold">
                {isThai ? 'KPI 02 • อัตราการใช้ประโยชน์ไรเดอร์' : 'KPI 02 • COURIER UTILIZATION RATE'}
              </span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="mt-2 flex items-baseline justify-between">
              <div className="text-2xl font-bold font-mono text-emerald-400">
                {latestPoint.courierUtilizationPct.toFixed(1)}%
              </div>
              <span
                className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                  latestPoint.courierUtilizationPct > 88
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : latestPoint.courierUtilizationPct >= 72
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {latestPoint.courierUtilizationPct > 88
                  ? 'SATURATED (>88%)'
                  : latestPoint.courierUtilizationPct >= 72
                  ? 'OPTIMAL BAND'
                  : 'UNDER-UTILIZED'}
              </span>
            </div>

            <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full transition-all duration-500 ${
                  latestPoint.courierUtilizationPct > 88
                    ? 'bg-rose-500'
                    : latestPoint.courierUtilizationPct >= 72
                    ? 'bg-emerald-500'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${latestPoint.courierUtilizationPct}%` }}
              />
            </div>

            <div className="mt-1 text-[11px] font-mono text-neutral-400 flex justify-between">
              <span>Optimal Target: 72% – 85%</span>
              <span>Idle Buffer: {(100 - latestPoint.courierUtilizationPct).toFixed(1)}%</span>
            </div>
          </div>

          <div className="pt-2.5 border-t border-neutral-800/80 text-[10px] font-mono text-neutral-500 space-y-1">
            <div className="text-neutral-300 font-semibold">
              {isThai ? 'นิยามตัวชี้วัด (KPI Formula):' : 'KPI Definition:'}
            </div>
            <div>U_fleet = (Active Pickup + Delivery Min) / Online Shift Min</div>
          </div>
        </div>

        {/* KPI 3: SLA Adherence Percentage */}
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-neutral-400 font-bold">
                {isThai ? 'KPI 03 • อัตราการรักษาข้อตกลง SLA' : 'KPI 03 • SLA ADHERENCE PERCENTAGE'}
              </span>
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
            </div>

            <div className="mt-2 flex items-baseline justify-between">
              <div className="text-2xl font-bold font-mono text-amber-300">
                {latestPoint.slaAdherencePct.toFixed(1)}%
              </div>
              <span
                className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                  latestPoint.slaAdherencePct >= 94.0
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : latestPoint.slaAdherencePct >= 86.0
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {latestPoint.slaAdherencePct >= 94.0
                  ? 'COMPLIANT (≥94%)'
                  : latestPoint.slaAdherencePct >= 86.0
                  ? 'DEGRADED'
                  : 'BELOW THRESHOLD'}
              </span>
            </div>

            <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full transition-all duration-500 ${
                  latestPoint.slaAdherencePct >= 94.0
                    ? 'bg-emerald-500'
                    : latestPoint.slaAdherencePct >= 86.0
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${latestPoint.slaAdherencePct}%` }}
              />
            </div>

            <div className="mt-1 text-[11px] font-mono text-neutral-400 flex justify-between">
              <span>Enterprise Target: ≥ 94.0%</span>
              <span className="text-rose-400">
                Breach Rate: {(100 - latestPoint.slaAdherencePct).toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="pt-2.5 border-t border-neutral-800/80 text-[10px] font-mono text-neutral-500 space-y-1">
            <div className="text-neutral-300 font-semibold">
              {isThai ? 'นิยามตัวชี้วัด (KPI Formula):' : 'KPI Definition:'}
            </div>
            <div>SLA_% = (Orders Delivered ≤ Promised Window) / Total Orders</div>
          </div>
        </div>

        {/* KPI 4: Estimated Customer Satisfaction Score */}
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-neutral-400 font-bold">
                {isThai ? 'KPI 04 • คะแนนความพึงพอใจลูกค้า' : 'KPI 04 • ESTIMATED CUSTOMER SATISFACTION'}
              </span>
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            </div>

            <div className="mt-2 flex items-baseline justify-between">
              <div className="text-2xl font-bold font-mono text-white flex items-center gap-1.5">
                <span>{latestPoint.estimatedCsatScore.toFixed(2)}</span>
                <span className="text-xs font-normal text-yellow-400">/ 5.00 ★</span>
              </div>
              <span
                className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                  latestPoint.estimatedCsatScore >= 4.65
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : latestPoint.estimatedCsatScore >= 4.25
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {latestPoint.csatPositivePct}% POSITIVE
              </span>
            </div>

            <div className="mt-1 text-[11px] font-mono text-neutral-400 flex justify-between">
              <span>Benchmark: ≥ 4.70 ★</span>
              <span>Cancel Friction: {city.cancellationRiskPct}%</span>
            </div>
          </div>

          <div className="pt-2.5 border-t border-neutral-800/80 text-[10px] font-mono text-neutral-500 space-y-1">
            <div className="text-neutral-300 font-semibold">
              {isThai ? 'นิยามตัวชี้วัด (KPI Formula):' : 'KPI Definition:'}
            </div>
            <div>CSAT_est = f(SLA_velocity, Handoff_accuracy, Delay_penalty)</div>
          </div>
        </div>
      </div>

      {/* Real-Time Streaming Telemetry Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Chart: Average Order Fulfillment Time vs SLA Adherence % (6 Cols) */}
        <div className="lg:col-span-6 bg-neutral-900/85 border border-neutral-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <div>
              <h3 className="text-xs font-bold font-mono uppercase text-white tracking-wider">
                {isThai
                  ? 'กราฟเรียลไทม์: เวลาจัดส่งเฉลี่ย (นาที) เทียบกับ อัตราการรักษา SLA (%)'
                  : 'Real-Time Fulfillment Time (min) vs. SLA Adherence (%)'}
              </h3>
              <p className="text-[10px] font-mono text-neutral-400 mt-0.5">
                {isThai
                  ? 'อัปเดตทุก 2.5 วินาที พร้อมเส้นเกณฑ์มาตรฐาน SLA 25.0 นาที'
                  : 'Live rolling telemetry stream with 25.0m SLA benchmark reference'}
              </p>
            </div>
            <span className="text-[10px] font-mono text-cyan-400">{latestPoint.timestamp}</span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={streamSeries} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fill: '#a3a3a3', fontSize: 10, fontFamily: 'monospace' }}
                />
                <YAxis
                  yAxisId="left"
                  domain={[10, 48]}
                  tick={{ fill: '#06b6d4', fontSize: 10, fontFamily: 'monospace' }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[60, 100]}
                  tick={{ fill: '#10b981', fontSize: 10, fontFamily: 'monospace' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0a0a0a',
                    borderColor: '#262626',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
                <ReferenceLine
                  yAxisId="left"
                  y={25}
                  stroke="#f43f5e"
                  strokeDasharray="3 3"
                  label={{ value: '25m SLA Target', fill: '#f43f5e', fontSize: 10 }}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="p95FulfillmentMin"
                  name={isThai ? 'เวลาจัดส่ง P95 (นาที)' : 'P95 Tail Fulfillment (m)'}
                  fill="rgba(244, 63, 94, 0.12)"
                  stroke="#f43f5e"
                  strokeDasharray="3 3"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="avgFulfillmentMin"
                  name={isThai ? 'เวลาจัดส่งเฉลี่ย (นาที)' : 'Avg Fulfillment Time (m)'}
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="slaAdherencePct"
                  name={isThai ? 'อัตราการรักษา SLA (%)' : 'SLA Adherence (%)'}
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Chart: Courier Utilization Rate vs Estimated Customer Satisfaction (6 Cols) */}
        <div className="lg:col-span-6 bg-neutral-900/85 border border-neutral-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <div>
              <h3 className="text-xs font-bold font-mono uppercase text-white tracking-wider">
                {isThai
                  ? 'กราฟเรียลไทม์: อัตราการใช้ไรเดอร์ (%) เทียบกับ ความพึงพอใจลูกค้า (CSAT)'
                  : 'Courier Utilization Rate (%) vs. Estimated CSAT Score (★)'}
              </h3>
              <p className="text-[10px] font-mono text-neutral-400 mt-0.5">
                {isThai
                  ? 'ตรวจจับจุดอิ่มตัวของกองยานไรเดอร์ (>88%) ที่เริ่มส่งผลให้คะแนน CSAT ลดลง'
                  : 'Tracks fleet saturation (>88% utilization) impact on customer satisfaction'}
              </p>
            </div>
            <span className="text-[10px] font-mono text-emerald-400">
              CSAT: {latestPoint.estimatedCsatScore.toFixed(2)} ★
            </span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={streamSeries} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fill: '#a3a3a3', fontSize: 10, fontFamily: 'monospace' }}
                />
                <YAxis
                  yAxisId="left"
                  domain={[45, 100]}
                  tick={{ fill: '#f59e0b', fontSize: 10, fontFamily: 'monospace' }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[3.0, 5.0]}
                  tick={{ fill: '#eab308', fontSize: 10, fontFamily: 'monospace' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0a0a0a',
                    borderColor: '#262626',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
                <ReferenceLine
                  yAxisId="left"
                  y={85}
                  stroke="#f59e0b"
                  strokeDasharray="3 3"
                  label={{ value: '85% Max Optimal Util', fill: '#f59e0b', fontSize: 10 }}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="courierUtilizationPct"
                  name={isThai ? 'อัตราการใช้ไรเดอร์ (%)' : 'Courier Utilization (%)'}
                  fill="rgba(245, 158, 11, 0.16)"
                  stroke="#f59e0b"
                  strokeWidth={2.2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="estimatedCsatScore"
                  name={isThai ? 'คะแนนความพึงพอใจ (1-5 ★)' : 'Estimated CSAT (1.0-5.0 ★)'}
                  stroke="#eab308"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Section: Stage-by-Stage Fulfillment Latency Breakdown + Zone-Level KPI Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Fulfillment Time Stage Decomposition (5 Cols) */}
        <div className="lg:col-span-5 bg-neutral-900/85 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold font-mono uppercase text-white tracking-wider">
                  {isThai
                    ? 'การแยกส่วนเวลาจัดส่งตามขั้นตอน (Fulfillment Stage Latency)'
                    : 'Fulfillment Time Stage Decomposition'}
                </h3>
              </div>
              <span className="text-[11px] font-mono text-cyan-400 font-bold">
                Total: {latestPoint.avgFulfillmentMin.toFixed(1)}m
              </span>
            </div>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={fulfillmentStageBreakdown}
                  layout="vertical"
                  margin={{ top: 5, right: 18, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis
                    type="number"
                    tick={{ fill: '#a3a3a3', fontSize: 10, fontFamily: 'monospace' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="stage"
                    width={135}
                    tick={{ fill: '#e5e5e5', fontSize: 10, fontFamily: 'monospace' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0a0a0a',
                      borderColor: '#262626',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
                  <Bar
                    dataKey="minutes"
                    name={isThai ? 'เวลาที่ใช้จริง (นาที)' : 'Actual Stage Latency (min)'}
                    fill="#06b6d4"
                    radius={[0, 4, 4, 0]}
                  />
                  <Bar
                    dataKey="targetMin"
                    name={isThai ? 'เกณฑ์เป้าหมาย (นาที)' : 'Target SLA Budget (min)'}
                    fill="#525252"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-3 p-3 bg-neutral-950 rounded-lg border border-neutral-800 text-[11px] font-mono text-neutral-300 flex items-center justify-between">
            <span>
              {isThai ? 'สถานะคอขวดหลัก:' : 'Primary Stage Bottleneck:'}{' '}
              <strong className="text-amber-400">
                {regime === 'prep_bottleneck'
                  ? isThai
                    ? 'ร้านค้าเตรียมอาหารล่าช้า (Merchant Dwell)'
                    : 'Merchant Prep Dwell'
                  : isThai
                  ? 'การเดินทางส่งถึงลูกค้า (Last-Mile Transit)'
                  : 'Last-Mile Transit'}
              </strong>
            </span>
            <span className="text-cyan-400">SLA Target: 25.0m</span>
          </div>
        </div>

        {/* Zone-by-Zone Real-Time KPI Matrix (7 Cols) */}
        <div className="lg:col-span-7 bg-neutral-900/85 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold font-mono uppercase text-white tracking-wider">
                  {isThai
                    ? 'ตารางติดตาม 4 KPI หลักแยกตามโซนปฏิบัติการ'
                    : 'Zone-by-Zone Real-Time KPI Telemetry Matrix'}
                </h3>
              </div>
              <span className="text-[10px] font-mono text-neutral-400">
                {city.zones.length} {isThai ? 'โซนในเมืองนี้' : 'Active Partitions'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400 text-[10px] uppercase">
                    <th className="pb-2">{isThai ? 'โซนปฏิบัติการ' : 'Zone'}</th>
                    <th className="pb-2 text-right">
                      {isThai ? 'เวลาจัดส่งเฉลี่ย' : 'Avg Fulfillment'}
                    </th>
                    <th className="pb-2 text-right">
                      {isThai ? 'อัตราใช้ไรเดอร์' : 'Courier Util %'}
                    </th>
                    <th className="pb-2 text-right">
                      {isThai ? 'การรักษา SLA %' : 'SLA Adherence'}
                    </th>
                    <th className="pb-2 text-right">
                      {isThai ? 'ความพึงพอใจ CSAT' : 'Est. CSAT ★'}
                    </th>
                    <th className="pb-2 text-center">{isThai ? 'สถานะ KPI' : 'KPI Health'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {zoneKpiRows.map((row) => {
                    const isSelected = row.zone.id === selectedZoneId;
                    const isHealthy = row.slaAdherence >= 92 && row.fulfillMin <= 26;
                    const isCritical = row.slaAdherence < 84 || row.fulfillMin > 31;
                    return (
                      <tr
                        key={row.zone.id}
                        onClick={() => setSelectedZoneId(row.zone.id)}
                        className={`cursor-pointer transition ${
                          isSelected
                            ? 'bg-cyan-950/30 text-white'
                            : 'hover:bg-neutral-950/60 text-neutral-300'
                        }`}
                      >
                        <td className="py-2.5">
                          <div className="font-bold text-white">{row.zone.id}</div>
                          <div className="text-[10px] text-neutral-500 font-sans truncate max-w-[140px]">
                            {row.zone.name}
                          </div>
                        </td>
                        <td
                          className={`py-2.5 text-right font-bold ${
                            row.fulfillMin > 28
                              ? 'text-rose-400'
                              : row.fulfillMin > 25
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {row.fulfillMin.toFixed(1)}m
                        </td>
                        <td
                          className={`py-2.5 text-right font-semibold ${
                            row.utilPct > 88 ? 'text-rose-400' : 'text-cyan-400'
                          }`}
                        >
                          {row.utilPct.toFixed(1)}%
                        </td>
                        <td
                          className={`py-2.5 text-right font-bold ${
                            row.slaAdherence >= 94
                              ? 'text-emerald-400'
                              : row.slaAdherence >= 86
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {row.slaAdherence.toFixed(1)}%
                        </td>
                        <td className="py-2.5 text-right font-bold text-yellow-400">
                          {row.csat.toFixed(2)} ★
                        </td>
                        <td className="py-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              isCritical
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : isHealthy
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {isCritical ? 'BREACH RISK' : isHealthy ? 'OPTIMAL' : 'WATCH'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Governance Escalation Footer */}
          {onNavigateToGovernance && (
            <div className="mt-4 pt-3 border-t border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-[11px] font-mono text-neutral-400">
                {isThai ? 'โซนที่เลือก:' : 'Selected Partition:'}{' '}
                <strong className="text-white">{focusedZoneKpi.zone.id}</strong> • SLA:{' '}
                <strong className="text-amber-400">{focusedZoneKpi.slaAdherence.toFixed(1)}%</strong> • CSAT:{' '}
                <strong className="text-yellow-400">{focusedZoneKpi.csat.toFixed(2)} ★</strong>
              </div>
              <button
                onClick={() =>
                  onNavigateToGovernance({
                    source: 'REALTIME_PERFORMANCE_KPI_MONITOR',
                    zone: focusedZoneKpi.zone.id,
                    avgFulfillmentMin: focusedZoneKpi.fulfillMin,
                    courierUtilizationPct: focusedZoneKpi.utilPct,
                    slaAdherencePct: focusedZoneKpi.slaAdherence,
                    estimatedCsat: focusedZoneKpi.csat,
                  })
                }
                className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {isThai
                    ? 'ส่งค่าเบี่ยงเบน KPI ไปยัง AEON Guardian'
                    : 'Escalate KPI Threshold Breach to AEON Guardian'}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
