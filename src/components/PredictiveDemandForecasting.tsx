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
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  Clock,
  Calendar,
  Activity,
  AlertTriangle,
  Shield,
  ArrowUpRight,
  Layers,
  Sliders,
  CheckCircle2,
  BarChart3,
  Download,
  Zap,
  Waves,
} from 'lucide-react';
import { CityMarketplace } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface PredictiveDemandForecastingProps {
  city: CityMarketplace;
  selectedZoneId?: string;
  onSelectZone?: (zoneId: string) => void;
  onNavigateToGovernance?: (advisoryData?: any) => void;
}

type HistoricalModelId = '4w_dow_ema' | 'yoy_seasonal' | 'event_weather_analog';
type ChartViewMode = 'volume_curve' | 'variance_delta';
export type VolatilityScenario = 'LOW' | 'HIGH';

interface HourlyDemandPoint {
  stepIndex: number; // -6 to +24
  horizonLabel: string; // e.g. 'T-6h', 'NOW', 'T+1h' ... 'T+24h'
  clockLabel: string; // e.g. '08:00', '09:00', ...
  isHistory: boolean;
  isNow: boolean;
  historicalAvgOrders: number;
  lastWeekSameDayOrders: number;
  actualOrders: number | null;
  projectedOrders: number | null;
  counterfactualOrders: number | null; // Opposite volatility scenario for visual comparison
  p90UpperBand: number | null;
  p10LowerBand: number | null;
  confidenceRange: [number, number] | null;
  capacityThreshold: number;
  varianceVsHistoricalPct: number;
  varianceDeltaOrders: number;
  intradayVolatilitySigma: number;
  regimeNameEn: string;
  regimeNameTh: string;
  breachRisk: 'NOMINAL' | 'ELEVATED' | 'CRITICAL_SURGE';
}

export const PredictiveDemandForecasting: React.FC<PredictiveDemandForecastingProps> = ({
  city,
  selectedZoneId,
  onSelectZone,
  onNavigateToGovernance,
}) => {
  const { language } = useLanguage();
  const isThai = language === 'th';

  // Scope: 'ALL_CITY' or specific zone ID
  const [scopeZoneId, setScopeZoneId] = useState<string>(selectedZoneId || 'ALL_CITY');
  const [volatilityScenario, setVolatilityScenario] = useState<VolatilityScenario>('LOW');
  const [historicalModel, setHistoricalModel] = useState<HistoricalModelId>('4w_dow_ema');
  const [chartViewMode, setChartViewMode] = useState<ChartViewMode>('volume_curve');
  const [showConfidenceBand, setShowConfidenceBand] = useState<boolean>(true);
  const [showLastWeekCurve, setShowLastWeekCurve] = useState<boolean>(true);
  const [showCounterfactualCurve, setShowCounterfactualCurve] = useState<boolean>(true);
  const [macroGrowthDriftPct, setMacroGrowthDriftPct] = useState<number>(6);
  const [weatherEventImpulsePct, setWeatherEventImpulsePct] = useState<number>(12);
  const [inspectedStep, setInspectedStep] = useState<number>(11); // Default to evening peak T+11h (19:00)

  const selectedZoneObj = useMemo(
    () => city.zones.find((z) => z.id === scopeZoneId) || null,
    [city.zones, scopeZoneId]
  );

  // Sync when user clicks a zone filter inside the widget
  const handleSelectScope = (zoneId: string) => {
    setScopeZoneId(zoneId);
    if (zoneId !== 'ALL_CITY' && onSelectZone) {
      onSelectZone(zoneId);
    }
  };

  // Volatility Scenario Metadata ('LOW' vs 'HIGH')
  const volatilityMeta: Record<
    VolatilityScenario,
    {
      labelEn: string;
      labelTh: string;
      shortEn: string;
      shortTh: string;
      descEn: string;
      descTh: string;
      sigmaIndex: number;
      peakAmplifier: number;
      troughDampener: number;
      bandMultiplier: number;
      wapePenalty: number;
      strokeColor: string;
    }
  > = {
    LOW: {
      labelEn: 'Low Volatility Scenario',
      labelTh: 'สถานการณ์ความผันผวนต่ำ (Low Volatility)',
      shortEn: 'Low Volatility',
      shortTh: 'ความผันผวนต่ำ (Low)',
      descEn:
        'Mean-reverting diurnal order flow with dampened micro-bursts, high fleet predictability, and tight P10–P90 confidence bounds.',
      descTh:
        'ปริมาณคำสั่งซื้อเคลื่อนไหวสม่ำเสมอตามค่าเฉลี่ยรายชั่วโมง แรงกระเพื่อมช่วงพีคต่ำ และกรอบความเชื่อมั่น P10–P90 แคบ',
      sigmaIndex: 0.08,
      peakAmplifier: 0.92,
      troughDampener: 1.06,
      bandMultiplier: 0.62,
      wapePenalty: -0.6,
      strokeColor: '#22d3ee', // Cyan-400
    },
    HIGH: {
      labelEn: 'High Volatility Scenario',
      labelTh: 'สถานการณ์ความผันผวนสูง (High Volatility)',
      shortEn: 'High Volatility',
      shortTh: 'ความผันผวนสูง (High)',
      descEn:
        'Turbulent demand regime with sharp convective lunch/dinner spikes, stochastic flash-order bursts, deeper inter-peak troughs, and widened P10–P90 dispersion.',
      descTh:
        'คำสั่งซื้อผันผวนรุนแรง มีคลื่นกระชากช่วงมื้อเที่ยง-มื้อค่ำจากสภาพอากาศและแคมเปญด่วน พร้อมกรอบความคลาดเคลื่อน P10–P90 ที่กว้างขึ้น',
      sigmaIndex: 0.29,
      peakAmplifier: 1.26,
      troughDampener: 0.84,
      bandMultiplier: 1.75,
      wapePenalty: 1.8,
      strokeColor: '#f59e0b', // Amber-500 high-volatility alert trajectory
    },
  };

  // Historical baseline metadata
  const modelMeta: Record<
    HistoricalModelId,
    {
      nameEn: string;
      nameTh: string;
      descEn: string;
      descTh: string;
      wapePct: number;
      biasMultiplier: number;
      peakSharpness: number;
      uncertaintySpread: number;
    }
  > = {
    '4w_dow_ema': {
      nameEn: '4-Week Day-of-Week EMA (Baseline)',
      nameTh: 'ค่าเฉลี่ยเคลื่อนที่ 4 สัปดาห์ตามวันในสัปดาห์ (Baseline)',
      descEn: 'Weights trailing 4 matching weekdays with exponential decay for recent intraday velocity.',
      descTh: 'ถ่วงน้ำหนักข้อมูล 4 สัปดาห์ย้อนหลังในวันเดียวกัน พร้อมปรับตามความเร็วคำสั่งซื้อล่าสุด',
      wapePct: 3.4,
      biasMultiplier: 1.0,
      peakSharpness: 1.0,
      uncertaintySpread: 0.11,
    },
    yoy_seasonal: {
      nameEn: '52-Week Seasonal + Payday Cycle',
      nameTh: 'แนวโน้มฤดูกาล 52 สัปดาห์ + รอบวันเงินเดือนออก',
      descEn: 'Incorporates annual seasonality harmonics, end-of-month retail spikes, and commuter shifts.',
      descTh: 'คำนวณร่วมกับวัฏจักรรายปี ช่วงปลายเดือน และพฤติกรรมการเดินทางช่วงเร่งด่วน',
      wapePct: 3.9,
      biasMultiplier: 1.05,
      peakSharpness: 1.12,
      uncertaintySpread: 0.14,
    },
    event_weather_analog: {
      nameEn: 'P85 Weather & Urban Event Analog Cohort',
      nameTh: 'กลุ่มวันเทียบเคียงสภาพอากาศแปรปรวนและอีเวนต์เมือง (P85)',
      descEn: 'Matches historical days with precipitation squalls and high-attendance evening arena events.',
      descTh: 'ดึงรูปแบบจากวันในอดีตที่มีพายุฝนและงานอีเวนต์ขนาดใหญ่ในช่วงค่ำ',
      wapePct: 4.2,
      biasMultiplier: 1.11,
      peakSharpness: 1.24,
      uncertaintySpread: 0.16,
    },
  };

  // Diurnal 24-hour normalized demand multipliers (00:00 to 23:00 local time)
  const diurnalMultipliers: number[] = [
    0.42, // 00:00 Late night tail
    0.29, // 01:00 Overnight trough
    0.22, // 02:00 Deep trough
    0.19, // 03:00 Minimum volume
    0.21, // 04:00 Early bakery/freight prep
    0.31, // 05:00 Dawn ramp
    0.48, // 06:00 Early breakfast
    0.74, // 07:00 Morning commute ramp
    0.92, // 08:00 Coffee & breakfast rush
    0.86, // 09:00 Mid-morning settle
    0.88, // 10:00 Pre-lunch batching
    1.28, // 11:00 Commercial lunch ramp
    1.54, // 12:00 Peak midday lunch
    1.38, // 13:00 Post-lunch plateau
    1.04, // 14:00 Afternoon parcel/grocery
    0.96, // 15:00 Afternoon lull
    1.08, // 16:00 Pre-dinner grocery ramp
    1.36, // 17:00 Commute & early dinner
    1.68, // 18:00 Dinner surge I
    1.82, // 19:00 Primary Evening Peak (T+11h when base is 08:00)
    1.64, // 20:00 Dinner surge II
    1.32, // 21:00 Late evening orders
    0.94, // 22:00 Nightlife & pharmacy
    0.64, // 23:00 Late night wind-down
  ];

  const getRegimeForHour = (hour24: number): { en: string; th: string } => {
    if (hour24 >= 1 && hour24 <= 5) {
      return { en: 'Overnight Trough & Fleet Maintenance', th: 'ช่วงคำสั่งซื้อต่ำสุดกลางดึก' };
    }
    if (hour24 >= 6 && hour24 <= 9) {
      return { en: 'Morning Commute & Breakfast Wave', th: 'คลื่นมื้อเช้าและชั่วโมงเร่งด่วนเช้า' };
    }
    if (hour24 >= 11 && hour24 <= 13) {
      return { en: 'Midday Commercial & CBD Lunch Peak', th: 'พีคมื้อกลางวันย่านธุรกิจ (CBD)' };
    }
    if (hour24 >= 17 && hour24 <= 20) {
      return { en: 'Primary Evening Dinner & Grocery Surge', th: 'พีคสูงสุดมื้อค่ำและซูเปอร์มาร์เก็ต' };
    }
    if (hour24 >= 21 || hour24 === 0) {
      return { en: 'Late-Night Hospitality & Express Tail', th: 'คำสั่งซื้อรอบดึกและร้านอาหารกลางคืน' };
    }
    return { en: 'Daytime Inter-Peak Baseline', th: 'ช่วงเวลาปกติระหว่างวัน' };
  };

  // Helper to compute projected volume for a given volatility scenario at a specific hour & step
  const computeScenarioVolume = (
    scenario: VolatilityScenario,
    historicalAvgOrders: number,
    hourOfDay: number,
    step: number,
    activeModel: { biasMultiplier: number; peakSharpness: number }
  ): number => {
    const vMeta = volatilityMeta[scenario];
    const isPeakWindow =
      (hourOfDay >= 11 && hourOfDay <= 13) || (hourOfDay >= 17 && hourOfDay <= 21);
    const isInterPeakDip =
      (hourOfDay >= 14 && hourOfDay <= 16) || (hourOfDay >= 1 && hourOfDay <= 5);

    const growthMultiplier = 1 + macroGrowthDriftPct / 100;
    const impulseMultiplier = isPeakWindow
      ? 1 + (weatherEventImpulsePct / 100) * activeModel.peakSharpness
      : 1 + (weatherEventImpulsePct / 100) * 0.35;

    // High-frequency intraday volatility wave (amplified in HIGH, smoothed in LOW)
    const harmonicShock =
      Math.sin(step * 1.45) * 0.55 + Math.cos(step * 0.9 + hourOfDay * 0.4) * 0.45;

    let scenarioDynamicFactor = 1.0;
    if (scenario === 'HIGH') {
      if (isPeakWindow) {
        // Pronounced peak amplification + convective micro-bursts
        scenarioDynamicFactor =
          vMeta.peakAmplifier + Math.max(0, harmonicShock) * 0.14;
      } else if (isInterPeakDip) {
        // Sharper post-rush drops / inter-peak troughs
        scenarioDynamicFactor =
          vMeta.troughDampener - Math.abs(harmonicShock) * 0.08;
      } else {
        // Intraday stochastic oscillation
        scenarioDynamicFactor = 1.0 + harmonicShock * 0.18;
      }
    } else {
      // LOW Volatility: smoothed progression toward moving average
      if (isPeakWindow) {
        scenarioDynamicFactor = vMeta.peakAmplifier + harmonicShock * 0.025;
      } else if (isInterPeakDip) {
        scenarioDynamicFactor = vMeta.troughDampener + harmonicShock * 0.02;
      } else {
        scenarioDynamicFactor = 1.0 + harmonicShock * 0.03;
      }
    }

    return Math.max(
      10,
      Math.round(
        historicalAvgOrders *
          activeModel.biasMultiplier *
          growthMultiplier *
          impulseMultiplier *
          scenarioDynamicFactor
      )
    );
  };

  // Generate -6h history + 24h future time-series data (anchored at 08:00 Local = NOW)
  const timeSeriesData = useMemo<HourlyDemandPoint[]>(() => {
    const baseHourLocal = 8; // 08:00 Local is T+0h (NOW)
    const activeModel = modelMeta[historicalModel];
    const activeVolatility = volatilityMeta[volatilityScenario];
    const oppositeScenario: VolatilityScenario = volatilityScenario === 'HIGH' ? 'LOW' : 'HIGH';

    // Base hourly order volume derived from city or specific sub-zone
    const baseHourlyOrders = selectedZoneObj
      ? selectedZoneObj.demandReqMin * 60
      : city.zones.reduce((acc, z) => acc + z.demandReqMin * 60, 0);

    // Nominal hourly dispatch capacity before SLA degradation
    const baseHourlyCapacity = selectedZoneObj
      ? Math.round(selectedZoneObj.availableCouriers * 2.85 * 60 * 0.42)
      : Math.round(city.availableCouriers * 2.45);

    const points: HourlyDemandPoint[] = [];

    for (let step = -6; step <= 24; step++) {
      const hourOfDay = (((baseHourLocal + step) % 24) + 24) % 24;
      const clockLabel = `${hourOfDay.toString().padStart(2, '0')}:00`;
      const horizonLabel =
        step === 0 ? 'NOW' : step < 0 ? `T${step}h` : `T+${step}h`;

      const diurnalFactor = diurnalMultipliers[hourOfDay];
      const waveSeed = Math.sin(step * 0.85 + city.healthScore * 0.1);

      // Historical 4-week average for this exact hour of day
      const historicalAvgOrders = Math.round(
        baseHourlyOrders * diurnalFactor * (1 + waveSeed * 0.03)
      );

      // Last week same day (7d lag)
      const lastWeekSameDayOrders = Math.round(
        historicalAvgOrders * (0.96 + Math.cos(step * 0.7) * 0.05)
      );

      // Dynamic capacity threshold
      const shiftCapacityFactor =
        hourOfDay >= 11 && hourOfDay <= 21
          ? 1.28
          : hourOfDay >= 7 && hourOfDay <= 10
          ? 1.05
          : 0.78;
      const capacityThreshold = Math.round(baseHourlyCapacity * shiftCapacityFactor);

      const rawForecast = computeScenarioVolume(
        volatilityScenario,
        historicalAvgOrders,
        hourOfDay,
        step,
        activeModel
      );

      const rawCounterfactual = computeScenarioVolume(
        oppositeScenario,
        historicalAvgOrders,
        hourOfDay,
        step,
        activeModel
      );

      const isHistory = step < 0;
      const isNow = step === 0;

      // Actual observed orders for T-6h .. NOW
      const actualOrders =
        step <= 0
          ? Math.round(
              historicalAvgOrders *
                (1 + macroGrowthDriftPct / 100) *
                (1 + Math.sin(step * 1.3) * 0.04)
            )
          : null;

      // Projected orders from NOW (T+0h) to T+24h so lines connect cleanly at NOW
      const projectedOrders = step >= 0 ? (step === 0 ? actualOrders : rawForecast) : null;
      const counterfactualOrders =
        step >= 0 ? (step === 0 ? actualOrders : rawCounterfactual) : null;

      // Uncertainty widens with horizon sqrt(step) and scales by volatility bandMultiplier
      const horizonSpread =
        step >= 0
          ? activeModel.uncertaintySpread *
            activeVolatility.bandMultiplier *
            (0.65 + Math.sqrt(Math.max(1, step)) * 0.14)
          : 0;

      const p90UpperBand =
        projectedOrders !== null ? Math.round(projectedOrders * (1 + horizonSpread)) : null;
      const p10LowerBand =
        projectedOrders !== null
          ? Math.round(projectedOrders * Math.max(0.25, 1 - horizonSpread * 0.85))
          : null;

      const comparisonVolume = projectedOrders ?? actualOrders ?? historicalAvgOrders;
      const varianceDeltaOrders = comparisonVolume - historicalAvgOrders;
      const varianceVsHistoricalPct = +(
        ((comparisonVolume - historicalAvgOrders) / Math.max(1, historicalAvgOrders)) *
        100
      ).toFixed(1);

      let breachRisk: HourlyDemandPoint['breachRisk'] = 'NOMINAL';
      if (comparisonVolume > capacityThreshold * 1.02) {
        breachRisk = 'CRITICAL_SURGE';
      } else if (
        comparisonVolume > capacityThreshold * 0.88 ||
        (p90UpperBand ?? 0) > capacityThreshold * 1.03
      ) {
        breachRisk = 'ELEVATED';
      }

      const regime = getRegimeForHour(hourOfDay);

      points.push({
        stepIndex: step,
        horizonLabel,
        clockLabel,
        isHistory,
        isNow,
        historicalAvgOrders,
        lastWeekSameDayOrders,
        actualOrders,
        projectedOrders,
        counterfactualOrders,
        p90UpperBand,
        p10LowerBand,
        confidenceRange:
          p10LowerBand !== null && p90UpperBand !== null ? [p10LowerBand, p90UpperBand] : null,
        capacityThreshold,
        varianceVsHistoricalPct,
        varianceDeltaOrders,
        intradayVolatilitySigma: +(
          activeVolatility.sigmaIndex *
          (1 + Math.abs(Math.sin(step * 0.9)) * 0.25)
        ).toFixed(2),
        regimeNameEn: regime.en,
        regimeNameTh: regime.th,
        breachRisk,
      });
    }

    return points;
  }, [
    city,
    selectedZoneObj,
    volatilityScenario,
    historicalModel,
    macroGrowthDriftPct,
    weatherEventImpulsePct,
  ]);

  // Extract future 24h points (T+1h to T+24h) for summary KPIs
  const future24hPoints = useMemo(
    () => timeSeriesData.filter((d) => d.stepIndex >= 1),
    [timeSeriesData]
  );

  const summaryMetrics = useMemo(() => {
    const totalProjected24h = future24hPoints.reduce(
      (sum, p) => sum + (p.projectedOrders || 0),
      0
    );
    const totalCounterfactual24h = future24hPoints.reduce(
      (sum, p) => sum + (p.counterfactualOrders || 0),
      0
    );
    const totalHistorical24h = future24hPoints.reduce(
      (sum, p) => sum + p.historicalAvgOrders,
      0
    );
    const totalDeltaPct = +(
      ((totalProjected24h - totalHistorical24h) / Math.max(1, totalHistorical24h)) *
      100
    ).toFixed(1);

    const peakPoint = future24hPoints.reduce(
      (maxP, p) => ((p.projectedOrders || 0) > (maxP.projectedOrders || 0) ? p : maxP),
      future24hPoints[0]
    );

    const troughPoint = future24hPoints.reduce(
      (minP, p) => ((p.projectedOrders || 0) < (minP.projectedOrders || 0) ? p : minP),
      future24hPoints[0]
    );

    const peakToTroughRatio = +(
      (peakPoint?.projectedOrders || 1) / Math.max(1, troughPoint?.projectedOrders || 1)
    ).toFixed(2);

    const breachWindows = future24hPoints.filter((p) => p.breachRisk === 'CRITICAL_SURGE');
    const elevatedWindows = future24hPoints.filter((p) => p.breachRisk === 'ELEVATED');

    const effectiveWape = +(
      modelMeta[historicalModel].wapePct + volatilityMeta[volatilityScenario].wapePenalty
    ).toFixed(1);

    return {
      totalProjected24h,
      totalCounterfactual24h,
      totalHistorical24h,
      totalDeltaPct,
      peakPoint,
      troughPoint,
      peakToTroughRatio,
      breachCount: breachWindows.length,
      elevatedCount: elevatedWindows.length,
      breachWindows,
      effectiveWape,
    };
  }, [future24hPoints, historicalModel, volatilityScenario]);

  const inspectedPoint = useMemo(
    () =>
      timeSeriesData.find((p) => p.stepIndex === inspectedStep) ||
      timeSeriesData.find((p) => p.stepIndex === 11) ||
      timeSeriesData[0],
    [timeSeriesData, inspectedStep]
  );

  const activeVolMeta = volatilityMeta[volatilityScenario];

  // Export 24h Forecast CSV handler
  const handleExportCsv = () => {
    const headers = [
      'Horizon',
      'Local_Clock',
      'Volatility_Scenario',
      'Historical_Baseline_Orders',
      'Last_Week_Orders',
      'Actual_Orders',
      'Projected_Orders_24h',
      'P10_Lower_Bound',
      'P90_Upper_Bound',
      'Capacity_Threshold',
      'Variance_Pct',
      'Risk_Status',
    ];
    const rows = timeSeriesData.map((r) =>
      [
        r.horizonLabel,
        r.clockLabel,
        volatilityScenario,
        r.historicalAvgOrders,
        r.lastWeekSameDayOrders,
        r.actualOrders ?? '',
        r.projectedOrders ?? '',
        r.p10LowerBand ?? '',
        r.p90UpperBand ?? '',
        r.capacityThreshold,
        `${r.varianceVsHistoricalPct}%`,
        r.breachRisk,
      ].join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `aeon_demand_forecast_24h_${city.cluster}_${volatilityScenario.toLowerCase()}_vol.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 space-y-5">
      {/* Top Header Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-cyan-400">
            <TrendingUp className="w-4 h-4" />
            <span className="font-semibold uppercase tracking-wider">
              {isThai
                ? 'การพยากรณ์ความต้องการล่วงหน้า 24 ชั่วโมง (Time-Series Demand Forecasting)'
                : 'Predictive Demand Forecasting · 24-Hour Time-Series Horizon'}
            </span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span
              className={`font-semibold ${
                volatilityScenario === 'HIGH' ? 'text-amber-400' : 'text-cyan-300'
              }`}
            >
              {isThai ? activeVolMeta.labelTh : activeVolMeta.labelEn} (σ = {activeVolMeta.sigmaIndex})
            </span>
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight mt-1">
            {isThai
              ? `คาดการณ์ปริมาณคำสั่งซื้อรายชั่วโมง (T+1h ถึง T+24h) — ${city.cityName}`
              : `24-Hour Order Volume Projection & Volatility Simulation — ${city.cityName}`}
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5 max-w-3xl leading-relaxed">
            {isThai ? activeVolMeta.descTh : activeVolMeta.descEn}
          </p>
        </div>

        {/* Right Actions: Volatility Scenario Toggle + View Mode + CSV Export */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Primary Volatility Scenario Control ('Low' vs 'High') */}
          <div
            role="group"
            aria-label="Volatility Scenario Simulation"
            className="flex items-center bg-neutral-950 border border-neutral-800 rounded-lg p-1 text-xs font-mono"
          >
            <span className="px-2.5 py-1 text-[10px] text-neutral-400 uppercase tracking-wider hidden sm:inline-block">
              {isThai ? 'ความผันผวน:' : 'Volatility:'}
            </span>
            <button
              type="button"
              onClick={() => setVolatilityScenario('LOW')}
              className={`px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                volatilityScenario === 'LOW'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Waves className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isThai ? 'ความผันผวนต่ำ (Low)' : 'Low Volatility'}</span>
            </button>
            <button
              type="button"
              onClick={() => setVolatilityScenario('HIGH')}
              className={`px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                volatilityScenario === 'HIGH'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{isThai ? 'ความผันผวนสูง (High)' : 'High Volatility'}</span>
            </button>
          </div>

          <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-lg p-1 text-xs font-mono">
            <button
              type="button"
              onClick={() => setChartViewMode('volume_curve')}
              className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                chartViewMode === 'volume_curve'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {isThai ? 'กราฟเส้นปริมาณ (24h Curve)' : '24h Volume Curve'}
            </button>
            <button
              type="button"
              onClick={() => setChartViewMode('variance_delta')}
              className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                chartViewMode === 'variance_delta'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {isThai ? 'ส่วนต่างเทียบค่าเฉลี่ย (Trend Delta)' : 'Historical Variance'}
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-2 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 text-xs font-mono flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isThai ? 'ส่งออก CSV' : 'Export 24h CSV'}</span>
          </button>
        </div>
      </div>

      {/* Control Strip: Partition Scope + Volatility Regime Simulator + Historical Trend Cohort + Signal Modifiers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-neutral-950/80 p-4 rounded-xl border border-neutral-800/90">
        {/* Partition / Zone Filter (3 cols) */}
        <div className="lg:col-span-3 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isThai ? 'ขอบเขตพื้นที่พยากรณ์ (Scope)' : 'FORECAST PARTITION SCOPE'}</span>
            </span>
            <span className="text-neutral-500">{city.cluster}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleSelectScope('ALL_CITY')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                scopeZoneId === 'ALL_CITY'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                  : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-neutral-200'
              }`}
            >
              {isThai ? 'ทั้งเมือง (City-Wide)' : 'All City Zones'}
            </button>
            {city.zones.map((z) => (
              <button
                type="button"
                key={z.id}
                onClick={() => handleSelectScope(z.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                  scopeZoneId === z.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                    : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-neutral-200'
                }`}
              >
                {z.id}
              </button>
            ))}
          </div>
          <div className="text-[11px] text-neutral-500 font-mono">
            {selectedZoneObj
              ? `${selectedZoneObj.id}: ${selectedZoneObj.name} (${selectedZoneObj.demandReqMin} req/m current)`
              : isThai
              ? `รวมทุกโซนปฏิบัติการใน ${city.cityName} (${city.zones.length} โซน)`
              : `Aggregated across all ${city.zones.length} operational zones in ${city.cityName}`}
          </div>
        </div>

        {/* Dedicated Volatility Scenario Simulator Control Panel (3 cols) */}
        <div className="lg:col-span-3 space-y-2 lg:border-l lg:border-neutral-800 lg:pl-4">
          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
            <span className="flex items-center gap-1.5">
              <Zap
                className={`w-3.5 h-3.5 ${
                  volatilityScenario === 'HIGH' ? 'text-amber-400' : 'text-cyan-400'
                }`}
              />
              <span>
                {isThai ? 'จำลองระดับความผันผวน (Volatility)' : 'VOLATILITY SCENARIO SIMULATOR'}
              </span>
            </span>
            <span
              className={`font-semibold tabular-nums ${
                volatilityScenario === 'HIGH' ? 'text-amber-400' : 'text-cyan-400'
              }`}
            >
              σ = {activeVolMeta.sigmaIndex}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setVolatilityScenario('LOW')}
              className={`p-2.5 rounded-lg border text-left font-mono transition cursor-pointer ${
                volatilityScenario === 'LOW'
                  ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-200'
                  : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span>{isThai ? 'ต่ำ (Low)' : 'Low Volatility'}</span>
                <Waves className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-[10px] text-neutral-400 mt-1">
                {isThai ? 'พีคเสถียร · กรอบ ±7%' : 'Smoothed Curve · ±7% Band'}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setVolatilityScenario('HIGH')}
              className={`p-2.5 rounded-lg border text-left font-mono transition cursor-pointer ${
                volatilityScenario === 'HIGH'
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-200'
                  : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span>{isThai ? 'สูง (High)' : 'High Volatility'}</span>
                <Zap className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-[10px] text-neutral-400 mt-1">
                {isThai ? 'พีคกระชาก +26% · กรอบ ±20%' : 'Surge Spikes +26% · ±20% Band'}
              </div>
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 pt-0.5">
            <span>
              {isThai ? 'อัตราส่วนพีคต่อช่วงต่ำสุด:' : 'Peak-to-Trough Spread:'}{' '}
              <strong className="text-white tabular-nums">{summaryMetrics.peakToTroughRatio}x</strong>
            </span>
            <label className="flex items-center gap-1.5 text-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showCounterfactualCurve}
                onChange={(e) => setShowCounterfactualCurve(e.target.checked)}
                className="accent-cyan-400 rounded cursor-pointer"
              />
              <span>
                {isThai
                  ? `เทียบเส้น ${volatilityScenario === 'HIGH' ? 'Low' : 'High'}`
                  : `Compare ${volatilityScenario === 'HIGH' ? 'Low' : 'High'} Line`}
              </span>
            </label>
          </div>
        </div>

        {/* Historical Baseline Cohort Selector (3 cols) */}
        <div className="lg:col-span-3 space-y-2 lg:border-l lg:border-neutral-800 lg:pl-4">
          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isThai ? 'โมเดลฐานข้อมูลในอดีต (Cohort)' : 'HISTORICAL BASELINE COHORT'}</span>
            </span>
            <span className="text-emerald-400 tabular-nums">
              WAPE: {summaryMetrics.effectiveWape}%
            </span>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {(['4w_dow_ema', 'yoy_seasonal', 'event_weather_analog'] as HistoricalModelId[]).map(
              (mId) => {
                const active = historicalModel === mId;
                const m = modelMeta[mId];
                return (
                  <button
                    type="button"
                    key={mId}
                    onClick={() => setHistoricalModel(mId)}
                    className={`text-left px-3 py-1.5 rounded-lg border text-xs font-mono transition cursor-pointer flex items-center justify-between ${
                      active
                        ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200 font-semibold'
                        : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <span className="truncate">{isThai ? m.nameTh : m.nameEn}</span>
                    <span className="text-[10px] text-neutral-500 ml-2 shrink-0">
                      ±{Math.round(m.uncertaintySpread * activeVolMeta.bandMultiplier * 100)}%
                    </span>
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* Trend Drift & Impulse Sliders + Layer Toggles (3 cols) */}
        <div className="lg:col-span-3 space-y-3 lg:border-l lg:border-neutral-800 lg:pl-4">
          <div>
            <div className="flex justify-between text-[11px] font-mono mb-1">
              <span className="text-neutral-400 flex items-center gap-1">
                <Sliders className="w-3 h-3 text-cyan-400" />
                {isThai ? 'แนวโน้มการเติบโต (Macro Trend)' : 'Macro Trend Velocity Drift'}
              </span>
              <span className="text-cyan-400 font-bold tabular-nums">
                {macroGrowthDriftPct >= 0 ? `+${macroGrowthDriftPct}%` : `${macroGrowthDriftPct}%`}
              </span>
            </div>
            <input
              type="range"
              min={-15}
              max={30}
              step={1}
              value={macroGrowthDriftPct}
              onChange={(e) => setMacroGrowthDriftPct(Number(e.target.value))}
              className="w-full accent-cyan-400 bg-neutral-800 h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] font-mono mb-1">
              <span className="text-neutral-400">
                {isThai ? 'แรงกระตุ้นช่วงพีค (Peak Surge)' : 'Peak Window Surge Impulse'}
              </span>
              <span className="text-amber-400 font-bold tabular-nums">+{weatherEventImpulsePct}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={40}
              step={2}
              value={weatherEventImpulsePct}
              onChange={(e) => setWeatherEventImpulsePct(Number(e.target.value))}
              className="w-full accent-amber-400 bg-neutral-800 h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-1 text-[11px] font-mono">
            <label className="flex items-center gap-1.5 text-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showConfidenceBand}
                onChange={(e) => setShowConfidenceBand(e.target.checked)}
                className="accent-cyan-400 rounded cursor-pointer"
              />
              <span>{isThai ? 'กรอบ P10–P90' : 'P10–P90 Band'}</span>
            </label>
            <label className="flex items-center gap-1.5 text-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showLastWeekCurve}
                onChange={(e) => setShowLastWeekCurve(e.target.checked)}
                className="accent-cyan-400 rounded cursor-pointer"
              />
              <span>{isThai ? 'สัปดาห์ก่อน (-7d)' : '7-Day Lag'}</span>
            </label>
          </div>
        </div>
      </div>

      {/* 4 Key 24-Hour Projection KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-neutral-950/90 border border-neutral-800 rounded-xl p-3.5">
          <div className="text-[11px] font-mono text-neutral-400 flex items-center justify-between">
            <span>{isThai ? 'ปริมาณคำสั่งซื้อรวม 24 ชม. ข้างหน้า' : 'PROJECTED 24H VOLUME'}</span>
            <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white tabular-nums">
              {summaryMetrics.totalProjected24h.toLocaleString()}
            </span>
            <span
              className={`text-xs font-mono font-semibold tabular-nums ${
                summaryMetrics.totalDeltaPct >= 0 ? 'text-cyan-400' : 'text-amber-400'
              }`}
            >
              {summaryMetrics.totalDeltaPct >= 0
                ? `+${summaryMetrics.totalDeltaPct}%`
                : `${summaryMetrics.totalDeltaPct}%`}{' '}
              vs Hist
            </span>
          </div>
          <div className="mt-1 text-[11px] font-mono text-neutral-500 tabular-nums">
            {isThai ? 'ค่าเฉลี่ยในอดีต 24 ชม.:' : 'Historical 24h Baseline:'}{' '}
            {summaryMetrics.totalHistorical24h.toLocaleString()} orders
          </div>
        </div>

        <div className="bg-neutral-950/90 border border-neutral-800 rounded-xl p-3.5">
          <div className="text-[11px] font-mono text-neutral-400 flex items-center justify-between">
            <span>{isThai ? 'ชั่วโมงพีคสูงสุดที่คาดการณ์ (24h Peak)' : 'PROJECTED PEAK HOUR'}</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-300 tabular-nums">
              {(summaryMetrics.peakPoint?.projectedOrders || 0).toLocaleString()}
            </span>
            <span className="text-xs font-mono text-neutral-300">
              orders/hr @ {summaryMetrics.peakPoint?.clockLabel} (
              {summaryMetrics.peakPoint?.horizonLabel})
            </span>
          </div>
          <div className="mt-1 text-[11px] font-mono text-neutral-500 tabular-nums">
            P90 Upper Surge:{' '}
            {(summaryMetrics.peakPoint?.p90UpperBand || 0).toLocaleString()} orders/hr (
            {Math.round((summaryMetrics.peakPoint?.projectedOrders || 0) / 60)} req/m)
          </div>
        </div>

        <div className="bg-neutral-950/90 border border-neutral-800 rounded-xl p-3.5">
          <div className="text-[11px] font-mono text-neutral-400 flex items-center justify-between">
            <span>{isThai ? 'หน้าต่างเวลาที่เสี่ยงเกินความจุ' : 'CAPACITY BREACH WINDOWS'}</span>
            <AlertTriangle
              className={`w-3.5 h-3.5 ${
                summaryMetrics.breachCount > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono tabular-nums ${
                summaryMetrics.breachCount > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {summaryMetrics.breachCount} hrs
            </span>
            <span className="text-xs font-mono text-neutral-400 tabular-nums">
              · {summaryMetrics.elevatedCount} hrs elevated risk
            </span>
          </div>
          <div className="mt-1 text-[11px] font-mono text-neutral-500 truncate">
            {summaryMetrics.breachWindows.length > 0
              ? `Critical @ ${summaryMetrics.breachWindows.map((w) => w.clockLabel).join(', ')}`
              : isThai
              ? 'ปริมาณคำสั่งซื้ออยู่ในเกณฑ์รองรับได้ตลอด 24 ชม.'
              : 'All 24h intervals within nominal fleet capacity'}
          </div>
        </div>

        <div className="bg-neutral-950/90 border border-neutral-800 rounded-xl p-3.5">
          <div className="text-[11px] font-mono text-neutral-400 flex items-center justify-between">
            <span>
              {isThai
                ? 'ดัชนีความผันผวนและความแม่นยำ (Volatility & WAPE)'
                : 'VOLATILITY REGIME & ACCURACY'}
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono tabular-nums ${
                volatilityScenario === 'HIGH' ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {(100 - summaryMetrics.effectiveWape).toFixed(1)}%
            </span>
            <span className="text-xs font-mono text-neutral-400 tabular-nums">
              ({volatilityScenario} VOL · σ={activeVolMeta.sigmaIndex})
            </span>
          </div>
          <div className="mt-1 text-[11px] font-mono text-neutral-500">
            {isThai
              ? `ความต่างพีค-ต่ำสุด ${summaryMetrics.peakToTroughRatio} เท่า (WAPE ${summaryMetrics.effectiveWape}%)`
              : `Peak/Trough ratio ${summaryMetrics.peakToTroughRatio}x · ${summaryMetrics.effectiveWape}% WAPE`}
          </div>
        </div>
      </div>

      {/* Main Time-Series Chart + Interactive Hour Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 8 Cols: Recharts Time-Series Visualization */}
        <div className="lg:col-span-8 bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
                <Activity
                  className={`w-3.5 h-3.5 ${
                    volatilityScenario === 'HIGH' ? 'text-amber-400' : 'text-cyan-400'
                  }`}
                />
                <span>
                  {chartViewMode === 'volume_curve'
                    ? isThai
                      ? `กราฟเส้นคาดการณ์คำสั่งซื้อ 24 ชม. (${activeVolMeta.shortTh})`
                      : `24-Hour Projected Order Volume Line Chart (${activeVolMeta.shortEn})`
                    : isThai
                    ? 'ส่วนต่างปริมาณคำสั่งซื้อรายชั่วโมงเทียบกับค่าเฉลี่ยในอดีต (Orders vs. Historical Baseline)'
                    : 'Hourly Demand Variance vs. Historical Trend Baseline (Orders/Hr Delta)'}
                </span>
              </div>
              <div className="text-[11px] font-mono text-neutral-500 mt-0.5">
                {isThai
                  ? 'สลับปุ่ม Low / High Volatility ด้านบนเพื่อดูการเปลี่ยนแปลงของเส้นพยากรณ์และกรอบความเชื่อมั่นแบบเรียลไทม์'
                  : 'Toggle Low vs. High Volatility to dynamically simulate smoothed vs. turbulent 24h order trajectories'}
              </div>
            </div>

            {/* Clean inline legend */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-neutral-400">
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-2.5 h-0.5 inline-block ${
                    volatilityScenario === 'HIGH' ? 'bg-amber-400' : 'bg-cyan-400'
                  }`}
                />
                <span>
                  24h Forecast ({volatilityScenario === 'HIGH' ? 'High Vol' : 'Low Vol'})
                </span>
              </span>
              {showCounterfactualCurve && (
                <span className="flex items-center gap-1.5">
                  <span
                    className={`w-2.5 h-0.5 border-b border-dashed inline-block ${
                      volatilityScenario === 'HIGH'
                        ? 'border-cyan-400/70'
                        : 'border-amber-400/70'
                    }`}
                  />
                  <span>
                    {volatilityScenario === 'HIGH' ? 'Low Vol Ref' : 'High Vol Ref'}
                  </span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" />
                <span>Actual</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-neutral-400 border-b border-dashed border-neutral-400 inline-block" />
                <span>Hist Avg</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-rose-400 inline-block" />
                <span>Capacity</span>
              </span>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartViewMode === 'volume_curve' ? (
                <ComposedChart
                  data={timeSeriesData}
                  margin={{ top: 10, right: 16, left: 0, bottom: 5 }}
                  onClick={(state: any) => {
                    if (state && state.activePayload && state.activePayload[0]) {
                      const clickedPoint = state.activePayload[0].payload as HourlyDemandPoint;
                      setInspectedStep(clickedPoint.stepIndex);
                    }
                  }}
                >
                  <defs>
                    <linearGradient id="forecastFillGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={activeVolMeta.strokeColor}
                        stopOpacity={0.25}
                      />
                      <stop
                        offset="95%"
                        stopColor={activeVolMeta.strokeColor}
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                    <linearGradient id="bandFillGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={activeVolMeta.strokeColor}
                        stopOpacity={volatilityScenario === 'HIGH' ? 0.22 : 0.14}
                      />
                      <stop
                        offset="100%"
                        stopColor={activeVolMeta.strokeColor}
                        stopOpacity={0.03}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                  <XAxis
                    dataKey="clockLabel"
                    stroke="#737373"
                    tick={{ fill: '#a3a3a3', fontSize: 10, fontFamily: 'monospace' }}
                    interval={2}
                  />
                  <YAxis
                    stroke="#737373"
                    tick={{ fill: '#a3a3a3', fontSize: 10, fontFamily: 'monospace' }}
                    tickFormatter={(val) =>
                      val >= 1000 ? `${(val / 1000).toFixed(1)}k` : `${val}`
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0a0a0a',
                      borderColor: '#262626',
                      borderRadius: '0.5rem',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                    }}
                    formatter={(value: any, name: any) => {
                      const labelStr = String(name ?? '');
                      if (value === null || value === undefined) return ['—', labelStr];
                      if (Array.isArray(value)) {
                        return [
                          `${value[0].toLocaleString()} – ${value[1].toLocaleString()}`,
                          labelStr,
                        ];
                      }
                      return [`${Number(value).toLocaleString()} orders/hr`, labelStr];
                    }}
                    labelFormatter={(label, payload) => {
                      const pt = payload?.[0]?.payload as HourlyDemandPoint | undefined;
                      if (!pt) return label;
                      return `${pt.clockLabel} Local (${pt.horizonLabel}) · ${
                        isThai ? pt.regimeNameTh : pt.regimeNameEn
                      } [${volatilityScenario} VOL]`;
                    }}
                  />

                  {/* Reference line for NOW (T+0h) */}
                  <ReferenceLine
                    x="08:00"
                    stroke="#f59e0b"
                    strokeDasharray="3 3"
                    label={{
                      value: 'NOW (08:00)',
                      position: 'top',
                      fill: '#fbbf24',
                      fontSize: 10,
                      fontFamily: 'monospace',
                    }}
                  />

                  {/* P10-P90 Confidence Band */}
                  {showConfidenceBand && (
                    <Area
                      type="monotone"
                      dataKey="confidenceRange"
                      name="P10–P90 Confidence Band"
                      stroke="none"
                      fill="url(#bandFillGrad)"
                      isAnimationActive={false}
                    />
                  )}

                  {/* Subtle Underfill for Projected 24h Volume */}
                  <Area
                    type="monotone"
                    dataKey="projectedOrders"
                    name="Projected Surface Fill"
                    stroke="none"
                    fill="url(#forecastFillGrad)"
                    tooltipType="none"
                    isAnimationActive={false}
                  />

                  {/* 7-Day Lag Same Weekday Curve */}
                  {showLastWeekCurve && (
                    <Line
                      type="monotone"
                      dataKey="lastWeekSameDayOrders"
                      name="Last Week (-7d)"
                      stroke="#525252"
                      strokeWidth={1.25}
                      dot={false}
                      isAnimationActive={false}
                    />
                  )}

                  {/* Historical Baseline Trend (4W Moving Average) */}
                  <Line
                    type="monotone"
                    dataKey="historicalAvgOrders"
                    name="Historical Baseline"
                    stroke="#a3a3a3"
                    strokeWidth={1.75}
                    strokeDasharray="4 4"
                    dot={false}
                    isAnimationActive={false}
                  />

                  {/* Alternate Volatility Reference Curve (Counterfactual) */}
                  {showCounterfactualCurve && (
                    <Line
                      type="monotone"
                      dataKey="counterfactualOrders"
                      name={
                        volatilityScenario === 'HIGH'
                          ? 'Low Volatility Reference'
                          : 'High Volatility Reference'
                      }
                      stroke={volatilityScenario === 'HIGH' ? '#22d3ee' : '#f59e0b'}
                      strokeOpacity={0.55}
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                      dot={false}
                      isAnimationActive={false}
                    />
                  )}

                  {/* Fleet SLA Capacity Threshold */}
                  <Line
                    type="stepAfter"
                    dataKey="capacityThreshold"
                    name="Nominal SLA Capacity"
                    stroke="#f43f5e"
                    strokeWidth={1.5}
                    strokeDasharray="2 3"
                    dot={false}
                    isAnimationActive={false}
                  />

                  {/* Realized Orders (T-6h to NOW) */}
                  <Line
                    type="monotone"
                    dataKey="actualOrders"
                    name="Realized Orders (Actual)"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 2.5, fill: '#10b981' }}
                    isAnimationActive={false}
                  />

                  {/* Primary 24-Hour Projected Order Volume Line */}
                  <Line
                    type="monotone"
                    dataKey="projectedOrders"
                    name={`Projected 24h Volume (${volatilityScenario} Vol)`}
                    stroke={activeVolMeta.strokeColor}
                    strokeWidth={2.75}
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (payload.projectedOrders === null) return <g key={props.key} />;
                      if (payload.stepIndex === inspectedStep) {
                        return (
                          <circle
                            key={props.key}
                            cx={cx}
                            cy={cy}
                            r={5}
                            fill={activeVolMeta.strokeColor}
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                        );
                      }
                      if (payload.breachRisk === 'CRITICAL_SURGE') {
                        return (
                          <circle
                            key={props.key}
                            cx={cx}
                            cy={cy}
                            r={3.5}
                            fill="#f43f5e"
                            stroke="#0a0a0a"
                            strokeWidth={1}
                          />
                        );
                      }
                      return <g key={props.key} />;
                    }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              ) : (
                <ComposedChart
                  data={timeSeriesData}
                  margin={{ top: 10, right: 16, left: 0, bottom: 5 }}
                  onClick={(state: any) => {
                    if (state && state.activePayload && state.activePayload[0]) {
                      const clickedPoint = state.activePayload[0].payload as HourlyDemandPoint;
                      setInspectedStep(clickedPoint.stepIndex);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                  <XAxis
                    dataKey="clockLabel"
                    stroke="#737373"
                    tick={{ fill: '#a3a3a3', fontSize: 10, fontFamily: 'monospace' }}
                    interval={2}
                  />
                  <YAxis
                    stroke="#737373"
                    tick={{ fill: '#a3a3a3', fontSize: 10, fontFamily: 'monospace' }}
                    tickFormatter={(val) => (val > 0 ? `+${val}` : `${val}`)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0a0a0a',
                      borderColor: '#262626',
                      borderRadius: '0.5rem',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                    }}
                    formatter={(value: any, name: any) => [
                      `${Number(value) >= 0 ? '+' : ''}${Number(value).toLocaleString()} orders/hr`,
                      String(name ?? ''),
                    ]}
                  />
                  <ReferenceLine y={0} stroke="#525252" />
                  <ReferenceLine x="08:00" stroke="#f59e0b" strokeDasharray="3 3" />
                  <Bar
                    dataKey="varianceDeltaOrders"
                    name={`Order Delta vs Historical (${volatilityScenario} Vol)`}
                    fill={activeVolMeta.strokeColor}
                    radius={[3, 3, 0, 0]}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Interactive 24-Hour Scrubber Strip */}
          <div className="mt-3 pt-3 border-t border-neutral-800/80">
            <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mb-1.5">
              <span>
                {isThai
                  ? 'ตัวเลือกชั่วโมงพยากรณ์ (Horizon Scrubber):'
                  : 'INTERACTIVE 24-HOUR HORIZON SCRUBBER:'}{' '}
                <strong className="text-cyan-400">
                  {inspectedPoint.clockLabel} Local ({inspectedPoint.horizonLabel})
                </strong>
              </span>
              <span className="text-neutral-500">
                {isThai ? inspectedPoint.regimeNameTh : inspectedPoint.regimeNameEn}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={24}
              step={1}
              value={Math.max(1, inspectedStep)}
              onChange={(e) => setInspectedStep(Number(e.target.value))}
              className="w-full accent-cyan-400 bg-neutral-800 h-1.5 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-neutral-500 mt-1">
              <span>T+1h (09:00)</span>
              <span>T+6h (14:00 Lunch Tail)</span>
              <span>T+11h (19:00 Dinner Peak)</span>
              <span>T+18h (02:00 Trough)</span>
              <span>T+24h (08:00 Next Day)</span>
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Inspected Hour Decomposition & Advisory Handoff */}
        <div className="lg:col-span-4 bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-neutral-800">
              <div>
                <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                  {isThai ? 'วิเคราะห์เจาะลึกรายชั่วโมง' : 'HOURLY FORECAST INSPECTOR'}
                </div>
                <div className="text-base font-bold font-mono text-white mt-0.5">
                  {inspectedPoint.clockLabel} Local · {inspectedPoint.horizonLabel}
                </div>
              </div>
              <span
                className={`text-xs font-mono font-semibold ${
                  inspectedPoint.breachRisk === 'CRITICAL_SURGE'
                    ? 'text-rose-400'
                    : inspectedPoint.breachRisk === 'ELEVATED'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {inspectedPoint.breachRisk}
              </span>
            </div>

            {/* Regime Classification */}
            <div className="bg-neutral-900/70 p-3 rounded-lg border border-neutral-800/80 space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between text-[10px] text-neutral-500 uppercase">
                <span>{isThai ? 'รูปแบบความต้องการ (Demand Regime)' : 'TEMPORAL DEMAND REGIME'}</span>
                <span
                  className={
                    volatilityScenario === 'HIGH' ? 'text-amber-400 font-semibold' : 'text-cyan-400'
                  }
                >
                  {volatilityScenario} VOL (σ={inspectedPoint.intradayVolatilitySigma})
                </span>
              </div>
              <div className="text-neutral-200 font-semibold">
                {isThai ? inspectedPoint.regimeNameTh : inspectedPoint.regimeNameEn}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-800 text-[11px]">
                <div>
                  <span className="text-neutral-500 block">
                    {isThai
                      ? `คาดการณ์ (${volatilityScenario} Vol)`
                      : `Projected (${volatilityScenario} Vol)`}
                  </span>
                  <span
                    className={`font-bold text-sm tabular-nums ${
                      volatilityScenario === 'HIGH' ? 'text-amber-400' : 'text-cyan-400'
                    }`}
                  >
                    {(
                      inspectedPoint.projectedOrders ??
                      inspectedPoint.actualOrders ??
                      0
                    ).toLocaleString()}{' '}
                    /hr
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block">
                    {isThai
                      ? `เทียบความผันผวน ${volatilityScenario === 'HIGH' ? 'Low' : 'High'}`
                      : `${volatilityScenario === 'HIGH' ? 'Low' : 'High'} Vol Counterfactual`}
                  </span>
                  <span className="text-neutral-200 font-bold text-sm tabular-nums">
                    {(inspectedPoint.counterfactualOrders ?? 0).toLocaleString()} /hr
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block">
                    {isThai ? 'กรอบความเชื่อมั่น P10–P90' : 'P10–P90 Interval'}
                  </span>
                  <span className="text-neutral-300 tabular-nums">
                    {inspectedPoint.p10LowerBand?.toLocaleString() ?? '—'} –{' '}
                    {inspectedPoint.p90UpperBand?.toLocaleString() ?? '—'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block">
                    {isThai ? 'เพดานความจุ (SLA Cap)' : 'SLA Capacity Cap'}
                  </span>
                  <span className="text-rose-300 tabular-nums">
                    {inspectedPoint.capacityThreshold.toLocaleString()} /hr
                  </span>
                </div>
              </div>
            </div>

            {/* Upcoming Critical Windows Table */}
            <div>
              <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-2">
                {isThai
                  ? '4 ช่วงเวลาพีคสำคัญใน 24 ชั่วโมงข้างหน้า'
                  : 'KEY 24-HOUR DEMAND INFLECTION WINDOWS'}
              </div>
              <div className="space-y-1.5">
                {[4, 11, 13, 24].map((stepIdx) => {
                  const pt = timeSeriesData.find((p) => p.stepIndex === stepIdx);
                  if (!pt) return null;
                  const isActive = inspectedStep === stepIdx;
                  return (
                    <button
                      type="button"
                      key={stepIdx}
                      onClick={() => setInspectedStep(stepIdx)}
                      className={`w-full text-left px-3 py-2 rounded-lg border font-mono text-xs transition flex items-center justify-between cursor-pointer ${
                        isActive
                          ? 'bg-cyan-500/15 border-cyan-500/40 text-white'
                          : 'bg-neutral-900/50 border-neutral-800/80 text-neutral-300 hover:bg-neutral-900'
                      }`}
                    >
                      <div>
                        <span className="text-cyan-400 font-bold">{pt.clockLabel}</span>{' '}
                        <span className="text-neutral-500">({pt.horizonLabel})</span>
                        <span className="block text-[10px] text-neutral-400 truncate max-w-[170px]">
                          {isThai ? pt.regimeNameTh : pt.regimeNameEn}
                        </span>
                      </div>
                      <div className="text-right tabular-nums">
                        <div className="font-bold text-white">
                          {(pt.projectedOrders || 0).toLocaleString()} /hr
                        </div>
                        <div
                          className={`text-[10px] ${
                            pt.varianceVsHistoricalPct >= 0 ? 'text-cyan-400' : 'text-amber-400'
                          }`}
                        >
                          {pt.varianceVsHistoricalPct >= 0
                            ? `+${pt.varianceVsHistoricalPct}%`
                            : `${pt.varianceVsHistoricalPct}%`}{' '}
                          vs Hist
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Governance Handoff Footer */}
          <div className="pt-3 border-t border-neutral-800 space-y-2.5">
            <div className="flex items-start gap-2 text-[11px] font-mono text-neutral-400">
              <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span>
                {isThai
                  ? 'การพยากรณ์นี้เป็นข้อมูลเพื่อให้คำปรึกษา (Advisory-Only) การปรับโควตาไรเดอร์ล่วงหน้าต้องได้รับอนุมัติจากผู้ควบคุมระบบ'
                  : '24h demand projections are strictly advisory. Pre-positioning incentives require verified HUMAN_IN_THE_LOOP governance authorization.'}
              </span>
            </div>

            {onNavigateToGovernance && (
              <button
                type="button"
                onClick={() =>
                  onNavigateToGovernance({
                    source: 'PREDICTIVE_DEMAND_FORECAST_24H',
                    zone: scopeZoneId === 'ALL_CITY' ? city.cluster : scopeZoneId,
                    volatilityScenario,
                    horizon: inspectedPoint.horizonLabel,
                    projectedOrdersHr: inspectedPoint.projectedOrders,
                    historicalBaselineHr: inspectedPoint.historicalAvgOrders,
                    variancePct: inspectedPoint.varianceVsHistoricalPct,
                  })
                }
                className="w-full py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-mono font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <span>
                  {isThai
                    ? 'ส่งแผนรองรับความต้องการ 24 ชม. ไปยัง AEON GUARDIAN'
                    : 'Escalate 24h Peak Forecast to AEON GUARDIAN'}
                </span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
