import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import {
  TrendingUp,
  Clock,
  Star,
  Users,
  Award,
  Zap,
  Calendar,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Send,
  Sparkles,
  ArrowUpRight,
  Filter,
  DollarSign,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { CityMarketplace } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { COURIER_PROFILES_DATA } from '../data/mockData';
import { createGoogleCalendarEvent } from '../services/calendarService';
import { getCurrentUser } from '../services/googleAuth';

interface CourierPerformanceDashboardProps {
  city: CityMarketplace;
  onNavigateToGmailAlerts?: (mode?: 'summary' | 'shift' | 'incident') => void;
}

// Demand forecasting and optimal shift hourly model
const HOURLY_DEMAND_FORECAST = [
  { hour: '06:00', demandIndex: 0.4, expectedOrders: 320, optimalCouriers: 120, avgHourlyEarnings: 18.5, surgeMultiplier: 1.0, recommended: false, shiftPeriod: 'Early Morning' },
  { hour: '08:00', demandIndex: 0.85, expectedOrders: 890, optimalCouriers: 310, avgHourlyEarnings: 27.0, surgeMultiplier: 1.25, recommended: true, shiftPeriod: 'Breakfast Peak' },
  { hour: '10:00', demandIndex: 0.65, expectedOrders: 540, optimalCouriers: 200, avgHourlyEarnings: 22.5, surgeMultiplier: 1.05, recommended: false, shiftPeriod: 'Mid-Morning' },
  { hour: '12:00', demandIndex: 1.45, expectedOrders: 1680, optimalCouriers: 580, avgHourlyEarnings: 39.5, surgeMultiplier: 1.65, recommended: true, shiftPeriod: 'Lunch Peak Rush' },
  { hour: '14:00', demandIndex: 0.75, expectedOrders: 620, optimalCouriers: 240, avgHourlyEarnings: 24.0, surgeMultiplier: 1.1, recommended: false, shiftPeriod: 'Afternoon Lull' },
  { hour: '16:00', demandIndex: 0.95, expectedOrders: 980, optimalCouriers: 360, avgHourlyEarnings: 29.5, surgeMultiplier: 1.3, recommended: true, shiftPeriod: 'Early Evening' },
  { hour: '18:00', demandIndex: 1.6, expectedOrders: 2150, optimalCouriers: 720, avgHourlyEarnings: 44.0, surgeMultiplier: 1.85, recommended: true, shiftPeriod: 'Dinner Peak Wave' },
  { hour: '20:00', demandIndex: 1.3, expectedOrders: 1420, optimalCouriers: 510, avgHourlyEarnings: 36.5, surgeMultiplier: 1.5, recommended: true, shiftPeriod: 'Late Evening Rush' },
  { hour: '22:00', demandIndex: 0.8, expectedOrders: 710, optimalCouriers: 260, avgHourlyEarnings: 26.0, surgeMultiplier: 1.2, recommended: false, shiftPeriod: 'Night Operations' },
];

const SHIFT_RECOMMENDATIONS = [
  {
    id: 'SHIFT-OPT-01',
    title: 'High-Yield Lunch Acceleration',
    zone: 'Financial District & Midtown South',
    timeWindow: '11:30 AM – 2:30 PM',
    startHour: 11,
    startMinute: 30,
    endHour: 14,
    endMinute: 30,
    durationHours: 3.0,
    projectedDemandSpike: '+48%',
    estimatedHourlyEarnings: '$39.50 / hr',
    projectedTotalEarnings: '$118.50',
    surgeBonus: '1.65× Dynamic Surge',
    efficiencyScore: 96,
    recommendedVehicles: ['E-Bike', 'Scooter', 'Light EV'],
    aiRationale: 'Concentrated corporate lunch orders within 1.5km delivery radii minimize transit idle time and yield highest deliveries per hour.',
  },
  {
    id: 'SHIFT-OPT-02',
    title: 'Evening Prime Dinner Surge Roster',
    zone: 'Lower East Side & Downtown Core',
    timeWindow: '5:30 PM – 9:30 PM',
    startHour: 17,
    startMinute: 30,
    endHour: 21,
    endMinute: 30,
    durationHours: 4.0,
    projectedDemandSpike: '+62%',
    estimatedHourlyEarnings: '$44.00 / hr',
    projectedTotalEarnings: '$176.00',
    surgeBonus: '1.85× Peak Multiplier',
    efficiencyScore: 98,
    recommendedVehicles: ['Cargo Van', 'Car', 'E-Bike'],
    aiRationale: 'Multi-order batching opportunities peak between 6 PM and 8:30 PM with high basket value tips and priority delivery requests.',
  },
  {
    id: 'SHIFT-OPT-03',
    title: 'Breakfast & Morning Commuter Express',
    zone: 'The Loop & Transit Terminals',
    timeWindow: '7:30 AM – 10:30 AM',
    startHour: 7,
    startMinute: 30,
    endHour: 10,
    endMinute: 30,
    durationHours: 3.0,
    projectedDemandSpike: '+35%',
    estimatedHourlyEarnings: '$28.00 / hr',
    projectedTotalEarnings: '$84.00',
    surgeBonus: '1.25× Morning Multiplier',
    efficiencyScore: 91,
    recommendedVehicles: ['E-Bike', 'Scooter'],
    aiRationale: 'Rapid coffee and bakery turnaround times; low vehicle traffic congestion enables superior on-time SLA metrics.',
  },
];

const RATING_COLORS = ['#ef4444', '#f97316', '#eab308', '#38bdf8', '#10b981'];

export const CourierPerformanceDashboard: React.FC<CourierPerformanceDashboardProps> = ({
  city,
  onNavigateToGmailAlerts,
}) => {
  const { t } = useLanguage();
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>('ALL');
  const [activeShiftView, setActiveShiftView] = useState<'FORECAST' | 'SHIFTS'>('SHIFTS');
  const [schedulingShiftId, setSchedulingShiftId] = useState<string | null>(null);
  const [scheduleStatus, setScheduleStatus] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [confirmShiftModal, setConfirmShiftModal] = useState<typeof SHIFT_RECOMMENDATIONS[0] | null>(null);

  const couriers = COURIER_PROFILES_DATA;

  // Aggregate Zone Performance Metrics for Recharts
  const zoneChartData = city.zones.map((zone) => {
    const estimatedDeliveries = Math.round(zone.activeOrders * 0.85);
    const efficiencyIndex = Math.round(
      Math.max(60, 100 - zone.medianSlaMinutes * 1.2 - Math.abs(zone.imbalancePct) * 0.5)
    );
    return {
      name: zone.name.split('/')[0].trim(),
      fullName: zone.name,
      deliveries: estimatedDeliveries,
      avgDeliveryTime: zone.medianSlaMinutes,
      slaTarget: 30,
      efficiencyIndex: efficiencyIndex,
      couriersAvailable: zone.availableCouriers,
      backlog: zone.unmatchedBacklog,
      imbalance: zone.imbalancePct,
      status: zone.status,
    };
  });

  // Calculate Rating Distribution
  const aggregatedRatings = [
    { name: '1 Star', count: 18, percentage: 3, fill: RATING_COLORS[0] },
    { name: '2 Stars', count: 32, percentage: 5, fill: RATING_COLORS[1] },
    { name: '3 Stars', count: 78, percentage: 12, fill: RATING_COLORS[2] },
    { name: '4 Stars', count: 215, percentage: 33, fill: RATING_COLORS[3] },
    { name: '5 Stars', count: 310, percentage: 47, fill: RATING_COLORS[4] },
  ];

  // Handle scheduling a shift to Google Calendar with mandatory explicit confirmation
  const handleConfirmScheduleCalendar = async (shift: typeof SHIFT_RECOMMENDATIONS[0]) => {
    setSchedulingShiftId(shift.id);
    setConfirmShiftModal(null);

    try {
      // Calculate today's date with shift hours
      const now = new Date();
      const startDate = new Date(now);
      startDate.setHours(shift.startHour, shift.startMinute, 0, 0);
      
      const endDate = new Date(now);
      endDate.setHours(shift.endHour, shift.endMinute, 0, 0);

      const user = getCurrentUser();
      const result = await createGoogleCalendarEvent({
        summary: `[AEON MATRIX] Optimal Shift: ${shift.title}`,
        description: `Automated AI Shift Recommendation to maximize courier earnings.\n\nZone: ${shift.zone}\nProjected Earnings: ${shift.estimatedHourlyEarnings} (Total: ${shift.projectedTotalEarnings})\nSurge Multiplier: ${shift.surgeBonus}\nAI Rationale: ${shift.aiRationale}\n\nGenerated by AEON MATRIX Logistics Intelligence.`,
        location: `${shift.zone}, ${city.cityName}`,
        startDateTimeIso: startDate.toISOString(),
        endDateTimeIso: endDate.toISOString(),
        attendees: user?.email ? [user.email] : undefined,
      });

      if (result.success) {
        setScheduleStatus({
          id: shift.id,
          success: true,
          message: `Successfully scheduled "${shift.title}" to Google Calendar!`,
        });
      }
    } catch (err: any) {
      setScheduleStatus({
        id: shift.id,
        success: false,
        message: err?.message || 'Failed to schedule to Google Calendar. Make sure Google Sign-In is active.',
      });
    } finally {
      setSchedulingShiftId(null);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner & Metric Badges */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-6 relative overflow-hidden backdrop-blur-sm">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold tracking-wider">
                CAPABILITY 07 • COURIER PERFORMANCE & SHIFT OPTIMIZER
              </span>
              <span className="text-xs font-mono text-neutral-400">
                {city.cityName} ({city.cluster})
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-cyan-400" />
              Courier Fleet Efficiency & Shift Intelligence
            </h2>
            <p className="text-sm text-neutral-400 mt-1 max-w-3xl">
              Real-time analytics on courier efficiency, delivery duration SLAs, and customer satisfaction distributions across city zones. Includes an automated shift recommendation engine designed to maximize courier earnings based on demand forecasting.
            </p>
          </div>

          {/* Quick Action to Gmail Alert Hub */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigateToGmailAlerts?.('summary')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold font-mono transition cursor-pointer shadow-sm hover:shadow-cyan-500/20"
            >
              <Mail className="w-4 h-4 text-cyan-400" />
              Email Summary to Ops Managers
            </button>
          </div>
        </div>

        {/* Global Summary KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-neutral-800/80">
          <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-lg p-3">
            <div className="text-[11px] text-neutral-400 font-mono uppercase">Fleet Efficiency Index</div>
            <div className="text-xl font-bold text-cyan-300 font-mono mt-1 flex items-center gap-2">
              94.2%
              <span className="text-xs text-emerald-400 font-normal flex items-center">
                <ArrowUpRight className="w-3 h-3" /> +3.8%
              </span>
            </div>
          </div>

          <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-lg p-3">
            <div className="text-[11px] text-neutral-400 font-mono uppercase">Avg Citywide Delivery Time</div>
            <div className="text-xl font-bold text-amber-300 font-mono mt-1">
              {city.avgSlaMinutes} min
            </div>
          </div>

          <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-lg p-3">
            <div className="text-[11px] text-neutral-400 font-mono uppercase">Avg Customer Rating</div>
            <div className="text-xl font-bold text-yellow-300 font-mono mt-1 flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              4.86 / 5.0
            </div>
          </div>

          <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-lg p-3">
            <div className="text-[11px] text-neutral-400 font-mono uppercase">Peak Earning Multiplier</div>
            <div className="text-xl font-bold text-emerald-400 font-mono mt-1 flex items-center gap-1">
              <Zap className="w-4 h-4 text-emerald-400" />
              1.85× Max Surge
            </div>
          </div>
        </div>
      </div>

      {/* Section 1: Recharts Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Courier Efficiency & Backlog by Zone (7 cols) */}
        <div className="lg:col-span-7 bg-neutral-900/80 border border-neutral-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-cyan-400" />
                  Courier Efficiency & Delivery Volumes by Zone
                </h3>
                <p className="text-xs text-neutral-400">
                  Efficiency score (0–100) vs estimated active delivery volume per zone
                </p>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300">
                Live Spatial Telemetry
              </span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={zoneChartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#737373"
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                    angle={-10}
                    textAnchor="end"
                  />
                  <YAxis yAxisId="left" stroke="#737373" fontSize={11} tickLine={false} domain={[50, 100]} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#737373"
                    fontSize={11}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#171717',
                      borderColor: '#404040',
                      borderRadius: '8px',
                      color: '#f5f5f5',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar
                    yAxisId="left"
                    dataKey="efficiencyIndex"
                    name="Efficiency Index (%)"
                    fill="#06b6d4"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="deliveries"
                    name="Completed Deliveries"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-neutral-800 text-[11px] text-neutral-400 flex items-center justify-between">
            <span>High efficiency correlates with &lt;25 min median SLA and balanced courier coverage.</span>
            <span className="text-cyan-400 font-mono">Target: &gt;90%</span>
          </div>
        </div>

        {/* Chart 2: Rating Distributions across Couriers (5 cols) */}
        <div className="lg:col-span-5 bg-neutral-900/80 border border-neutral-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" />
                  Courier Rating Distribution
                </h3>
                <p className="text-xs text-neutral-400">
                  Breakdown across {city.availableCouriers} registered couriers
                </p>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                80% 4★ & 5★
              </span>
            </div>

            <div className="h-72 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={aggregatedRatings}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="percentage"
                    nameKey="name"
                    label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {aggregatedRatings.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#171717',
                      borderColor: '#404040',
                      borderRadius: '8px',
                      color: '#f5f5f5',
                      fontSize: '12px',
                    }}
                    formatter={(value: any, name: any, item: any) => [
                      `${value}% (${item.payload.count} couriers)`,
                      item.payload.name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1 pt-3 border-t border-neutral-800 text-center text-[10px] font-mono">
            {aggregatedRatings.map((item, idx) => (
              <div key={idx} className="p-1 rounded bg-neutral-950/60 border border-neutral-800">
                <div style={{ color: item.fill }} className="font-bold">{item.name.split(' ')[0]}★</div>
                <div className="text-neutral-400">{item.percentage}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 3: Average Delivery Times vs SLA Targets (12 cols) */}
        <div className="lg:col-span-12 bg-neutral-900/80 border border-neutral-800 rounded-xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Average Delivery Times vs Guaranteed SLA Baseline by Zone
              </h3>
              <p className="text-xs text-neutral-400">
                Tracking median delivery minutes against the strict 30-minute benchmark
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-amber-400">
                <span className="w-3 h-0.5 bg-amber-400 inline-block" />
                Actual Delivery SLA
              </div>
              <div className="flex items-center gap-1.5 text-red-400">
                <span className="w-3 h-0.5 bg-red-500 border-b border-dashed inline-block" />
                SLA Breach Ceiling (30m)
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={zoneChartData} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                <defs>
                  <linearGradient id="slaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="fullName" stroke="#737373" fontSize={11} tickLine={false} />
                <YAxis stroke="#737373" fontSize={11} tickLine={false} domain={[10, 50]} unit="m" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#171717',
                    borderColor: '#404040',
                    borderRadius: '8px',
                    color: '#f5f5f5',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="avgDeliveryTime"
                  name="Actual SLA (min)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#slaGradient)"
                />
                <Line
                  type="monotone"
                  dataKey="slaTarget"
                  name="SLA Target Ceiling (30 min)"
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Section 2: Automated Shift Recommendation Engine */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold">
                AI EARNINGS OPTIMIZER
              </span>
              <span className="text-xs font-mono text-cyan-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Demand-Driven Shift Allocation
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
              Automated Shift Recommendation Engine for Couriers
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Recommends high-earnings working hours by correlating spatial demand velocity, restaurant rush curves, and weather multipliers.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs font-mono">
            <button
              onClick={() => setActiveShiftView('SHIFTS')}
              className={`px-3 py-1.5 rounded transition cursor-pointer ${
                activeShiftView === 'SHIFTS'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Recommended Roster ({SHIFT_RECOMMENDATIONS.length})
            </button>
            <button
              onClick={() => setActiveShiftView('FORECAST')}
              className={`px-3 py-1.5 rounded transition cursor-pointer ${
                activeShiftView === 'FORECAST'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Hourly Demand Curve
            </button>
          </div>
        </div>

        {/* Status Notification */}
        {scheduleStatus && (
          <div
            className={`mt-4 p-3 rounded-lg text-xs font-mono flex items-center justify-between border ${
              scheduleStatus.success
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-red-950/40 border-red-500/40 text-red-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {scheduleStatus.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{scheduleStatus.message}</span>
            </div>
            <button
              onClick={() => setScheduleStatus(null)}
              className="text-neutral-400 hover:text-white ml-2"
            >
              ×
            </button>
          </div>
        )}

        {/* View 1: Recommended Shifts Cards */}
        {activeShiftView === 'SHIFTS' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {SHIFT_RECOMMENDATIONS.map((shift) => (
              <div
                key={shift.id}
                className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-5 flex flex-col justify-between hover:border-cyan-500/40 transition group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-mono font-bold">
                      {shift.id}
                    </span>
                    <span className="text-xs font-mono font-semibold text-emerald-400 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      {shift.projectedDemandSpike} Demand
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-white group-hover:text-cyan-300 transition">
                    {shift.title}
                  </h4>
                  <div className="text-xs text-neutral-400 mt-1 flex items-center gap-1.5 font-mono">
                    <Clock className="w-3.5 h-3.5 text-neutral-500" />
                    {shift.timeWindow} ({shift.durationHours} hrs)
                  </div>
                  <div className="text-xs text-neutral-400 mt-1">
                    Zone: <span className="text-neutral-300 font-medium">{shift.zone}</span>
                  </div>

                  {/* Financial Projection Box */}
                  <div className="mt-4 p-3 bg-neutral-900 border border-neutral-800 rounded-lg space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400">Est. Hourly Rate:</span>
                      <span className="font-bold text-emerald-400 font-mono">{shift.estimatedHourlyEarnings}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400">Shift Total Est:</span>
                      <span className="font-bold text-white font-mono">{shift.projectedTotalEarnings}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400">Surge Multiplier:</span>
                      <span className="font-semibold text-amber-300 font-mono">{shift.surgeBonus}</span>
                    </div>
                  </div>

                  <p className="mt-3 text-[11px] text-neutral-400 leading-relaxed italic">
                    "{shift.aiRationale}"
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {shift.recommendedVehicles.map((v, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-300 font-mono"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-neutral-800/80 flex flex-col gap-2">
                  <button
                    onClick={() => setConfirmShiftModal(shift)}
                    disabled={schedulingShiftId === shift.id}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-cyan-300 text-xs font-semibold font-mono transition cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    {schedulingShiftId === shift.id ? 'Scheduling...' : 'Add to Google Calendar'}
                  </button>

                  <button
                    onClick={() => onNavigateToGmailAlerts?.('shift')}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg hover:bg-neutral-900/60 text-neutral-400 hover:text-neutral-200 text-[11px] font-mono transition cursor-pointer"
                  >
                    <Mail className="w-3 h-3" />
                    Email Shift Briefing to Managers
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View 2: Hourly Demand Forecasting Recharts view */}
        {activeShiftView === 'FORECAST' && (
          <div className="mt-6 space-y-4">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={HOURLY_DEMAND_FORECAST} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                  <XAxis dataKey="hour" stroke="#737373" fontSize={11} tickLine={false} />
                  <YAxis yAxisId="left" stroke="#737373" fontSize={11} tickLine={false} domain={[0, 2500]} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#737373"
                    fontSize={11}
                    tickLine={false}
                    domain={[10, 50]}
                    unit="$"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#171717',
                      borderColor: '#404040',
                      borderRadius: '8px',
                      color: '#f5f5f5',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="expectedOrders"
                    name="Projected Order Demand"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#06b6d4' }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="avgHourlyEarnings"
                    name="Projected Courier $/Hr"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#10b981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg">
                <span className="text-neutral-500">Highest Earning Slot:</span>
                <div className="text-emerald-400 font-bold mt-0.5">18:00 – 20:00 ($44/hr)</div>
              </div>
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg">
                <span className="text-neutral-500">Max Order Concentration:</span>
                <div className="text-cyan-400 font-bold mt-0.5">2,150 Orders (Dinner Wave)</div>
              </div>
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg">
                <span className="text-neutral-500">Suggested Rest Interval:</span>
                <div className="text-amber-400 font-bold mt-0.5">14:00 – 16:00 (Off-Peak)</div>
              </div>
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg">
                <span className="text-neutral-500">Earnings Uplift vs Static:</span>
                <div className="text-purple-400 font-bold mt-0.5">+42% with AI Shift Optimization</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mandatory User Confirmation Dialog Modal for Google Calendar */}
      {confirmShiftModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-cyan-500/50 rounded-xl max-w-lg w-full p-6 shadow-2xl animate-scaleUp">
            <div className="flex items-center gap-2 text-cyan-400 mb-3">
              <Calendar className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-bold text-white">
                Confirm Google Calendar Schedule
              </h3>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed mb-4">
              You are about to add the following optimal courier shift to your connected Google Calendar. Please confirm the details below:
            </p>

            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 space-y-2 text-xs font-mono mb-6">
              <div className="flex justify-between">
                <span className="text-neutral-500">Event Title:</span>
                <span className="text-white font-semibold">{confirmShiftModal.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Time Window:</span>
                <span className="text-cyan-400">{confirmShiftModal.timeWindow} (Today)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Target Zone:</span>
                <span className="text-neutral-300">{confirmShiftModal.zone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Projected Earnings:</span>
                <span className="text-emerald-400">{confirmShiftModal.projectedTotalEarnings} ({confirmShiftModal.estimatedHourlyEarnings})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Surge Multiplier:</span>
                <span className="text-amber-400">{confirmShiftModal.surgeBonus}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmShiftModal(null)}
                className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmScheduleCalendar(confirmShiftModal)}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-semibold transition cursor-pointer shadow-lg shadow-cyan-600/30"
              >
                Confirm & Add to Calendar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
