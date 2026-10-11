import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  Clock,
  CloudRain,
  Sun,
  ThermometerSun,
  Wind,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Shield,
  Sparkles,
  ArrowUpRight,
  Users,
  Activity,
  Radio,
  Layers,
} from 'lucide-react';
import { CityMarketplace, SubMarketZone } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface CourierAvailabilityForecastProps {
  city: CityMarketplace;
  selectedZoneId?: string;
  onSelectZone?: (zoneId: string) => void;
  onNavigateToGovernance?: (advisoryData?: any) => void;
}

type TimePatternId = 'shift_handoff' | 'lunch_rush' | 'late_night_decay' | 'morning_ramp';
type WeatherFactorId = 'clear' | 'rain_squall' | 'extreme_heat' | 'wind_fog';
type LocalEventId = 'stadium_egress' | 'transit_disruption' | 'cbd_convention' | 'none';
type ForecastHorizonMin = 60 | 90 | 120;

interface ZoneForecastRow {
  zone: SubMarketZone;
  historicalP50: number;
  currentCouriers: number;
  forecastT30: number;
  forecastT60: number;
  forecastT90: number;
  forecastT120: number;
  requiredTargetAtHorizon: number;
  forecastAtHorizon: number;
  netDeltaAtHorizon: number; // positive = SURPLUS, negative = SHORTAGE
  netDeltaPct: number;
  statusAtHorizon: 'CRITICAL_SHORTAGE' | 'MODERATE_SHORTAGE' | 'BALANCED' | 'SURPLUS';
  primaryDriverEn: string;
  primaryDriverTh: string;
  confidencePct: number;
  recommendedActionEn: string;
  recommendedActionTh: string;
}

export const CourierAvailabilityForecast: React.FC<CourierAvailabilityForecastProps> = ({
  city,
  selectedZoneId,
  onSelectZone,
  onNavigateToGovernance,
}) => {
  const { language } = useLanguage();
  const isThai = language === 'th';

  const [focusZoneId, setFocusZoneId] = useState<string>(
    selectedZoneId || city.zones[3]?.id || city.zones[0]?.id
  );
  const [timePattern, setTimePattern] = useState<TimePatternId>('shift_handoff');
  const [weatherFactor, setWeatherFactor] = useState<WeatherFactorId>('rain_squall');
  const [localEvent, setLocalEvent] = useState<LocalEventId>('stadium_egress');
  const [horizonMin, setHorizonMin] = useState<ForecastHorizonMin>(60);
  const [queuedAlertZoneId, setQueuedAlertZoneId] = useState<string | null>(null);

  // Sync with parent selectedZoneId if provided
  const activeZoneId = selectedZoneId || focusZoneId;
  const handleZoneClick = (zId: string) => {
    setFocusZoneId(zId);
    if (onSelectZone) onSelectZone(zId);
  };

  // External & temporal modifiers
  const timeModifiers: Record<
    TimePatternId,
    {
      labelEn: string;
      labelTh: string;
      supplyDrift60: number;
      demandDrift60: number;
      windowLabel: string;
    }
  > = {
    shift_handoff: {
      labelEn: '16:30–18:00 Shift Changeover & Dinner Ramp',
      labelTh: '16:30–18:00 ช่วงเปลี่ยนกะและเริ่มพีคมื้อเย็น',
      supplyDrift60: -0.14,
      demandDrift60: 0.22,
      windowLabel: '16:30 - 18:00 Local',
    },
    lunch_rush: {
      labelEn: '11:30–13:00 Midday Commercial Peak',
      labelTh: '11:30–13:00 พีคมื้อเที่ยงย่านธุรกิจ',
      supplyDrift60: -0.05,
      demandDrift60: 0.28,
      windowLabel: '11:30 - 13:00 Local',
    },
    late_night_decay: {
      labelEn: '21:30–23:00 Late-Night Fleet Sign-Off',
      labelTh: '21:30–23:00 ช่วงไรเดอร์ทยอยออฟไลน์ดึก',
      supplyDrift60: -0.24,
      demandDrift60: -0.08,
      windowLabel: '21:30 - 23:00 Local',
    },
    morning_ramp: {
      labelEn: '07:30–09:00 Morning Fleet Sign-On Ramp',
      labelTh: '07:30–09:00 ช่วงไรเดอร์เริ่มงานเช้า',
      supplyDrift60: 0.18,
      demandDrift60: 0.06,
      windowLabel: '07:30 - 09:00 Local',
    },
  };

  const weatherModifiers: Record<
    WeatherFactorId,
    {
      labelEn: string;
      labelTh: string;
      courierRetentionImpact: number;
      requiredFleetBump: number;
      badgeColor: string;
    }
  > = {
    clear: {
      labelEn: 'Clear Sky (Nominal Baseline)',
      labelTh: 'ท้องฟ้าแจ่มใส (เกณฑ์ปกติ)',
      courierRetentionImpact: 0.0,
      requiredFleetBump: 0.0,
      badgeColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    },
    rain_squall: {
      labelEn: 'Heavy Rain Squall (-18% 2-Wheel Supply)',
      labelTh: 'พายุฝนตกหนัก (ไรเดอร์ 2 ล้อลดลง -18%)',
      courierRetentionImpact: -0.18,
      requiredFleetBump: 0.21,
      badgeColor: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    },
    extreme_heat: {
      labelEn: 'Heat Advisory 37°C (-11% Endurance)',
      labelTh: 'อากาศร้อนจัด 37°C (ความต่อเนื่องลดลง -11%)',
      courierRetentionImpact: -0.11,
      requiredFleetBump: 0.12,
      badgeColor: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    },
    wind_fog: {
      labelEn: 'High Wind / Coastal Fog (-8% Speed)',
      labelTh: 'ลมแรงและหมอกหนา (ความเร็วลดลง -8%)',
      courierRetentionImpact: -0.08,
      requiredFleetBump: 0.09,
      badgeColor: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
    },
  };

  const eventModifiers: Record<
    LocalEventId,
    {
      labelEn: string;
      labelTh: string;
      zoneCongestionImpact: number;
      demandSpikeImpact: number;
    }
  > = {
    stadium_egress: {
      labelEn: 'Arena Concert / Stadium Egress (22k Attendees)',
      labelTh: 'คอนเสิร์ตใหญ่ / เลิกงานสนามกีฬา (22,000 คน)',
      zoneCongestionImpact: -0.12,
      demandSpikeImpact: 0.24,
    },
    transit_disruption: {
      labelEn: 'Metro Line Delay / Arterial Closure',
      labelTh: 'รถไฟฟ้าขัดข้อง / ปิดถนนสายหลัก',
      zoneCongestionImpact: -0.09,
      demandSpikeImpact: 0.16,
    },
    cbd_convention: {
      labelEn: 'CBD Tech & Finance Expo Surge',
      labelTh: 'งานประชุมศูนย์การค้าใจกลางเมือง',
      zoneCongestionImpact: -0.05,
      demandSpikeImpact: 0.14,
    },
    none: {
      labelEn: 'No Scheduled Local Event Disruption',
      labelTh: 'ไม่มีอีเวนต์พิเศษหรือการปิดถนน',
      zoneCongestionImpact: 0.0,
      demandSpikeImpact: 0.0,
    },
  };

  // Compute zone-by-zone courier availability forecasts (T+30, T+60, T+90, T+120)
  const zoneForecasts = useMemo<ZoneForecastRow[]>(() => {
    const tMod = timeModifiers[timePattern];
    const wMod = weatherModifiers[weatherFactor];
    const eMod = eventModifiers[localEvent];

    return city.zones.map((zone, idx) => {
      // Zone-specific sensitivity: e.g., zones with existing negative imbalance are more exposed to events/weather
      const isEventHotZone = idx === 3 || idx === 1;
      const isResidentialSurplusZone = zone.imbalancePct >= 0 && idx === 2;

      const historicalP50 = Math.round(zone.availableCouriers * (zone.imbalancePct < -20 ? 1.18 : 0.96));
      const currentCouriers = zone.availableCouriers;

      // Combined supply drift factor at T+60m
      let supplyRate60 =
        tMod.supplyDrift60 +
        wMod.courierRetentionImpact * (isResidentialSurplusZone ? 0.5 : 1.0) +
        (isEventHotZone ? eMod.zoneCongestionImpact : eMod.zoneCongestionImpact * 0.3);

      // If residential surplus zone during morning ramp or clear sky, create a realistic surplus forecast
      if (isResidentialSurplusZone && weatherFactor === 'clear') {
        supplyRate60 += 0.16;
      } else if (isResidentialSurplusZone && timePattern === 'morning_ramp') {
        supplyRate60 += 0.22;
      }

      const forecastT30 = Math.max(25, Math.round(currentCouriers * (1 + supplyRate60 * 0.55)));
      const forecastT60 = Math.max(20, Math.round(currentCouriers * (1 + supplyRate60)));
      const forecastT90 = Math.max(18, Math.round(currentCouriers * (1 + supplyRate60 * 1.22)));
      const forecastT120 = Math.max(18, Math.round(currentCouriers * (1 + supplyRate60 * 1.35)));

      // Required courier target based on predicted order volume + external factors
      const baseRequiredCouriers = Math.round(
        currentCouriers * (1 + Math.max(-0.15, -zone.imbalancePct / 100))
      );
      const demandBump =
        tMod.demandDrift60 +
        wMod.requiredFleetBump +
        (isEventHotZone ? eMod.demandSpikeImpact : eMod.demandSpikeImpact * 0.35);

      const horizonScale = horizonMin === 60 ? 1.0 : horizonMin === 90 ? 1.12 : 1.2;
      const requiredTargetAtHorizon = Math.round(
        baseRequiredCouriers * (1 + demandBump * (isResidentialSurplusZone ? 0.35 : 0.85) * horizonScale)
      );

      const forecastAtHorizon =
        horizonMin === 60 ? forecastT60 : horizonMin === 90 ? forecastT90 : forecastT120;

      const netDeltaAtHorizon = forecastAtHorizon - requiredTargetAtHorizon;
      const netDeltaPct = Math.round((netDeltaAtHorizon / Math.max(1, requiredTargetAtHorizon)) * 100);

      let statusAtHorizon: ZoneForecastRow['statusAtHorizon'] = 'BALANCED';
      if (netDeltaPct <= -20) statusAtHorizon = 'CRITICAL_SHORTAGE';
      else if (netDeltaPct <= -6) statusAtHorizon = 'MODERATE_SHORTAGE';
      else if (netDeltaPct >= 8) statusAtHorizon = 'SURPLUS';

      // Determine primary factor explanation
      let primaryDriverEn = '30-Day Historical Cohort + Shift Cycle';
      let primaryDriverTh = 'ข้อมูลสถิติ 30 วัน + รอบการเปลี่ยนกะ';
      if (weatherFactor !== 'clear' && isEventHotZone && localEvent !== 'none') {
        primaryDriverEn = `${wMod.labelEn.split(' (')[0]} + ${eMod.labelEn.split(' (')[0]}`;
        primaryDriverTh = `${wMod.labelTh.split(' (')[0]} + ${eMod.labelTh.split(' (')[0]}`;
      } else if (weatherFactor !== 'clear') {
        primaryDriverEn = `${wMod.labelEn.split(' (')[0]} + Shift Attrition`;
        primaryDriverTh = `${wMod.labelTh.split(' (')[0]} + ไรเดอร์ออกกะ`;
      } else if (isEventHotZone && localEvent !== 'none') {
        primaryDriverEn = eMod.labelEn.split(' (')[0];
        primaryDriverTh = eMod.labelTh.split(' (')[0];
      } else if (statusAtHorizon === 'SURPLUS') {
        primaryDriverEn = 'Off-Peak Residential Sign-On Surplus';
        primaryDriverTh = 'ไรเดอร์สแตนด์บายเกินความต้องการในโซนพักอาศัย';
      }

      const confidencePct = +(94.6 - (horizonMin - 60) * 0.04 - idx * 0.6).toFixed(1);

      const recommendedActionEn =
        statusAtHorizon === 'CRITICAL_SHORTAGE'
          ? `Pre-position +${Math.abs(netDeltaAtHorizon)} couriers & stage +$3.50 shift extension incentive 45m prior`
          : statusAtHorizon === 'MODERATE_SHORTAGE'
          ? `Issue cross-zone dispatch nudge for +${Math.abs(netDeltaAtHorizon)} couriers`
          : statusAtHorizon === 'SURPLUS'
          ? `Reallocate ${netDeltaAtHorizon} surplus couriers to adjacent deficit zones`
          : 'Maintain baseline dispatch posture';

      const recommendedActionTh =
        statusAtHorizon === 'CRITICAL_SHORTAGE'
          ? `ดึงไรเดอร์ล่วงหน้า +${Math.abs(netDeltaAtHorizon)} คน และตั้งโบนัสต่อกะ +$3.50 ล่วงหน้า 45 นาที`
          : statusAtHorizon === 'MODERATE_SHORTAGE'
          ? `แจ้งเตือนย้ายโซนอัจฉริยะเพื่อเสริมไรเดอร์ +${Math.abs(netDeltaAtHorizon)} คน`
          : statusAtHorizon === 'SURPLUS'
          ? `เกลี่ยไรเดอร์ส่วนเกิน ${netDeltaAtHorizon} คนไปยังโซนข้างเคียงที่ขาดแคลน`
          : 'รักษาระดับการกระจายงานตามเกณฑ์มาตรฐาน';

      return {
        zone,
        historicalP50,
        currentCouriers,
        forecastT30,
        forecastT60,
        forecastT90,
        forecastT120,
        requiredTargetAtHorizon,
        forecastAtHorizon,
        netDeltaAtHorizon,
        netDeltaPct,
        statusAtHorizon,
        primaryDriverEn,
        primaryDriverTh,
        confidencePct,
        recommendedActionEn,
        recommendedActionTh,
      };
    });
  }, [city.zones, timePattern, weatherFactor, localEvent, horizonMin]);

  const focusedForecast =
    zoneForecasts.find((f) => f.zone.id === activeZoneId) || zoneForecasts[0];

  // Build Historical (T-60m to T+0m) + Predictive (T+15m to T+120m) time series for focused zone
  const timeSeriesData = useMemo(() => {
    const cur = focusedForecast.currentCouriers;
    const hist = focusedForecast.historicalP50;
    const req60 = focusedForecast.requiredTargetAtHorizon;

    return [
      {
        horizon: 'T-60m',
        historicalBaseline: Math.round(hist * 1.05),
        actualOnline: Math.round(cur * 1.12),
        predictedOnline: null,
        requiredTarget: Math.round(cur * 1.04),
      },
      {
        horizon: 'T-45m',
        historicalBaseline: Math.round(hist * 1.03),
        actualOnline: Math.round(cur * 1.08),
        predictedOnline: null,
        requiredTarget: Math.round(cur * 1.06),
      },
      {
        horizon: 'T-30m',
        historicalBaseline: Math.round(hist * 1.01),
        actualOnline: Math.round(cur * 1.05),
        predictedOnline: null,
        requiredTarget: Math.round(cur * 1.08),
      },
      {
        horizon: 'T-15m',
        historicalBaseline: hist,
        actualOnline: Math.round(cur * 1.02),
        predictedOnline: null,
        requiredTarget: Math.round(cur * 1.11),
      },
      {
        horizon: 'NOW (T+0m)',
        historicalBaseline: hist,
        actualOnline: cur,
        predictedOnline: cur,
        requiredTarget: Math.round(cur * (1 + Math.max(0, -focusedForecast.zone.imbalancePct / 100))),
      },
      {
        horizon: 'T+15m',
        historicalBaseline: Math.round(hist * 0.99),
        actualOnline: null,
        predictedOnline: Math.round((cur + focusedForecast.forecastT30) / 2),
        requiredTarget: Math.round((cur + req60) * 0.48),
      },
      {
        horizon: 'T+30m',
        historicalBaseline: Math.round(hist * 0.97),
        actualOnline: null,
        predictedOnline: focusedForecast.forecastT30,
        requiredTarget: Math.round(req60 * 0.93),
      },
      {
        horizon: 'T+45m',
        historicalBaseline: Math.round(hist * 0.96),
        actualOnline: null,
        predictedOnline: Math.round((focusedForecast.forecastT30 + focusedForecast.forecastT60) / 2),
        requiredTarget: Math.round(req60 * 0.97),
      },
      {
        horizon: 'T+60m (SLA Gate)',
        historicalBaseline: Math.round(hist * 0.95),
        actualOnline: null,
        predictedOnline: focusedForecast.forecastT60,
        requiredTarget: req60,
      },
      {
        horizon: 'T+90m',
        historicalBaseline: Math.round(hist * 0.94),
        actualOnline: null,
        predictedOnline: focusedForecast.forecastT90,
        requiredTarget: Math.round(req60 * 1.04),
      },
      {
        horizon: 'T+120m',
        historicalBaseline: Math.round(hist * 0.93),
        actualOnline: null,
        predictedOnline: focusedForecast.forecastT120,
        requiredTarget: Math.round(req60 * 1.06),
      },
    ];
  }, [focusedForecast]);

  // Summary metrics across the city at T+60m / selected horizon
  const totalShortageCount = zoneForecasts
    .filter((f) => f.netDeltaAtHorizon < 0)
    .reduce((acc, f) => acc + Math.abs(f.netDeltaAtHorizon), 0);
  const totalSurplusCount = zoneForecasts
    .filter((f) => f.netDeltaAtHorizon > 0)
    .reduce((acc, f) => acc + f.netDeltaAtHorizon, 0);
  const shortageZonesCount = zoneForecasts.filter((f) => f.netDeltaAtHorizon < 0).length;

  return (
    <div className="bg-neutral-900/85 border border-neutral-800 rounded-xl p-5 space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-[10px] font-bold flex items-center gap-1">
              <Radio className="w-3 h-3 animate-pulse" />
              {isThai ? 'โมดูลพยากรณ์ล่วงหน้า 60–120 นาที' : 'CONTROL TOWER PREDICTIVE ENGINE (T+60M TO T+120M)'}
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10px] font-semibold flex items-center gap-1">
              <Shield className="w-3 h-3" />
              {isThai ? 'ต้องได้รับอนุมัติจากผู้ควบคุม (Advisory Only)' : 'ADVISORY ONLY • HUMAN APPROVAL REQUIRED'}
            </span>
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight mt-1">
            {isThai
              ? `ระบบวิเคราะห์เชิงคาดการณ์ความพร้อมของไรเดอร์รายโซน (Predictive Courier Availability Forecast) — ${city.cityName}`
              : `Predictive Courier Availability & Shortage/Surplus Forecaster — ${city.cityName}`}
          </h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-4xl leading-relaxed">
            {isThai
              ? 'ผสานข้อมูลประวัติย้อนหลัง 30 วัน รูปแบบกะเวลาทำงาน และปัจจัยภายนอก (สภาพอากาศ อีเวนต์ในพื้นที่) เพื่อพยากรณ์ภาวะขาดแคลนไรเดอร์ (Shortages) หรือไรเดอร์เกินความต้องการ (Surpluses) ล่วงหน้าอย่างน้อย 60 นาทีในศูนย์ควบคุมปฏิบัติการ'
              : 'Synthesizes 30-day historical courier retention cohorts, shift changeover patterns, and external telemetry (weather cells, local stadium/transit events) to predict zone-level courier shortages or surpluses at least 60 minutes in advance.'}
          </p>
        </div>

        {/* Advance Forecast Horizon Selector */}
        <div className="flex items-center gap-1.5 bg-neutral-950 p-1.5 rounded-lg border border-neutral-800 self-start">
          <span className="text-[10px] font-mono text-neutral-400 px-2">
            {isThai ? 'ระยะเวลาพยากรณ์:' : 'Advance Horizon:'}
          </span>
          {([60, 90, 120] as ForecastHorizonMin[]).map((h) => (
            <button
              key={h}
              onClick={() => setHorizonMin(h)}
              className={`px-3 py-1.5 rounded text-xs font-mono transition cursor-pointer ${
                horizonMin === h
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              T+{h}m
            </button>
          ))}
        </div>
      </div>

      {/* Multi-Signal Input Controls: Time-Based Patterns + Weather + Local Events */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-neutral-950/90 p-4 rounded-xl border border-neutral-800">
        {/* 1. Time-Based Shift Pattern */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono text-neutral-400 flex items-center gap-1.5 uppercase">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isThai ? '1. รูปแบบเวลาและกะการทำงาน (Time Pattern)' : '1. Time-Based Shift Pattern'}</span>
          </label>
          <select
            value={timePattern}
            onChange={(e) => setTimePattern(e.target.value as TimePatternId)}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
          >
            {Object.entries(timeModifiers).map(([id, mod]) => (
              <option key={id} value={id}>
                {isThai ? mod.labelTh : mod.labelEn}
              </option>
            ))}
          </select>
          <div className="text-[10px] font-mono text-neutral-500 flex justify-between">
            <span>Window: {timeModifiers[timePattern].windowLabel}</span>
            <span className="text-cyan-400">
              Fleet Drift: {timeModifiers[timePattern].supplyDrift60 >= 0 ? '+' : ''}
              {Math.round(timeModifiers[timePattern].supplyDrift60 * 100)}%
            </span>
          </div>
        </div>

        {/* 2. External Weather Condition */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono text-neutral-400 flex items-center gap-1.5 uppercase">
            <CloudRain className="w-3.5 h-3.5 text-amber-400" />
            <span>{isThai ? '2. ปัจจัยสภาพอากาศ (Weather Telemetry)' : '2. External Weather Factor'}</span>
          </label>
          <select
            value={weatherFactor}
            onChange={(e) => setWeatherFactor(e.target.value as WeatherFactorId)}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
          >
            {Object.entries(weatherModifiers).map(([id, mod]) => (
              <option key={id} value={id}>
                {isThai ? mod.labelTh : mod.labelEn}
              </option>
            ))}
          </select>
          <div className="text-[10px] font-mono text-neutral-500 flex justify-between">
            <span>Retention Impact: {Math.round(weatherModifiers[weatherFactor].courierRetentionImpact * 100)}%</span>
            <span className="text-amber-400">
              Target Bump: +{Math.round(weatherModifiers[weatherFactor].requiredFleetBump * 100)}%
            </span>
          </div>
        </div>

        {/* 3. Local Events & Urban Disruptions */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono text-neutral-400 flex items-center gap-1.5 uppercase">
            <Calendar className="w-3.5 h-3.5 text-rose-400" />
            <span>{isThai ? '3. อีเวนต์ในพื้นที่และการจราจร (Local Events)' : '3. Local Events & Disruptions'}</span>
          </label>
          <select
            value={localEvent}
            onChange={(e) => setLocalEvent(e.target.value as LocalEventId)}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
          >
            {Object.entries(eventModifiers).map(([id, mod]) => (
              <option key={id} value={id}>
                {isThai ? mod.labelTh : mod.labelEn}
              </option>
            ))}
          </select>
          <div className="text-[10px] font-mono text-neutral-500 flex justify-between">
            <span>Dwell Lockup: {Math.round(eventModifiers[localEvent].zoneCongestionImpact * 100)}%</span>
            <span className="text-rose-400">
              Event Inflow: +{Math.round(eventModifiers[localEvent].demandSpikeImpact * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Control Tower Early-Warning KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3.5">
          <div className="text-[10px] font-mono text-neutral-400 uppercase">
            {isThai ? `โซนที่คาดว่าจะขาดแคลนใน T+${horizonMin}m` : `Predicted Shortage Zones (T+${horizonMin}m)`}
          </div>
          <div className="text-xl font-bold font-mono text-rose-400 mt-1 flex items-center gap-2">
            <span>
              {shortageZonesCount} / {zoneForecasts.length} {isThai ? 'โซน' : 'Zones'}
            </span>
            <TrendingDown className="w-4 h-4" />
          </div>
          <div className="text-[10px] font-mono text-neutral-500 mt-1">
            {isThai ? 'แจ้งเตือนล่วงหน้าอย่างน้อย 60 นาที' : '≥ 60-Min Advance SLA Early Warning'}
          </div>
        </div>

        <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3.5">
          <div className="text-[10px] font-mono text-neutral-400 uppercase">
            {isThai ? `ยอดขาดแคลนไรเดอร์รวม (T+${horizonMin}m)` : `Projected Gross Courier Shortage`}
          </div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">
            -{totalShortageCount} <span className="text-xs font-normal text-neutral-400">couriers</span>
          </div>
          <div className="text-[10px] font-mono text-rose-400/90 mt-1">
            {isThai ? 'ต้องเตรียมโบนัสดึงไรเดอร์เข้าพื้นที่' : 'Requires pre-positioning or shift incentives'}
          </div>
        </div>

        <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3.5">
          <div className="text-[10px] font-mono text-neutral-400 uppercase">
            {isThai ? `ยอดไรเดอร์ส่วนเกินที่เกลี่ยได้ (T+${horizonMin}m)` : `Projected Reallocatable Surplus`}
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            +{totalSurplusCount} <span className="text-xs font-normal text-neutral-400">couriers</span>
          </div>
          <div className="text-[10px] font-mono text-emerald-400/80 mt-1">
            {isThai ? 'พร้อมโยกย้ายข้ามโซนโดยไม่กระทบ SLA' : 'Available for cross-zone rebalance'}
          </div>
        </div>

        <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3.5">
          <div className="text-[10px] font-mono text-neutral-400 uppercase">
            {isThai ? 'ความแม่นยำโมเดลพยากรณ์ (Model Confidence)' : 'Ensemble Forecast Confidence'}
          </div>
          <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
            {focusedForecast.confidencePct}%
          </div>
          <div className="text-[10px] font-mono text-neutral-500 mt-1">
            {isThai ? 'อ้างอิงสถิติ 30 วัน + สภาพอากาศสด' : '30-Day ARIMA + XGBoost Weather Fusion'}
          </div>
        </div>
      </div>

      {/* Main Content Grid: Zone Forecast Matrix (7 Cols) + Horizon Trajectory Chart (5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Operational Zones T+60m / T+90m Forecast Table (7 Cols) */}
        <div className="lg:col-span-7 bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold font-mono uppercase text-white tracking-wider">
                  {isThai
                    ? `ตารางพยากรณ์ไรเดอร์รายโซนล่วงหน้า (T+60m ถึง T+${horizonMin}m)`
                    : `Zone-by-Zone Courier Availability Forecast (T+60m / T+${horizonMin}m)`}
                </h4>
              </div>
              <span className="text-[10px] font-mono text-neutral-400">
                {isThai ? 'คลิกโซนเพื่อดูกราฟเส้นแนวโน้ม' : 'Click any zone to inspect trajectory'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400 text-[10px] uppercase">
                    <th className="pb-2">{isThai ? 'โซนปฏิบัติการ' : 'Zone'}</th>
                    <th className="pb-2 text-right">{isThai ? 'สถิติ P50' : 'Hist P50'}</th>
                    <th className="pb-2 text-right">{isThai ? 'ออนไลน์สด' : 'Now (T+0)'}</th>
                    <th className="pb-2 text-right text-cyan-400">
                      {isThai ? `คาดการณ์ T+${horizonMin}m` : `Pred T+${horizonMin}m`}
                    </th>
                    <th className="pb-2 text-right">{isThai ? 'เป้าหมายที่ต้องใช้' : 'Req Target'}</th>
                    <th className="pb-2 text-right">
                      {isThai ? 'ขาดแคลน / ส่วนเกิน' : 'Shortage / Surplus'}
                    </th>
                    <th className="pb-2 text-center">{isThai ? 'สถานะพยากรณ์' : 'Forecast Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {zoneForecasts.map((row) => {
                    const isSel = row.zone.id === activeZoneId;
                    const isShortage = row.netDeltaAtHorizon < 0;
                    return (
                      <tr
                        key={row.zone.id}
                        onClick={() => handleZoneClick(row.zone.id)}
                        className={`cursor-pointer transition ${
                          isSel ? 'bg-cyan-950/30 text-white' : 'hover:bg-neutral-900/70 text-neutral-300'
                        }`}
                      >
                        <td className="py-2.5">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                row.statusAtHorizon === 'CRITICAL_SHORTAGE'
                                  ? 'bg-rose-500 animate-ping'
                                  : row.statusAtHorizon === 'MODERATE_SHORTAGE'
                                  ? 'bg-amber-400'
                                  : row.statusAtHorizon === 'SURPLUS'
                                  ? 'bg-emerald-400'
                                  : 'bg-cyan-400'
                              }`}
                            />
                            <span>{row.zone.id}</span>
                          </div>
                          <div className="text-[10px] text-neutral-500 font-sans truncate max-w-[140px]">
                            {row.zone.name}
                          </div>
                        </td>
                        <td className="py-2.5 text-right text-neutral-400">{row.historicalP50}</td>
                        <td className="py-2.5 text-right text-neutral-200">{row.currentCouriers}</td>
                        <td className="py-2.5 text-right font-bold text-cyan-400">
                          {row.forecastAtHorizon}
                        </td>
                        <td className="py-2.5 text-right text-neutral-300">
                          {row.requiredTargetAtHorizon}
                        </td>
                        <td
                          className={`py-2.5 text-right font-bold ${
                            isShortage ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {row.netDeltaAtHorizon > 0
                            ? `+${row.netDeltaAtHorizon} (${isThai ? 'เกิน' : 'Surplus'})`
                            : `${row.netDeltaAtHorizon} (${isThai ? 'ขาด' : 'Shortage'})`}
                        </td>
                        <td className="py-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              row.statusAtHorizon === 'CRITICAL_SHORTAGE'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : row.statusAtHorizon === 'MODERATE_SHORTAGE'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : row.statusAtHorizon === 'SURPLUS'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            }`}
                          >
                            {row.statusAtHorizon.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Focused Zone Factor Attribution & Pre-Positioning Recommendation */}
          <div className="mt-4 pt-3 border-t border-neutral-800 bg-neutral-900/60 p-3 rounded-lg space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-white font-bold">
                  {focusedForecast.zone.id} ({focusedForecast.zone.name})
                </span>
              </div>
              <span className="text-[10px] text-neutral-400">
                {isThai ? 'ปัจจัยหลัก:' : 'Primary Driver:'}{' '}
                <strong className="text-amber-300">
                  {isThai ? focusedForecast.primaryDriverTh : focusedForecast.primaryDriverEn}
                </strong>
              </span>
            </div>

            <div className="text-xs text-neutral-300 font-sans">
              <strong className="text-cyan-400 font-mono text-[11px] uppercase mr-1.5">
                {isThai ? 'ข้อเสนอแนะล่วงหน้า 60 นาที:' : 'T+60m Proactive Advisory:'}
              </strong>
              {isThai ? focusedForecast.recommendedActionTh : focusedForecast.recommendedActionEn}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="text-[10px] font-mono text-neutral-500">
                T+30m: {focusedForecast.forecastT30} drv • T+60m: {focusedForecast.forecastT60} drv • T+90m:{' '}
                {focusedForecast.forecastT90} drv
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setQueuedAlertZoneId(focusedForecast.zone.id);
                    setTimeout(() => setQueuedAlertZoneId(null), 3000);
                    if (onNavigateToGovernance) {
                      onNavigateToGovernance({
                        source: 'PREDICTIVE_COURIER_FORECAST_T60',
                        zone: focusedForecast.zone.id,
                        horizonMinutes: horizonMin,
                        predictedCouriers: focusedForecast.forecastAtHorizon,
                        requiredCouriers: focusedForecast.requiredTargetAtHorizon,
                        netShortageOrSurplus: focusedForecast.netDeltaAtHorizon,
                      });
                    }
                  }}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[11px] font-mono font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <span>
                    {isThai
                      ? 'ส่งแผนเตรียมไรเดอร์ล่วงหน้าไปยัง AEON Guardian'
                      : 'Submit T+60m Fleet Advisory to AEON Guardian'}
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {queuedAlertZoneId && (
              <div className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 rounded px-2.5 py-1">
                ✓ {isThai ? `ส่งคำแนะนำล่วงหน้าสำหรับ ${queuedAlertZoneId} ไปยังคิวอนุมัติแล้ว` : `Queued T+${horizonMin}m advisory for ${queuedAlertZoneId} to operator review.`}
              </div>
            )}
          </div>
        </div>

        {/* Right: Multi-Horizon Forecast Chart (T-60m to T+120m) (5 Cols) */}
        <div className="lg:col-span-5 bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
              <div>
                <h4 className="text-xs font-bold font-mono uppercase text-white tracking-wider">
                  {isThai
                    ? `เส้นแนวโน้มความพร้อมไรเดอร์ (${focusedForecast.zone.id})`
                    : `Courier Availability Horizon Curve (${focusedForecast.zone.id})`}
                </h4>
                <p className="text-[10px] font-mono text-neutral-400 mt-0.5">
                  {isThai
                    ? 'เปรียบเทียบจำนวนไรเดอร์จริง พยากรณ์ T+60m–T+120m และเป้าหมายที่ต้องการ'
                    : 'Historical T-60m vs. Predicted T+60m/T+120m Fleet & SLA Target'}
                </p>
              </div>
              <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-[10px] font-mono text-cyan-400">
                {focusedForecast.zone.id}
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={timeSeriesData} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis
                    dataKey="horizon"
                    tick={{ fill: '#a3a3a3', fontSize: 10, fontFamily: 'monospace' }}
                  />
                  <YAxis tick={{ fill: '#a3a3a3', fontSize: 10, fontFamily: 'monospace' }} />
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
                    x="T+60m (SLA Gate)"
                    stroke="#f43f5e"
                    strokeDasharray="3 3"
                    label={{
                      value: '+60m Gate',
                      position: 'top',
                      fill: '#f43f5e',
                      fontSize: 10,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="historicalBaseline"
                    name={isThai ? 'ค่าเฉลี่ยสถิติ 30 วัน' : '30d Historical P50'}
                    fill="rgba(163, 163, 163, 0.12)"
                    stroke="#737373"
                    strokeDasharray="4 4"
                  />
                  <Line
                    type="monotone"
                    dataKey="actualOnline"
                    name={isThai ? 'ไรเดอร์ออนไลน์จริง' : 'Actual Couriers (Past 60m)'}
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="predictedOnline"
                    name={isThai ? 'ไรเดอร์ที่พยากรณ์ล่วงหน้า' : 'Predicted Couriers (+120m)'}
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    strokeDasharray="5 3"
                    dot={{ r: 3.5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="requiredTarget"
                    name={isThai ? 'จำนวนไรเดอร์ที่ต้องใช้รักษา SLA' : 'Required SLA Target Fleet'}
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Horizon Gap Explanation Card */}
          <div className="mt-3 p-3 bg-neutral-900/80 border border-neutral-800 rounded-lg space-y-2 font-mono text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">
                {isThai ? `ช่องว่างที่พยากรณ์ ณ T+${horizonMin}m:` : `Projected Gap at T+${horizonMin}m:`}
              </span>
              <span
                className={`font-bold ${
                  focusedForecast.netDeltaAtHorizon < 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {focusedForecast.netDeltaAtHorizon > 0
                  ? `+${focusedForecast.netDeltaAtHorizon} Couriers (SURPLUS)`
                  : `${focusedForecast.netDeltaAtHorizon} Couriers (SHORTAGE)`}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-neutral-400">
              <span>
                {isThai ? 'คาดการณ์ออนไลน์:' : 'Forecasted Fleet:'}{' '}
                <strong className="text-cyan-400">{focusedForecast.forecastAtHorizon}</strong>
              </span>
              <span>
                {isThai ? 'ความต้องการรักษา SLA 25m:' : '25m SLA Requirement:'}{' '}
                <strong className="text-amber-400">{focusedForecast.requiredTargetAtHorizon}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
