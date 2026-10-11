import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Activity,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sliders,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Filter,
  RefreshCw,
  ArrowRight,
  Eye,
  Lock,
  Zap,
  BellOff,
} from 'lucide-react';
import { CityMarketplace } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface AnomalyDetectionSystemProps {
  city: CityMarketplace;
  activeOrdersSim: number;
  availableCouriersSim: number;
  cancellationRiskSim: number;
  avgSlaMinutesSim: number;
  demandSurgeFactor: number;
  courierDropFactor: number;
  onInjectTestAnomaly?: () => void;
  onNavigateToGovernance?: (advisoryData?: any) => void;
}

export interface DetectedAnomaly {
  id: string;
  metricKey: 'ACTIVE_ORDERS' | 'COURIER_AVAILABILITY' | 'CANCELLATION_RATE' | 'SLA_LATENCY';
  metricName: string;
  observedValue: string;
  baselineRange: string;
  zScore: number;
  confidencePct: number;
  persistedWindows: number;
  severity: 'WARNING' | 'CRITICAL';
  explanation: string;
  contributingFactors: string[];
  zoneImpact: string;
}

export const AnomalyDetectionSystem: React.FC<AnomalyDetectionSystemProps> = ({
  city,
  activeOrdersSim,
  availableCouriersSim,
  cancellationRiskSim,
  avgSlaMinutesSim,
  demandSurgeFactor,
  courierDropFactor,
  onInjectTestAnomaly,
  onNavigateToGovernance,
}) => {
  const { language } = useLanguage();
  const isThai = language === 'th';

  // False-Positive Minimization Controls
  const [zScoreThreshold, setZScoreThreshold] = useState<number>(2.5); // 2.0, 2.5, 3.0
  const [minPersistenceWindows, setMinPersistenceWindows] = useState<number>(3); // 1, 3, 5 windows
  const [seasonalNormalization, setSeasonalNormalization] = useState<boolean>(true);
  const [simulatedAnomalyBoost, setSimulatedAnomalyBoost] = useState<boolean>(false);

  // AI Deep Analysis State
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<Record<
    string,
    {
      explanation: string;
      contributingFactors: string[];
      falsePositiveAssessment: string;
      recommendedReviewAction: string;
      evidenceHash: string;
    }
  >>({});
  const [reviewedFactors, setReviewedFactors] = useState<Record<string, boolean>>({});

  // Calculate real-time Z-scores for monitored metrics
  const monitoredMetrics = useMemo(() => {
    const boost = simulatedAnomalyBoost ? 1.45 : 1.0;

    // 1. Active Orders Z-score
    const ordersRatio = (activeOrdersSim * boost) / city.activeOrders;
    const ordersZ = +((ordersRatio - 1) * 6.8 + (seasonalNormalization ? 0.4 : 1.1)).toFixed(2);

    // 2. Courier Availability Deficit Z-score
    const courierDeficitRatio =
      (city.availableCouriers - availableCouriersSim / ( simulatedAnomalyBoost ? 1.3 : 1)) /
      city.availableCouriers;
    const courierZ = +(Math.max(0.6, courierDeficitRatio * 8.5 + (city.unmatchedBacklog > 350 ? 2.6 : 1.2))).toFixed(2);

    // 3. Cancellation Rate Z-score
    const cancelEffective = +(cancellationRiskSim * (simulatedAnomalyBoost ? 1.8 : 1)).toFixed(1);
    const cancelZ = +((cancelEffective - 1.5) * 1.45 + (cancelEffective > 2.2 ? 1.6 : 0.5)).toFixed(2);

    // 4. Average SLA Latency Z-score
    const slaEffective = +(avgSlaMinutesSim * (simulatedAnomalyBoost ? 1.25 : 1)).toFixed(1);
    const slaZ = +((slaEffective - 24.0) * 0.38).toFixed(2);

    const criticalZone =
      city.zones.find((z) => z.status === 'CRITICAL') ||
      city.zones.find((z) => z.status === 'DEGRADED') ||
      city.zones[0];

    const candidates: DetectedAnomaly[] = [
      {
        id: `ANOM-CAN-${city.cityId.toUpperCase()}`,
        metricKey: 'CANCELLATION_RATE',
        metricName: isThai ? 'อัตราเสี่ยงการยกเลิกคำสั่งซื้อ (Cancellation Rate)' : 'Order Cancellation Rate',
        observedValue: `${cancelEffective}%`,
        baselineRange: '1.1% – 1.9%',
        zScore: Math.max(2.7, cancelZ),
        confidencePct: 98.4,
        persistedWindows: simulatedAnomalyBoost || demandSurgeFactor > 15 ? 5 : 3,
        severity: cancelEffective > 3.0 || simulatedAnomalyBoost ? 'CRITICAL' : 'WARNING',
        explanation: isThai
          ? `อัตราการยกเลิกคำสั่งซื้อพุ่งขึ้นถึง ${cancelEffective}% เบี่ยงเบนเกินกรอบมาตรฐานตามช่วงเวลา (+${Math.max(2.7, cancelZ)}σ) ต่อเนื่องเกิน ${minPersistenceWindows} รอบหน้าต่างเวลา บ่งชี้ถึงปัญหาความล่าช้าสะสมในพื้นที่ ${criticalZone.name}`
          : `Cancellation rate reached ${cancelEffective}%, deviating +${Math.max(2.7, cancelZ)}σ above the seasonally normalized baseline across ${minPersistenceWindows}+ consecutive windows in ${criticalZone.name}.`,
        contributingFactors: isThai
          ? [
              `ระยะเวลาเตรียมสินค้าของร้านค้า (Merchant Prep Queue) ในโซน ${criticalZone.id} สูงเกินเกณฑ์ 11 นาที`,
              `เวลารอจับคู่ไรเดอร์ (Courier Assignment Latency) เพิ่มขึ้นจากคิวงานคงค้าง ${city.unmatchedBacklog} รายการ`,
              `การปฏิเสธรับงานของไรเดอร์ในเส้นทางที่มีการจราจรติดขัดหรือระยะรับสินค้าไกลเกิน 2 กม.`,
            ]
          : [
              `Merchant prep-time queue saturation in ${criticalZone.id} (>11 min dwell time)`,
              `Elevated courier assignment latency driven by ${city.unmatchedBacklog} unmatched backlog orders`,
              `Courier dispatch rejection clustering on pickups >2.0km radius`,
            ],
        zoneImpact: criticalZone.name,
      },
      {
        id: `ANOM-SUP-${city.cityId.toUpperCase()}`,
        metricKey: 'COURIER_AVAILABILITY',
        metricName: isThai ? 'ความพร้อมของกองยานไรเดอร์ (Courier Availability)' : 'Courier Fleet Availability',
        observedValue: `${Math.round(availableCouriersSim / (simulatedAnomalyBoost ? 1.25 : 1)).toLocaleString()} ${isThai ? 'คัน' : 'active'}`,
        baselineRange: `${Math.round(city.availableCouriers * 0.95).toLocaleString()} – ${Math.round(city.availableCouriers * 1.1).toLocaleString()}`,
        zScore: Math.max(2.6, courierZ),
        confidencePct: 96.8,
        persistedWindows: 4,
        severity: courierZ > 3.0 || courierDropFactor > 15 || simulatedAnomalyBoost ? 'CRITICAL' : 'WARNING',
        explanation: isThai
          ? `ความหนาแน่นของไรเดอร์พร้อมรับงานลดลงต่ำกว่าเกณฑ์สมดุล (-${Math.max(2.6, courierZ)}σ) สวนทางกับปริมาณคำสั่งซื้อไหลเข้า ส่งผลให้อัตราความไม่สมดุลใน ${criticalZone.id} แตะระดับ ${criticalZone.imbalancePct}%`
          : `Available courier pool dropped -${Math.max(2.6, courierZ)}σ below required capacity for current order velocity, creating a ${criticalZone.imbalancePct}% supply deficit in ${criticalZone.id}.`,
        contributingFactors: isThai
          ? [
              `การออกกะพร้อมกันของไรเดอร์ (Shift Boundary Logoff) ในโซนธุรกิจหนาแน่น`,
              `ไรเดอร์สะสมค้างอยู่ในโซนปลายทางที่มีคำสั่งซื้อขากลับต่ำ (Spatial Sinkhole)`,
              `เวลาเดินทางต่อเที่ยวเพิ่มขึ้นจากสภาพจราจร ทำให้รอบหมุนเวียนไรเดอร์ช้าลง`,
            ]
          : [
              `Simultaneous courier logoffs at shift transition boundary in high-density zones`,
              `Courier clustering in residential dropoff zones with low return order density`,
              `Increased transit cycle duration reducing hourly courier turnover`,
            ],
        zoneImpact: criticalZone.name,
      },
      {
        id: `ANOM-ORD-${city.cityId.toUpperCase()}`,
        metricKey: 'ACTIVE_ORDERS',
        metricName: isThai ? 'ปริมาณคำสั่งซื้อไหลเข้า (Active Order Inflow)' : 'Active Order Volume Velocity',
        observedValue: `${Math.round(activeOrdersSim * boost).toLocaleString()}`,
        baselineRange: `${Math.round(city.activeOrders * 0.88).toLocaleString()} – ${Math.round(city.activeOrders * 1.05).toLocaleString()}`,
        zScore: simulatedAnomalyBoost || demandSurgeFactor > 10 ? Math.max(2.9, ordersZ) : 2.1,
        confidencePct: 94.2,
        persistedWindows: simulatedAnomalyBoost || demandSurgeFactor > 10 ? 4 : 2,
        severity: 'CRITICAL',
        explanation: isThai
          ? `อัตราคำสั่งซื้อใหม่พุ่งสูงกว่าค่าคาดการณ์ตามฤดูกาล (+${Math.max(2.9, ordersZ)}σ) อย่างรวดเร็วในกลุ่มร้านอาหารยอดนิยม เสี่ยงเกิดคอขวดการส่งมอบหากไม่ปรับสมดุล`
          : `Active order velocity surged +${Math.max(2.9, ordersZ)}σ above seasonal forecast models across high-throughput merchant clusters.`,
        contributingFactors: isThai
          ? [
              `แคมเปญโปรโมชันร้านค้าขนาดใหญ่หรือสภาพอากาศกระตุ้นคำสั่งซื้อฉับพลัน`,
              `ความหน่วงในการรวมกลุ่มคำสั่งซื้อพิกัดเดียวกัน (Co-location Batching Delay)`,
              `ขีดจำกัดการรับออเดอร์ต่อนาทีของร้านค้าพาร์ตเนอร์เต็มความจุ`,
            ]
          : [
              `Sudden demand spike triggered by localized promotional wave or weather shift`,
              `Sub-optimal co-location batching utilization for multi-order pickups`,
              `Merchant POS concurrency throttling reached in top 15% restaurants`,
            ],
        zoneImpact: criticalZone.name,
      },
    ];

    // Filter anomalies based on Z-Score Threshold and Rolling Window Persistence to minimize false positives
    const activeAlerts = candidates.filter(
      (c) => c.zScore >= zScoreThreshold && c.persistedWindows >= minPersistenceWindows
    );

    const suppressedCount =
      candidates.length -
      activeAlerts.length +
      (seasonalNormalization ? 4 : 1) +
      (minPersistenceWindows >= 3 ? 3 : 0);

    return { activeAlerts, suppressedCount, allCandidates: candidates };
  }, [
    city,
    activeOrdersSim,
    availableCouriersSim,
    cancellationRiskSim,
    avgSlaMinutesSim,
    demandSurgeFactor,
    courierDropFactor,
    zScoreThreshold,
    minPersistenceWindows,
    seasonalNormalization,
    simulatedAnomalyBoost,
    isThai,
  ]);

  const handleRunDeepAiDiagnosis = async (anomaly: DetectedAnomaly) => {
    setAnalyzingId(anomaly.id);
    try {
      const response = await fetch('/api/analyze-anomaly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cityName: city.cityName,
          metricName: anomaly.metricName,
          observedValue: anomaly.observedValue,
          baselineRange: anomaly.baselineRange,
          zScore: anomaly.zScore,
          zThreshold: zScoreThreshold,
          persistenceWindows: minPersistenceWindows,
          lang: language,
        }),
      });
      const json = await response.json();
      if (json.success && json.data) {
        setAiAnalysisResult((prev) => ({
          ...prev,
          [anomaly.id]: {
            ...json.data,
            evidenceHash: json.evidenceHash,
          },
        }));
      }
    } catch (e) {
      console.error('Anomaly diagnosis error:', e);
    } finally {
      setAnalyzingId(null);
    }
  };

  const toggleFactorReview = (key: string) => {
    setReviewedFactors((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 space-y-5 relative overflow-hidden">
      <div className="absolute -right-16 -top-16 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header & False-Positive Guard Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-800 relative z-10">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-mono font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              {isThai
                ? 'ระบบเอไอตรวจจับความผิดปกติอัจฉริยะ (AI ANOMALY DETECTION SENTINEL)'
                : 'AI-DRIVEN ANOMALY DETECTION SENTINEL'}
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono flex items-center gap-1">
              <BellOff className="w-3 h-3" />
              {isThai
                ? `กรองสัญญาณรบกวนแล้ว ${monitoredMetrics.suppressedCount} รายการ (ลด False Positives)`
                : `${monitoredMetrics.suppressedCount} Transient Spikes Suppressed (Low False-Positive Mode)`}
            </span>
          </div>

          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-400" />
            {isThai
              ? 'การเฝ้าระวังความเบี่ยงเบนทางสถิติของคำสั่งซื้อ กองยานไรเดอร์ และอัตรายกเลิก'
              : 'Statistical Telemetry Anomaly Monitor & Contributing Factor Analyzer'}
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5 max-w-3xl">
            {isThai
              ? 'ตรวจสอบความผิดปกติของคำสั่งซื้อ (Active Orders), จำนวนไรเดอร์พร้อมรับงาน (Courier Availability) และอัตราการยกเลิก (Cancellation Rate) โดยใช้เกณฑ์ Z-Score และตัวกรองความต่อเนื่องหลายหน้าต่างเวลาเพื่อลดการแจ้งเตือนที่ผิดพลาด (Minimize False Positives)'
              : 'Monitors active orders, courier availability, and cancellation rates using multi-window Z-score persistence and seasonal baseline normalization to minimize false positives.'}
          </p>
        </div>

        {/* Simulate / Trigger Anomaly Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setSimulatedAnomalyBoost(!simulatedAnomalyBoost);
              if (onInjectTestAnomaly && !simulatedAnomalyBoost) {
                onInjectTestAnomaly();
              }
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-mono font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
              simulatedAnomalyBoost
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>
              {simulatedAnomalyBoost
                ? isThai
                  ? 'รีเซ็ตความผิดปกติจำลอง'
                  : 'Reset Simulated Anomaly'
                : isThai
                ? 'จำลองความเบี่ยงเบนวิกฤต (+3.4σ)'
                : 'Simulate +3.4σ Anomaly Spike'}
            </span>
          </button>
        </div>
      </div>

      {/* False-Positive Minimization Configuration Bar */}
      <div className="bg-neutral-950/90 border border-neutral-800 rounded-xl p-3.5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
        {/* Control 1: Z-Score Threshold */}
        <div className="flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 mb-1.5">
            <span>{isThai ? '1. เกณฑ์ความเบี่ยงเบน (Z-Score Threshold):' : '1. Z-Score Sensitivity:'}</span>
            <span className="text-cyan-400 font-bold">≥ {zScoreThreshold.toFixed(1)}σ</span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {[
              { val: 2.0, label: isThai ? '2.0σ (ไวสูง)' : '2.0σ (High)' },
              { val: 2.5, label: isThai ? '2.5σ (สมดุล)' : '2.5σ (Balanced)' },
              { val: 3.0, label: isThai ? '3.0σ (เข้มงวด)' : '3.0σ (Strict)' },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => setZScoreThreshold(opt.val)}
                className={`py-1 px-2 rounded text-[11px] border transition cursor-pointer ${
                  zScoreThreshold === opt.val
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Control 2: Rolling Window Persistence */}
        <div className="flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 mb-1.5">
            <span>
              {isThai ? '2. ตัวกรองความต่อเนื่อง (Persistence):' : '2. Persistence Filter:'}
            </span>
            <span className="text-emerald-400 font-bold">
              {minPersistenceWindows} {isThai ? 'รอบติดต่อกัน' : 'Windows (60s)'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {[
              { val: 1, label: isThai ? '1 รอบ (ทันที)' : '1 Window' },
              { val: 3, label: isThai ? '3 รอบ (แนะนำ)' : '3 Windows' },
              { val: 5, label: isThai ? '5 รอบ (กรองสูงสุด)' : '5 Windows' },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => setMinPersistenceWindows(opt.val)}
                className={`py-1 px-2 rounded text-[11px] border transition cursor-pointer ${
                  minPersistenceWindows === opt.val
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Control 3: Seasonal / Time-of-Day Normalization */}
        <div className="flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 mb-1.5">
            <span>
              {isThai ? '3. ปรับฐานตามช่วงเวลาเร่งด่วน:' : '3. Seasonal Rush Normalization:'}
            </span>
            <span className={seasonalNormalization ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
              {seasonalNormalization ? (isThai ? 'เปิดใช้งาน' : 'ENABLED') : isThai ? 'ปิด' : 'DISABLED'}
            </span>
          </div>
          <button
            onClick={() => setSeasonalNormalization(!seasonalNormalization)}
            className={`w-full py-1.5 px-3 rounded text-[11px] border transition cursor-pointer flex items-center justify-between ${
              seasonalNormalization
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-neutral-900 text-neutral-400 border-neutral-800'
            }`}
          >
            <span>
              {isThai
                ? 'ตัดความผันผวนช่วงมื้อเที่ยง/เย็นตามปกติ'
                : 'Filter expected Lunch/Dinner peak curves'}
            </span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Detected Anomalies Alert Cards */}
      {monitoredMetrics.activeAlerts.length === 0 ? (
        <div className="p-6 bg-neutral-950/70 border border-emerald-500/30 rounded-xl text-center space-y-2">
          <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
          <div className="text-sm font-bold text-white">
            {isThai
              ? 'ไม่พบความผิดปกติที่เกินเกณฑ์ทางสถิติที่กำหนด'
              : 'No Statistically Significant Anomalies Above Current Threshold'}
          </div>
          <p className="text-xs text-neutral-400 max-w-xl mx-auto">
            {isThai
              ? `ความผันผวนระยะสั้นถูกตัดออกโดยตัวกรองความต่อเนื่อง (${minPersistenceWindows} รอบ) และเกณฑ์ Z-Score (≥${zScoreThreshold}σ) เพื่อป้องกันการแจ้งเตือนที่ผิดพลาด`
              : `All metrics are operating within normalized seasonal bands or were filtered by the ${minPersistenceWindows}-window persistence guard.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {monitoredMetrics.activeAlerts.map((anomaly) => {
            const deepData = aiAnalysisResult[anomaly.id];
            const factorsToDisplay = deepData ? deepData.contributingFactors : anomaly.contributingFactors;
            const explanationToDisplay = deepData ? deepData.explanation : anomaly.explanation;

            return (
              <div
                key={anomaly.id}
                className={`p-4 rounded-xl border transition flex flex-col justify-between space-y-4 ${
                  anomaly.severity === 'CRITICAL'
                    ? 'bg-rose-950/20 border-rose-500/40'
                    : 'bg-amber-950/20 border-amber-500/40'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Alert Badge & Z-Score */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle
                        className={`w-4 h-4 shrink-0 ${
                          anomaly.severity === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'
                        }`}
                      />
                      <span className="text-xs font-mono font-bold text-white">
                        {anomaly.metricName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-neutral-950 border border-neutral-700 text-cyan-300 font-bold">
                        Z-Score: +{anomaly.zScore}σ
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded font-bold ${
                          anomaly.severity === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {anomaly.severity}
                      </span>
                    </div>
                  </div>

                  {/* Metric Comparison Bar */}
                  <div className="grid grid-cols-3 gap-2 bg-neutral-950/90 border border-neutral-800 rounded-lg p-2.5 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-neutral-500 block">
                        {isThai ? 'ค่าที่ตรวจพบจริง' : 'Observed Value'}
                      </span>
                      <span className="text-sm font-bold text-rose-400">{anomaly.observedValue}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-500 block">
                        {isThai ? 'กรอบค่าปกติตามฤดูกาล' : 'Normal Baseline'}
                      </span>
                      <span className="text-xs font-semibold text-emerald-400">
                        {anomaly.baselineRange}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-500 block">
                        {isThai ? 'ความเชื่อมั่นสถิติ' : 'Confidence'}
                      </span>
                      <span className="text-xs font-semibold text-cyan-300">
                        {anomaly.confidencePct}% ({anomaly.persistedWindows}w)
                      </span>
                    </div>
                  </div>

                  {/* Explanation of Anomaly */}
                  <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-lg space-y-1">
                    <div className="text-[10px] font-mono text-amber-400 uppercase font-bold">
                      {isThai ? 'คำอธิบายความผิดปกติ (Anomaly Explanation):' : 'Anomaly Explanation:'}
                    </div>
                    <p className="text-xs text-neutral-200 leading-relaxed">{explanationToDisplay}</p>
                    {deepData && (
                      <div className="text-[10px] font-mono text-emerald-400 pt-1">
                        ✓ {deepData.falsePositiveAssessment}
                      </div>
                    )}
                  </div>

                  {/* Suggested Contributing Factors to Review */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-mono text-cyan-400 font-bold flex items-center justify-between">
                      <span>
                        {isThai
                          ? 'ปัจจัยที่ควรตรวจสอบเพิ่มเติม (Suggested Contributing Factors to Review):'
                          : 'Suggested Contributing Factors to Review:'}
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        {isThai ? 'คลิกเมื่อตรวจสอบแล้ว' : 'Click to mark reviewed'}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {factorsToDisplay.map((factor, idx) => {
                        const factorKey = `${anomaly.id}-f-${idx}`;
                        const isChecked = !!reviewedFactors[factorKey];
                        return (
                          <div
                            key={idx}
                            onClick={() => toggleFactorReview(factorKey)}
                            className={`p-2 rounded-lg border text-xs flex items-start gap-2 cursor-pointer transition ${
                              isChecked
                                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                                : 'bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="mt-0.5 rounded border-neutral-700 text-cyan-500 cursor-pointer"
                            />
                            <span className={isChecked ? 'line-through opacity-80' : ''}>{factor}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="pt-3 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-2">
                  <button
                    onClick={() => handleRunDeepAiDiagnosis(anomaly)}
                    disabled={analyzingId === anomaly.id}
                    className="px-3 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-cyan-300 text-xs font-mono transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles
                      className={`w-3.5 h-3.5 text-cyan-400 ${
                        analyzingId === anomaly.id ? 'animate-spin' : ''
                      }`}
                    />
                    <span>
                      {analyzingId === anomaly.id
                        ? isThai
                          ? 'กำลังวิเคราะห์ด้วย Gemini AI...'
                          : 'Running Gemini AI Diagnosis...'
                        : isThai
                        ? 'วิเคราะห์เชิงลึกด้วย AI (Gemini)'
                        : 'Deep AI Factor Analysis'}
                    </span>
                  </button>

                  {onNavigateToGovernance && (
                    <button
                      onClick={() => onNavigateToGovernance(anomaly)}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-semibold transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>
                        {isThai
                          ? 'ส่งให้ AEON Guardian อนุมัติ (Advisory)'
                          : 'Review in AEON Guardian'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
