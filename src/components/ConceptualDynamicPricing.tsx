import React, { useState } from 'react';
import {
  DollarSign,
  Clock,
  CloudRain,
  Sun,
  CloudLightning,
  ThermometerSun,
  TrendingUp,
  Activity,
  Shield,
  ArrowUpRight,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  BookOpen,
  Layers,
} from 'lucide-react';
import { CityMarketplace, SubMarketZone } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface ConceptualDynamicPricingProps {
  city: CityMarketplace;
  selectedZone: SubMarketZone;
  onNavigateToGovernance: (advisoryData?: any) => void;
}

type TimeOfDayId = 'off_peak' | 'lunch_rush' | 'afternoon' | 'dinner_peak' | 'late_night';
type WeatherId = 'clear' | 'light_rain' | 'heavy_storm' | 'extreme_heat';
type SlaStateId = 'optimal' | 'elevated' | 'critical_breach';

interface TimeWindowOption {
  id: TimeOfDayId;
  labelEn: string;
  labelTh: string;
  hours: string;
  multiplierDelta: number;
  rationaleEn: string;
  rationaleTh: string;
}

interface WeatherOption {
  id: WeatherId;
  labelEn: string;
  labelTh: string;
  multiplierDelta: number;
  speedImpactPct: number;
  rationaleEn: string;
  rationaleTh: string;
}

interface SlaTierOption {
  id: SlaStateId;
  labelEn: string;
  labelTh: string;
  slaRange: string;
  multiplierDelta: number;
  customerRebateUsd: number;
  courierPriorityBonusUsd: number;
  rationaleEn: string;
  rationaleTh: string;
}

const TIME_WINDOWS: TimeWindowOption[] = [
  {
    id: 'off_peak',
    labelEn: 'Mid-Morning Off-Peak',
    labelTh: 'ช่วงสายนอกเวลาเร่งด่วน',
    hours: '09:30 – 11:00',
    multiplierDelta: -0.10,
    rationaleEn: 'Applies a -10% promotional fee reduction to stimulate order volume and keep idle couriers utilized.',
    rationaleTh: 'ลดค่าจัดส่ง 10% เพื่อกระตุ้นยอดคำสั่งซื้อและรักษาอัตราการใช้ประโยชน์ของไรเดอร์ที่ว่างอยู่',
  },
  {
    id: 'lunch_rush',
    labelEn: 'Midday Lunch Peak',
    labelTh: 'ช่วงพักเที่ยงเร่งด่วน',
    hours: '11:30 – 13:30',
    multiplierDelta: 0.20,
    rationaleEn: 'Adds +0.20x temporal surge to draw part-time couriers into high-density commercial business districts.',
    rationaleTh: 'เพิ่มตัวคูณเวลา +0.20x เพื่อดึงดูดไรเดอร์พาร์ทไทม์เข้าสู่ย่านธุรกิจที่มีคำสั่งซื้อหนาแน่น',
  },
  {
    id: 'afternoon',
    labelEn: 'Afternoon Baseline',
    labelTh: 'ช่วงบ่ายปกติ',
    hours: '14:00 – 17:00',
    multiplierDelta: 0.0,
    rationaleEn: 'Neutral temporal baseline (0.00x adjustment); pricing relies strictly on distance and local zone balance.',
    rationaleTh: 'เกณฑ์เวลาปกติ (ไม่ปรับเพิ่ม/ลด) ราคาคำนวณตามระยะทางและสมดุลอุปสงค์-อุปทานในพื้นที่',
  },
  {
    id: 'dinner_peak',
    labelEn: 'Evening Dinner Rush',
    labelTh: 'ช่วงมื้อค่ำพีคสุด',
    hours: '18:00 – 21:00',
    multiplierDelta: 0.30,
    rationaleEn: 'Peak residential order velocity (+0.30x adjustment) combined with commuter traffic congestion.',
    rationaleTh: 'ความต้องการสั่งอาหารมื้อค่ำสูงสุด (+0.30x) ร่วมกับสภาพจราจรหนาแน่นช่วงเลิกงาน',
  },
  {
    id: 'late_night',
    labelEn: 'Late-Night Owl Shift',
    labelTh: 'กะดึกหลังเที่ยงคืน',
    hours: '23:00 – 04:00',
    multiplierDelta: 0.25,
    rationaleEn: 'Compensates overnight courier scarcity (+0.25x) and longer deadhead return distances.',
    rationaleTh: 'ชดเชยจำนวนไรเดอร์กะดึกที่ลดลง (+0.25x) และระยะทางวิ่งรถเปล่าขากลับที่ไกลขึ้น',
  },
];

const WEATHER_CONDITIONS: WeatherOption[] = [
  {
    id: 'clear',
    labelEn: 'Clear / Optimal Sky',
    labelTh: 'ท้องฟ้าแจ่มใส / ปกติ',
    multiplierDelta: 0.0,
    speedImpactPct: 0,
    rationaleEn: 'Standard road surface friction and visibility. No environmental hazard premium required.',
    rationaleTh: 'สภาพถนนและทัศนวิสัยปกติ ไม่มีการบวกค่าความเสี่ยงสภาพอากาศ',
  },
  {
    id: 'light_rain',
    labelEn: 'Light Rain / Wet Roads',
    labelTh: 'ฝนตกปรอยๆ / ถนนเปียก',
    multiplierDelta: 0.15,
    speedImpactPct: -12,
    rationaleEn: 'Two-wheel courier speed drops ~12% while customer dine-at-home demand rises. Adds +0.15x hazard incentive.',
    rationaleTh: 'ความเร็วรถสองล้อลดลง ~12% ขณะที่คนสั่งอาหารที่บ้านเพิ่มขึ้น เพิ่มค่าตอบแทนสภาพอากาศ +0.15x',
  },
  {
    id: 'heavy_storm',
    labelEn: 'Heavy Thunderstorm',
    labelTh: 'พายุฝนฟ้าคะนองรุนแรง',
    multiplierDelta: 0.40,
    speedImpactPct: -28,
    rationaleEn: 'High courier sign-off rate and severe visibility drop. Adds +0.40x storm incentive to retain active fleet.',
    rationaleTh: 'ไรเดอร์ออฟไลน์สูงและทัศนวิสัยต่ำมาก เพิ่มโบนัสพายุ +0.40x เพื่อรักษากองยานที่ยังวิ่งงาน',
  },
  {
    id: 'extreme_heat',
    labelEn: 'Extreme Heat / Haze Alert',
    labelTh: 'อากาศร้อนจัด / ฝุ่นควันสูง',
    multiplierDelta: 0.25,
    speedImpactPct: -10,
    rationaleEn: 'Outdoor thermal stress advisory (+0.25x) funding hydration & health protection stipends for couriers.',
    rationaleTh: 'เพิ่มค่าชดเชยสภาพอากาศร้อนจัด/ฝุ่นควัน (+0.25x) เพื่อสนับสนุนสวัสดิการและการพักดื่มน้ำของไรเดอร์',
  },
];

const SLA_TIERS: SlaTierOption[] = [
  {
    id: 'optimal',
    labelEn: 'On-Target SLA (< 25 min)',
    labelTh: 'SLA ตามเกณฑ์เป้าหมาย (< 25 นาที)',
    slaRange: '18 – 24 min',
    multiplierDelta: 0.0,
    customerRebateUsd: 0.0,
    courierPriorityBonusUsd: 0.0,
    rationaleEn: 'Fulfillment latency is within target threshold. Standard dispatch queue and base pricing apply.',
    rationaleTh: 'เวลาจัดส่งอยู่ในเกณฑ์มาตรฐาน ใช้คิวการจ่ายงานและโครงสร้างราคาปกติ',
  },
  {
    id: 'elevated',
    labelEn: 'Elevated SLA Pressure (25 – 35 min)',
    labelTh: 'SLA เริ่มตึงตัว (25 – 35 นาที)',
    slaRange: '28 – 34 min',
    multiplierDelta: 0.15,
    customerRebateUsd: 0.0,
    courierPriorityBonusUsd: 1.5,
    rationaleEn: 'Triggers +0.15x priority dispatch surcharge and +$1.50 Express Pickup Bounty to prevent SLA breach.',
    rationaleTh: 'ปรับเพิ่ม +0.15x และให้โบนัสรับงานด่วน +$1.50 แก่ไรเดอร์ที่อยู่ใกล้ร้านเพื่อป้องกัน SLA เกินกำหนด',
  },
  {
    id: 'critical_breach',
    labelEn: 'Critical SLA Breach Risk (> 35 min)',
    labelTh: 'ความเสี่ยง SLA วิกฤต (> 35 นาที)',
    slaRange: '36 – 45 min',
    multiplierDelta: 0.10,
    customerRebateUsd: 1.25,
    courierPriorityBonusUsd: 2.5,
    rationaleEn: 'Applies -$1.25 SLA Customer Delay Cushion to prevent cart abandonment while platform subsidizes +$2.50 rescue courier bonus.',
    rationaleTh: 'มอบส่วนลดชดเชยเวลารอนาน -$1.25 ให้ลูกค้าเพื่อลดการยกเลิกออเดอร์ พร้อมแพลตฟอร์มสมทบโบนัสกู้วิกฤต +$2.50 ให้ไรเดอร์',
  },
];

export const ConceptualDynamicPricing: React.FC<ConceptualDynamicPricingProps> = ({
  city,
  selectedZone,
  onNavigateToGovernance,
}) => {
  const { language } = useLanguage();
  const isThai = language === 'th';

  // Interactive Factor State for the Worked Example Simulator
  const [distanceKm, setDistanceKm] = useState<number>(4.2);
  const [customImbalanceOverride, setCustomImbalanceOverride] = useState<number | null>(null);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDayId>('dinner_peak');
  const [weather, setWeather] = useState<WeatherId>('light_rain');
  const [slaState, setSlaState] = useState<SlaStateId>('elevated');
  const [enforceGuardianCap, setEnforceGuardianCap] = useState<boolean>(true);
  const [activePresetName, setActivePresetName] = useState<string>('rainy_dinner_rush');

  // Effective imbalance uses either the live selectedZone imbalance or user slider override
  const activeImbalancePct =
    customImbalanceOverride !== null ? customImbalanceOverride : selectedZone.imbalancePct;

  // 1. Base & Distance Fare Calculation
  const baseBookingFee = 3.0;
  const perKmRate = 1.25;
  const distanceFee = +(distanceKm * perKmRate).toFixed(2);
  const standardBasePrice = +(baseBookingFee + distanceFee).toFixed(2);

  // 2. Factor 1: Real-Time Demand vs. Supply Imbalance Multiplier Delta
  // When supply < demand (negative imbalancePct), multiplier rises proportionally
  let imbalanceDelta = 0.0;
  if (activeImbalancePct < -5) {
    imbalanceDelta = +(Math.min(0.95, Math.abs(activeImbalancePct) * 0.014)).toFixed(2);
  } else if (activeImbalancePct > 12) {
    imbalanceDelta = -0.08; // Surplus courier supply discount
  }

  // 3. Factor 2: Time of Day Window
  const selectedTimeObj = TIME_WINDOWS.find((t) => t.id === timeOfDay) || TIME_WINDOWS[3];
  const timeDelta = selectedTimeObj.multiplierDelta;

  // 4. Factor 3: Weather Conditions
  const selectedWeatherObj = WEATHER_CONDITIONS.find((w) => w.id === weather) || WEATHER_CONDITIONS[1];
  const weatherDelta = selectedWeatherObj.multiplierDelta;

  // 5. Factor 4: Estimated Delivery SLA Impact
  const selectedSlaObj = SLA_TIERS.find((s) => s.id === slaState) || SLA_TIERS[1];
  const slaDelta = selectedSlaObj.multiplierDelta;

  // Combined Raw Multiplier
  const rawCombinedMultiplier = +(
    1.0 +
    imbalanceDelta +
    timeDelta +
    weatherDelta +
    slaDelta
  ).toFixed(2);

  const guardianCeiling = 2.5;
  const isCappedByGuardian = enforceGuardianCap && rawCombinedMultiplier > guardianCeiling;
  const finalMultiplier = isCappedByGuardian
    ? guardianCeiling
    : Math.max(0.85, rawCombinedMultiplier);

  // Monetary adjustments for each factor in the worked example
  const imbalanceAdjustmentUsd = +(standardBasePrice * imbalanceDelta).toFixed(2);
  const timeAdjustmentUsd = +(standardBasePrice * timeDelta).toFixed(2);
  const weatherAdjustmentUsd = +(standardBasePrice * weatherDelta).toFixed(2);
  const slaMultiplierAdjustmentUsd = +(standardBasePrice * slaDelta).toFixed(2);

  const uncappedTotalUsd = +(
    standardBasePrice * rawCombinedMultiplier -
    selectedSlaObj.customerRebateUsd
  ).toFixed(2);

  const finalCustomerOrderPriceUsd = +(
    standardBasePrice * finalMultiplier -
    selectedSlaObj.customerRebateUsd
  ).toFixed(2);

  const guardianSavingsUsd = isCappedByGuardian
    ? +(uncappedTotalUsd - finalCustomerOrderPriceUsd).toFixed(2)
    : 0;

  // Courier vs Platform Split
  const courierEarningsUsd = +(
    standardBasePrice * 0.76 +
    Math.max(0, finalCustomerOrderPriceUsd - standardBasePrice) * 0.92 +
    selectedSlaObj.courierPriorityBonusUsd
  ).toFixed(2);

  // Apply Scenario Presets
  const applyPreset = (preset: 'clear_afternoon' | 'rainy_dinner_rush' | 'severe_storm_breach') => {
    setActivePresetName(preset);
    if (preset === 'clear_afternoon') {
      setDistanceKm(3.5);
      setCustomImbalanceOverride(8.0);
      setTimeOfDay('afternoon');
      setWeather('clear');
      setSlaState('optimal');
    } else if (preset === 'rainy_dinner_rush') {
      setDistanceKm(4.2);
      setCustomImbalanceOverride(-33.6);
      setTimeOfDay('dinner_peak');
      setWeather('light_rain');
      setSlaState('elevated');
    } else if (preset === 'severe_storm_breach') {
      setDistanceKm(6.4);
      setCustomImbalanceOverride(-58.0);
      setTimeOfDay('late_night');
      setWeather('heavy_storm');
      setSlaState('critical_breach');
    }
  };

  return (
    <div className="bg-neutral-900/85 border border-neutral-800 rounded-xl p-5 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <BookOpen className="w-4 h-4" />
            <span>
              {isThai
                ? 'โมดูลเชิงแนวคิด: โมเดลการกำหนดราคาพลวัตหลายตัวแปร'
                : 'CONCEPTUAL MODULE · MULTI-FACTOR DYNAMIC PRICING ARCHITECTURE'}
            </span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span className="text-amber-400">
              {isThai ? 'เฉพาะคำแนะนำ (ต้องผ่านการอนุมัติ)' : 'ADVISORY-ONLY MODEL'}
            </span>
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight mt-1">
            {isThai
              ? 'กลไกการปรับราคาคำสั่งซื้อตามความไม่สมดุลของอุปสงค์-อุปทาน ช่วงเวลา สภาพอากาศ และเกณฑ์เวลาจัดส่ง (SLA)'
              : 'How Supply-Demand Imbalance, Time of Day, Weather & Delivery SLAs Influence Order Pricing'}
          </h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-4xl leading-relaxed">
            {isThai
              ? 'โมดูลนี้อธิบายหลักการคำนวณราคาค่าจัดส่งแบบโปร่งใสในระบบ Marketplace Operations Intelligence โดยผสานปัจจัย 4 มิติเข้าด้วยกันเพื่อสร้างสมดุลระหว่างการจูงใจไรเดอร์ การรักษามาตรฐานเวลาจัดส่ง (SLA) และการคุ้มครองผู้บริโภคด้วยเพดานราคา AEON Guardian'
              : 'Outlines the algorithmic pricing mechanics within Marketplace Operations Intelligence. Rather than opaque black-box surge multipliers, the model decomposes price elasticity across four transparent operational vectors governed by AEON Guardian safety ceilings.'}
          </p>
        </div>

        {/* Scenario Quick-Switch Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-neutral-950 p-1.5 rounded-lg border border-neutral-800 shrink-0">
          <button
            onClick={() => applyPreset('clear_afternoon')}
            className={`px-2.5 py-1.5 rounded text-xs font-mono transition cursor-pointer ${
              activePresetName === 'clear_afternoon'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {isThai ? 'ตัวอย่างที่ 1: บ่ายฟ้าใส (1.00x)' : 'Ex 1: Clear Afternoon'}
          </button>
          <button
            onClick={() => applyPreset('rainy_dinner_rush')}
            className={`px-2.5 py-1.5 rounded text-xs font-mono transition cursor-pointer ${
              activePresetName === 'rainy_dinner_rush'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {isThai ? 'ตัวอย่างที่ 2: มื้อค่ำฝนตก + SLA ตึงตัว' : 'Ex 2: Rainy Dinner Rush'}
          </button>
          <button
            onClick={() => applyPreset('severe_storm_breach')}
            className={`px-2.5 py-1.5 rounded text-xs font-mono transition cursor-pointer ${
              activePresetName === 'severe_storm_breach'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {isThai ? 'ตัวอย่างที่ 3: พายุดึก + ติดเพดาน 2.5x' : 'Ex 3: Severe Storm (Cap)'}
          </button>
        </div>
      </div>

      {/* Part 1: Conceptual Architecture — The 4 Core Pricing Factors */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-300 font-bold flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {isThai
                ? '1. ปัจจัยหลักทั้ง 4 มิติที่มีผลต่อการกำหนดราคาคำสั่งซื้อ (Core Pricing Vectors)'
                : '1. Four Core Operational Factors Influencing Order Pricing'}
            </span>
          </h4>
          <span className="text-[11px] font-mono text-neutral-500">
            Formula: P_final = min(Ceiling, Base × [1 + Δ_Imbalance + Δ_Time + Δ_Weather + Δ_SLA]) - Rebate_SLA
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Factor 1: Demand vs Supply Imbalance */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-rose-400 mb-1.5">
                <span className="font-bold flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  {isThai ? 'ปัจจัยที่ 1: อุปสงค์ vs อุปทาน' : 'FACTOR 1 · DEMAND vs. SUPPLY'}
                </span>
                <span>{imbalanceDelta >= 0 ? `+${imbalanceDelta.toFixed(2)}x` : `${imbalanceDelta.toFixed(2)}x`}</span>
              </div>
              <h5 className="text-sm font-semibold text-white">
                {isThai ? 'ความไม่สมดุลในโซนแบบเรียลไทม์' : 'Real-Time Zone Imbalance'}
              </h5>
              <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                {isThai
                  ? 'วัดอัตราส่วนคำสั่งซื้อต่อนาทีเทียบกับไรเดอร์ที่พร้อมรับงานในโซน เมื่ออุปทานขาดแคลน (เช่น -33.6%) ระบบจะเพิ่มตัวคูณเพื่อดึงไรเดอร์จากโซนข้างเคียงเข้ามาเสริม แต่หากไรเดอร์ล้นตลาดจะลดราคา 8% เพื่อกระตุ้นคำสั่งซื้อ'
                  : 'Compares active order inflow (req/min) against available couriers in the sub-market zone. Deficits trigger an elasticity premium to attract couriers from adjacent zones; surpluses trigger off-peak discounts.'}
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-neutral-800/80 text-[11px] font-mono flex items-center justify-between text-neutral-300">
              <span className="text-neutral-500">{isThai ? 'สถานะปัจจุบัน:' : 'Active Zone State:'}</span>
              <span className={activeImbalancePct < 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                {selectedZone.id} ({activeImbalancePct > 0 ? `+${activeImbalancePct}%` : `${activeImbalancePct}%`})
              </span>
            </div>
          </div>

          {/* Factor 2: Time of Day */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-amber-400 mb-1.5">
                <span className="font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {isThai ? 'ปัจจัยที่ 2: ช่วงเวลาของวัน' : 'FACTOR 2 · TIME OF DAY'}
                </span>
                <span>{timeDelta >= 0 ? `+${timeDelta.toFixed(2)}x` : `${timeDelta.toFixed(2)}x`}</span>
              </div>
              <h5 className="text-sm font-semibold text-white">
                {isThai ? 'ความหนาแน่นตามช่วงเวลาและการจราจร' : 'Temporal Velocity & Rush Windows'}
              </h5>
              <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                {isThai
                  ? 'ปรับราคาตามรูปแบบความต้องการรายชั่วโมง ช่วงมื้อเที่ยงและมื้อค่ำมีคำสั่งซื้อพร้อมกันสูงและรถติดทำให้รอบวิ่งช้าลง ส่วนกะดึกชดเชยจำนวนไรเดอร์ที่ลดลง และช่วงสายมีส่วนลดกระตุ้นยอด'
                  : 'Accounts for predictable diurnal meal peaks (lunch/dinner), urban traffic congestion reducing trips-per-hour, overnight courier scarcity, and mid-morning promotional windows.'}
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-neutral-800/80 text-[11px] font-mono flex items-center justify-between text-neutral-300">
              <span className="text-neutral-500">{isThai ? 'หน้าต่างเวลา:' : 'Active Window:'}</span>
              <span className="text-amber-300 font-bold">{selectedTimeObj.hours}</span>
            </div>
          </div>

          {/* Factor 3: Weather Conditions */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-cyan-400 mb-1.5">
                <span className="font-bold flex items-center gap-1.5">
                  <CloudRain className="w-3.5 h-3.5" />
                  {isThai ? 'ปัจจัยที่ 3: สภาพอากาศ' : 'FACTOR 3 · WEATHER SEVERITY'}
                </span>
                <span>+{weatherDelta.toFixed(2)}x</span>
              </div>
              <h5 className="text-sm font-semibold text-white">
                {isThai ? 'ความเสี่ยงสภาพอากาศและความเร็วการเดินรถ' : 'Micro-Climate & Transit Friction'}
              </h5>
              <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                {isThai
                  ? 'เมื่อเกิดฝนตกหรือพายุ ความเร็วเฉลี่ยของรถจักรยานยนต์ลดลง 12%–28% และไรเดอร์บางส่วนหยุดพักในขณะที่ลูกค้าสั่งอาหารเพิ่มขึ้น ค่าธรรมเนียมส่วนเพิ่มนี้ถูกส่งตรงเป็นโบนัสความเสี่ยงให้ไรเดอร์'
                  : 'Adverse weather simultaneously spikes home-delivery demand while reducing two-wheel transit speeds by 12%–28%. Weather surcharges fund 100% pass-through hazard bonuses for active couriers.'}
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-neutral-800/80 text-[11px] font-mono flex items-center justify-between text-neutral-300">
              <span className="text-neutral-500">{isThai ? 'ผลกระทบความเร็ว:' : 'Transit Speed Impact:'}</span>
              <span className="text-cyan-300 font-bold">
                {selectedWeatherObj.speedImpactPct === 0
                  ? (isThai ? '0% (ปกติ)' : '0% (Nominal)')
                  : `${selectedWeatherObj.speedImpactPct}%`}
              </span>
            </div>
          </div>

          {/* Factor 4: Estimated Delivery SLAs */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-emerald-400 mb-1.5">
                <span className="font-bold flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {isThai ? 'ปัจจัยที่ 4: เกณฑ์เวลาจัดส่ง (SLA)' : 'FACTOR 4 · ESTIMATED SLA'}
                </span>
                <span>
                  +{slaDelta.toFixed(2)}x
                  {selectedSlaObj.customerRebateUsd > 0 ? ` / -$${selectedSlaObj.customerRebateUsd.toFixed(2)}` : ''}
                </span>
              </div>
              <h5 className="text-sm font-semibold text-white">
                {isThai ? 'การบริหารเวลาจัดส่งและการชดเชยเมื่อล่าช้า' : 'SLA Latency & Delay Cushioning'}
              </h5>
              <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                {isThai
                  ? 'หากเวลาจัดส่งคาดการณ์อยู่ในช่วงตึงตัว (25–35 นาที) ระบบจะเพิ่มโบนัสงานด่วนเพื่อดึงไรเดอร์ที่ใกล้ที่สุด แต่หากเกิน 35 นาที ระบบจะมอบส่วนลดชดเชยให้ลูกค้าเพื่อป้องกันการยกเลิกคำสั่งซื้อ'
                  : 'Dual-sided SLA stabilization: elevated ETAs (25–35m) trigger express dispatch bounties to accelerate pickup, whereas severe delays (>35m) apply an automatic customer fee rebate to prevent cancellation.'}
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-neutral-800/80 text-[11px] font-mono flex items-center justify-between text-neutral-300">
              <span className="text-neutral-500">{isThai ? 'กรอบเวลา SLA:' : 'Projected SLA Window:'}</span>
              <span className="text-emerald-300 font-bold">{selectedSlaObj.slaRange}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Part 2: Interactive Multi-Factor Simulator & Concrete Worked Example */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
        {/* Left 7 Columns: Interactive Factor Controls */}
        <div className="lg:col-span-7 bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between pb-2.5 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-white">
                {isThai
                  ? '2. ทดลองปรับตัวแปรเพื่อดูผลกระทบต่อราคาคำสั่งซื้อ (Interactive Factor Controls)'
                  : '2. Interactive Factor Controls (Test Real-Time Price Elasticity)'}
              </h4>
            </div>
            {customImbalanceOverride !== null && (
              <button
                onClick={() => setCustomImbalanceOverride(null)}
                className="text-[11px] font-mono text-cyan-400 hover:underline cursor-pointer"
              >
                {isThai ? 'ซิงก์กับโซนปัจจุบัน' : 'Sync with Live Zone'}
              </button>
            )}
          </div>

          {/* Control 1: Imbalance & Distance Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-neutral-900/70 rounded-lg border border-neutral-800 space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-neutral-300">
                  {isThai ? '1. ความไม่สมดุล (Imbalance):' : '1. Supply-Demand Imbalance:'}
                </span>
                <span className={activeImbalancePct < 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {activeImbalancePct > 0 ? `+${activeImbalancePct}%` : `${activeImbalancePct}%`}
                </span>
              </div>
              <input
                type="range"
                min={-65}
                max={25}
                step={1}
                value={Math.round(activeImbalancePct)}
                onChange={(e) => {
                  setActivePresetName('custom');
                  setCustomImbalanceOverride(Number(e.target.value));
                }}
                className="w-full accent-rose-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-neutral-500">
                <span>-65% ({isThai ? 'ขาดแคลนหนัก' : 'Severe Deficit'})</span>
                <span>0% ({isThai ? 'สมดุล' : 'Balanced'})</span>
                <span>+25% ({isThai ? 'ไรเดอร์เกิน' : 'Surplus'})</span>
              </div>
            </div>

            <div className="p-3 bg-neutral-900/70 rounded-lg border border-neutral-800 space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-neutral-300">
                  {isThai ? 'ระยะทางจัดส่ง (Route Distance):' : 'Order Route Distance:'}
                </span>
                <span className="text-cyan-400 font-bold">{distanceKm.toFixed(1)} km</span>
              </div>
              <input
                type="range"
                min={1.0}
                max={15.0}
                step={0.2}
                value={distanceKm}
                onChange={(e) => {
                  setActivePresetName('custom');
                  setDistanceKm(Number(e.target.value));
                }}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-neutral-500">
                <span>1.0 km</span>
                <span>Base $3.00 + $1.25/km</span>
                <span>15.0 km</span>
              </div>
            </div>
          </div>

          {/* Control 2: Time of Day Selector */}
          <div>
            <label className="text-[11px] font-mono text-neutral-400 block mb-1.5">
              {isThai
                ? '2. เลือกช่วงเวลาของวัน (Time of Day Window):'
                : '2. Select Time of Day Window:'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {TIME_WINDOWS.map((item) => {
                const isSelected = item.id === timeOfDay;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActivePresetName('custom');
                      setTimeOfDay(item.id);
                    }}
                    className={`p-2 rounded text-left font-mono text-xs transition cursor-pointer border ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400 text-white'
                        : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span className="truncate">{item.hours.split(' ')[0]}</span>
                      <span className={item.multiplierDelta < 0 ? 'text-emerald-400' : 'text-amber-400'}>
                        {item.multiplierDelta >= 0 ? `+${item.multiplierDelta}x` : `${item.multiplierDelta}x`}
                      </span>
                    </div>
                    <div className="text-[10px] text-neutral-400 font-sans truncate mt-0.5">
                      {isThai ? item.labelTh : item.labelEn}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Control 3: Weather Condition Selector */}
          <div>
            <label className="text-[11px] font-mono text-neutral-400 block mb-1.5">
              {isThai
                ? '3. เลือกสภาพอากาศในพื้นที่ (Weather Conditions):'
                : '3. Select Local Weather Conditions:'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {WEATHER_CONDITIONS.map((item) => {
                const isSelected = item.id === weather;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActivePresetName('custom');
                      setWeather(item.id);
                    }}
                    className={`p-2.5 rounded text-left font-mono text-xs transition cursor-pointer border ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-400 text-white'
                        : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1">
                        {item.id === 'clear' && <Sun className="w-3.5 h-3.5 text-amber-300" />}
                        {item.id === 'light_rain' && <CloudRain className="w-3.5 h-3.5 text-cyan-300" />}
                        {item.id === 'heavy_storm' && <CloudLightning className="w-3.5 h-3.5 text-rose-400" />}
                        {item.id === 'extreme_heat' && <ThermometerSun className="w-3.5 h-3.5 text-orange-400" />}
                        <span>+{item.multiplierDelta.toFixed(2)}x</span>
                      </span>
                      <span className="text-[10px] text-neutral-400">{item.speedImpactPct}% spd</span>
                    </div>
                    <div className="text-[11px] text-neutral-300 font-sans truncate mt-1">
                      {isThai ? item.labelTh : item.labelEn}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Control 4: Estimated Delivery SLA Tier Selector */}
          <div>
            <label className="text-[11px] font-mono text-neutral-400 block mb-1.5">
              {isThai
                ? '4. เลือกสถานะเวลาจัดส่งคาดการณ์ (Estimated Delivery SLA State):'
                : '4. Select Estimated Delivery SLA State:'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SLA_TIERS.map((item) => {
                const isSelected = item.id === slaState;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActivePresetName('custom');
                      setSlaState(item.id);
                    }}
                    className={`p-2.5 rounded text-left font-mono text-xs transition cursor-pointer border ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-400 text-white'
                        : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span>{item.slaRange}</span>
                      <span className="text-emerald-400">
                        +{item.multiplierDelta.toFixed(2)}x
                        {item.customerRebateUsd > 0 ? ` (-$${item.customerRebateUsd.toFixed(2)})` : ''}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-300 font-sans mt-1">
                      {isThai ? item.labelTh : item.labelEn}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Factor Rationale Callout */}
          <div className="p-3 bg-neutral-900/90 rounded-lg border border-neutral-800 text-xs space-y-1.5">
            <div className="font-mono text-[11px] text-cyan-400 uppercase font-bold">
              {isThai ? 'เหตุผลประกอบการคำนวณของสถานการณ์ที่เลือก:' : 'Active Scenario Operational Rationale:'}
            </div>
            <p className="text-neutral-300 leading-relaxed">
              <strong className="text-white">{isThai ? 'ช่วงเวลา:' : 'Time Window:'}</strong>{' '}
              {isThai ? selectedTimeObj.rationaleTh : selectedTimeObj.rationaleEn}
            </p>
            <p className="text-neutral-300 leading-relaxed">
              <strong className="text-white">{isThai ? 'สภาพอากาศ:' : 'Weather Impact:'}</strong>{' '}
              {isThai ? selectedWeatherObj.rationaleTh : selectedWeatherObj.rationaleEn}
            </p>
            <p className="text-neutral-300 leading-relaxed">
              <strong className="text-white">{isThai ? 'การจัดการ SLA:' : 'SLA Policy:'}</strong>{' '}
              {isThai ? selectedSlaObj.rationaleTh : selectedSlaObj.rationaleEn}
            </p>
          </div>
        </div>

        {/* Right 5 Columns: Step-by-Step Worked Example Receipt */}
        <div className="lg:col-span-5 bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-white">
                  {isThai
                    ? 'ตัวอย่างการคำนวณและปรับราคาคำสั่งซื้อ (Worked Price Adjustment Example)'
                    : 'Worked Order Price Adjustment Example'}
                </h4>
              </div>
              <span className="text-xs font-mono text-cyan-400 font-bold">
                {finalMultiplier.toFixed(2)}x {isThai ? 'สุทธิ' : 'Net'}
              </span>
            </div>

            {/* Hero Price Output Banner */}
            <div className="mt-3 p-3.5 bg-neutral-900/90 rounded-lg border border-neutral-800 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-mono text-neutral-400 uppercase">
                  {isThai ? 'ราคาสุทธิที่ลูกค้าชำระ (Adjusted Order Fee)' : 'Adjusted Order Delivery Fee'}
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">
                  ${finalCustomerOrderPriceUsd.toFixed(2)}
                </div>
                <div className="text-[11px] font-mono text-neutral-400 mt-0.5">
                  {isThai ? 'จากราคาฐานปกติ' : 'vs. Baseline Fee'}:{' '}
                  <span className="line-through text-neutral-500">${standardBasePrice.toFixed(2)}</span>
                  <span className="ml-2 text-cyan-300">
                    ({finalCustomerOrderPriceUsd >= standardBasePrice ? '+' : ''}
                    ${(finalCustomerOrderPriceUsd - standardBasePrice).toFixed(2)})
                  </span>
                </div>
              </div>

              <div className="text-right font-mono">
                <div className="text-[10px] text-neutral-400 uppercase">
                  {isThai ? 'รายได้ไรเดอร์สุทธิ' : 'Courier Payout'}
                </div>
                <div className="text-lg font-bold text-cyan-400">
                  ${courierEarningsUsd.toFixed(2)}
                </div>
                <div className="text-[10px] text-neutral-500">
                  {isThai ? 'รวมโบนัสเร่งด่วน/สภาพอากาศ' : 'Incl. Weather & SLA Bonus'}
                </div>
              </div>
            </div>

            {/* Step-by-Step Ledger Breakdown */}
            <div className="mt-3 space-y-2 text-xs font-mono">
              <div className="text-[11px] text-neutral-400 uppercase font-bold">
                {isThai ? 'รายละเอียดการปรับราคาทีละขั้นตอน:' : 'Step-by-Step Factor Adjustment Ledger:'}
              </div>

              <div className="p-3 bg-neutral-900/60 rounded-lg border border-neutral-800 space-y-2">
                {/* Base Fee */}
                <div className="flex justify-between text-neutral-300">
                  <span>
                    {isThai
                      ? `0. ค่าส่งฐาน ($3.00) + ระยะทาง (${distanceKm.toFixed(1)} กม.):`
                      : `0. Base ($3.00) + Distance (${distanceKm.toFixed(1)} km @ $1.25):`}
                  </span>
                  <span className="font-semibold text-white">${standardBasePrice.toFixed(2)}</span>
                </div>

                {/* Factor 1 */}
                <div className="flex justify-between text-rose-300 pt-1.5 border-t border-neutral-800/70">
                  <span>
                    1. {isThai ? 'ความไม่สมดุลอุปสงค์-อุปทาน' : 'Demand-Supply Imbalance'} ({activeImbalancePct}% →{' '}
                    {imbalanceDelta >= 0 ? `+${imbalanceDelta.toFixed(2)}x` : `${imbalanceDelta.toFixed(2)}x`}):
                  </span>
                  <span>
                    {imbalanceAdjustmentUsd >= 0
                      ? `+$${imbalanceAdjustmentUsd.toFixed(2)}`
                      : `-$${Math.abs(imbalanceAdjustmentUsd).toFixed(2)}`}
                  </span>
                </div>

                {/* Factor 2 */}
                <div className="flex justify-between text-amber-300">
                  <span>
                    2. {isThai ? 'ช่วงเวลาของวัน' : 'Time of Day'} ({isThai ? selectedTimeObj.labelTh : selectedTimeObj.labelEn}{' '}
                    {timeDelta >= 0 ? `+${timeDelta.toFixed(2)}x` : `${timeDelta.toFixed(2)}x`}):
                  </span>
                  <span>
                    {timeAdjustmentUsd >= 0
                      ? `+$${timeAdjustmentUsd.toFixed(2)}`
                      : `-$${Math.abs(timeAdjustmentUsd).toFixed(2)}`}
                  </span>
                </div>

                {/* Factor 3 */}
                <div className="flex justify-between text-cyan-300">
                  <span>
                    3. {isThai ? 'สภาพอากาศ' : 'Weather Condition'} ({isThai ? selectedWeatherObj.labelTh : selectedWeatherObj.labelEn}{' '}
                    +{weatherDelta.toFixed(2)}x):
                  </span>
                  <span>+${weatherAdjustmentUsd.toFixed(2)}</span>
                </div>

                {/* Factor 4 */}
                <div className="flex justify-between text-emerald-300">
                  <span>
                    4. {isThai ? 'ตัวคูณเร่งด่วน SLA' : 'SLA Dispatch Priority'} ({selectedSlaObj.slaRange} +{slaDelta.toFixed(2)}x):
                  </span>
                  <span>+${slaMultiplierAdjustmentUsd.toFixed(2)}</span>
                </div>

                {/* SLA Customer Rebate if applicable */}
                {selectedSlaObj.customerRebateUsd > 0 && (
                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span>
                      ↳ {isThai ? 'ส่วนลดชดเชยลูกค้าจาก SLA ล่าช้า (>35m):' : 'SLA Delay Customer Protection Credit:'}
                    </span>
                    <span>-${selectedSlaObj.customerRebateUsd.toFixed(2)}</span>
                  </div>
                )}

                {/* Guardian Cap Check */}
                {isCappedByGuardian && (
                  <div className="flex justify-between text-purple-300 font-semibold pt-1.5 border-t border-neutral-800/70">
                    <span>
                      5. {isThai ? 'ส่วนลดจากเพดานราคา AEON Guardian (สูงสุด 2.50x):' : 'AEON Guardian 2.50x Price Ceiling Cap:'}
                    </span>
                    <span>-${guardianSavingsUsd.toFixed(2)}</span>
                  </div>
                )}

                {/* Final Net Total */}
                <div className="flex justify-between text-white font-bold pt-2 border-t border-neutral-700 text-sm">
                  <span>{isThai ? 'ราคาค่าจัดส่งสุทธิหลังปรับปรุง:' : 'Final Adjusted Order Delivery Price:'}</span>
                  <span className="text-emerald-400">${finalCustomerOrderPriceUsd.toFixed(2)}</span>
                </div>
              </div>

              {/* Guardian Policy Toggle */}
              <div className="flex items-center justify-between p-2.5 bg-neutral-900/80 rounded-lg border border-neutral-800">
                <label className="flex items-center gap-2 cursor-pointer text-[11px] text-neutral-300">
                  <input
                    type="checkbox"
                    checked={enforceGuardianCap}
                    onChange={(e) => setEnforceGuardianCap(e.target.checked)}
                    className="rounded bg-neutral-800 border-neutral-700 text-cyan-500"
                  />
                  <span>
                    {isThai
                      ? 'เปิดใช้เพดานราคาสูงสุด 2.50x (POL-SURGE-CEILING-V2)'
                      : 'Enforce AEON Guardian 2.50x Price Ceiling'}
                  </span>
                </label>
                <span className="text-[10px] font-mono text-emerald-400">
                  {isCappedByGuardian
                    ? (isThai ? `ตัดส่วนเกิน ${rawCombinedMultiplier.toFixed(2)}x → 2.50x` : `CAPPED (${rawCombinedMultiplier.toFixed(2)}x → 2.50x)`)
                    : (isThai ? 'อยู่ในเกณฑ์ปลอดภัย' : 'WITHIN POLICY')}
                </span>
              </div>
            </div>
          </div>

          {/* Advisory Handoff Footer */}
          <div className="mt-4 pt-3 border-t border-neutral-800 space-y-2">
            <div className="text-[11px] font-mono text-amber-300/90 flex items-center gap-1.5 bg-amber-950/30 p-2 rounded border border-amber-900/50">
              <Shield className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span>
                {isThai
                  ? 'การปรับราคาในระดับโซนเป็นเพียงข้อเสนอแนะ ต้องได้รับการตรวจสอบโดยมนุษย์ผ่าน AEON Guardian'
                  : 'Zone pricing adjustments remain strictly advisory until reviewed and attested via AEON Guardian.'}
              </span>
            </div>

            <button
              onClick={() =>
                onNavigateToGovernance({
                  zone: selectedZone.id,
                  imbalance: activeImbalancePct,
                  recommendedMultiplier: finalMultiplier,
                  estimatedFee: finalCustomerOrderPriceUsd,
                  timeWindow: selectedTimeObj.labelEn,
                  weather: selectedWeatherObj.labelEn,
                  slaRange: selectedSlaObj.slaRange,
                })
              }
              className="w-full py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-mono font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span>
                {isThai
                  ? `ส่งข้อเสนอราคา ${finalMultiplier.toFixed(2)}x ($${finalCustomerOrderPriceUsd.toFixed(2)}) ให้ AEON Guardian อนุมัติ`
                  : `Submit ${finalMultiplier.toFixed(2)}x ($${finalCustomerOrderPriceUsd.toFixed(2)}) Pricing Advisory to AEON Guardian`}
              </span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
