import React, { useMemo, useState } from 'react';
import * as d3 from 'd3';
import { TrendingUp, Users, Package, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface DataPoint {
  minute: number;
  orders: number;
  couriers: number;
}

interface SparklinesProps {
  surgeFactor: number;
  courierDrop: number;
}

export const MarketplaceSummarySparklines: React.FC<SparklinesProps> = ({
  surgeFactor,
  courierDrop,
}) => {
  const { language } = useLanguage();
  const isThai = language === 'th';
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Generate 20 minutes of realistic rolling historical data
  const data: DataPoint[] = useMemo(() => {
    const points: DataPoint[] = [];
    const baseOrders = [
      1420, 1450, 1435, 1490, 1510, 1480, 1530, 1560, 1540, 1590,
      1620, 1610, 1660, 1710, 1750, 1730, 1800, 1840, 1820, 1890,
    ];
    const baseCouriers = [
      880, 895, 890, 875, 870, 885, 860, 850, 845, 830,
      840, 825, 810, 805, 790, 785, 770, 765, 750, 740,
    ];

    for (let i = 0; i < 20; i++) {
      const orderVal = Math.round(baseOrders[i] * (1 + (surgeFactor * (i / 20)) / 100));
      const courierVal = Math.round(baseCouriers[i] * (1 - (courierDrop * (i / 20)) / 100));
      points.push({
        minute: (i - 19) * 2, // -38m to 0m
        orders: orderVal,
        couriers: courierVal,
      });
    }
    return points;
  }, [surgeFactor, courierDrop]);

  // Chart dimensions
  const width = 280;
  const height = 64;
  const margin = { top: 6, right: 6, bottom: 6, left: 6 };

  // D3 Scales & Paths for Orders Sparkline
  const ordersSparkline = useMemo(() => {
    const x = d3
      .scaleLinear()
      .domain([d3.min(data, (d) => d.minute) || -38, 0])
      .range([margin.left, width - margin.right]);

    const y = d3
      .scaleLinear()
      .domain([
        (d3.min(data, (d) => d.orders) || 1200) * 0.95,
        (d3.max(data, (d) => d.orders) || 2200) * 1.05,
      ])
      .range([height - margin.bottom, margin.top]);

    const lineGen = d3
      .line<DataPoint>()
      .x((d) => x(d.minute))
      .y((d) => y(d.orders))
      .curve(d3.curveMonotoneX);

    const areaGen = d3
      .area<DataPoint>()
      .x((d) => x(d.minute))
      .y0(height - margin.bottom)
      .y1((d) => y(d.orders))
      .curve(d3.curveMonotoneX);

    return {
      path: lineGen(data) || '',
      area: areaGen(data) || '',
      x,
      y,
    };
  }, [data]);

  // D3 Scales & Paths for Couriers Sparkline
  const couriersSparkline = useMemo(() => {
    const x = d3
      .scaleLinear()
      .domain([d3.min(data, (d) => d.minute) || -38, 0])
      .range([margin.left, width - margin.right]);

    const y = d3
      .scaleLinear()
      .domain([
        (d3.min(data, (d) => d.couriers) || 500) * 0.92,
        (d3.max(data, (d) => d.couriers) || 1000) * 1.05,
      ])
      .range([height - margin.bottom, margin.top]);

    const lineGen = d3
      .line<DataPoint>()
      .x((d) => x(d.minute))
      .y((d) => y(d.couriers))
      .curve(d3.curveMonotoneX);

    const areaGen = d3
      .area<DataPoint>()
      .x((d) => x(d.minute))
      .y0(height - margin.bottom)
      .y1((d) => y(d.couriers))
      .curve(d3.curveMonotoneX);

    return {
      path: lineGen(data) || '',
      area: areaGen(data) || '',
      x,
      y,
    };
  }, [data]);

  const latest = data[data.length - 1];
  const first = data[0];
  const orderGrowth = (((latest.orders - first.orders) / first.orders) * 100).toFixed(1);
  const courierDelta = (((latest.couriers - first.couriers) / first.couriers) * 100).toFixed(1);

  const hoveredPoint = hoveredIdx !== null ? data[hoveredIdx] : latest;

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
            {isThai
              ? 'สรุปภาพรวมแนวโน้ม 40 นาทีล่าสุด (D3 Sparklines)'
              : 'Rolling 40-Minute Trend Telemetry (D3 Sparklines)'}
          </h3>
        </div>
        <div className="text-[11px] font-mono text-neutral-400 flex items-center gap-3">
          <span>Window: <strong className="text-neutral-200">T-40m → Now</strong></span>
          <span className="text-neutral-600">|</span>
          <span>Sampling: <strong className="text-cyan-400">120s bucket</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sparkline 1: Order Velocity & Volume */}
        <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-xs font-mono text-neutral-300 font-semibold">
                  {isThai ? 'ปริมาณคำสั่งซื้อเรียลไทม์' : 'Order Inflow Volume'}
                </span>
                <div className="text-[10px] text-neutral-500 font-mono">
                  {hoveredPoint.minute === 0
                    ? (isThai ? 'ปัจจุบัน (Now)' : 'Current Moment')
                    : `${hoveredPoint.minute}m ago`}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-base font-mono font-bold text-emerald-400">
                {hoveredPoint.orders.toLocaleString()} req
              </div>
              <div className="text-[10px] font-mono text-emerald-400 flex items-center justify-end gap-0.5">
                <TrendingUp className="w-3 h-3" />
                <span>+{orderGrowth}% in 40m</span>
              </div>
            </div>
          </div>

          {/* D3 SVG Sparkline */}
          <div className="mt-2 relative">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-16 overflow-visible"
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <defs>
                <linearGradient id="orderGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid line at baseline */}
              <line
                x1={margin.left}
                y1={height - margin.bottom}
                x2={width - margin.right}
                y2={height - margin.bottom}
                stroke="#262626"
                strokeWidth="1"
                strokeDasharray="2,2"
              />

              {/* Area */}
              <path d={ordersSparkline.area} fill="url(#orderGrad)" />

              {/* Line */}
              <path
                d={ordersSparkline.path}
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                strokeLinecap="round"
              />

              {/* Points & Interactive Hover Circles */}
              {data.map((d, i) => {
                const cx = ordersSparkline.x(d.minute);
                const cy = ordersSparkline.y(d.orders);
                const isHovered = hoveredIdx === i || (hoveredIdx === null && i === data.length - 1);

                return (
                  <g key={i}>
                    {/* Hover hotspot */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r="12"
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredIdx(i)}
                    />
                    {isHovered && (
                      <>
                        <line
                          x1={cx}
                          y1={margin.top}
                          x2={cx}
                          y2={height - margin.bottom}
                          stroke="#10b981"
                          strokeWidth="1"
                          strokeDasharray="2,2"
                        />
                        <circle
                          cx={cx}
                          cy={cy}
                          r="4"
                          fill="#10b981"
                          stroke="#0a0a0a"
                          strokeWidth="2"
                        />
                      </>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="flex justify-between text-[9px] font-mono text-neutral-500 pt-1 border-t border-neutral-900">
            <span>T-40m</span>
            <span>T-20m</span>
            <span>T-0m (Live)</span>
          </div>
        </div>

        {/* Sparkline 2: Driver Availability */}
        <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <div>
                <span className="text-xs font-mono text-neutral-300 font-semibold">
                  {isThai ? 'จำนวนคนขับ/ไรเดอร์ที่พร้อมรับงาน' : 'Active Courier Availability'}
                </span>
                <div className="text-[10px] text-neutral-500 font-mono">
                  {hoveredPoint.minute === 0
                    ? (isThai ? 'ปัจจุบัน (Now)' : 'Current Moment')
                    : `${hoveredPoint.minute}m ago`}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-base font-mono font-bold text-cyan-400">
                {hoveredPoint.couriers.toLocaleString()} online
              </div>
              <div className={`text-[10px] font-mono flex items-center justify-end gap-0.5 ${
                Number(courierDelta) < 0 ? 'text-rose-400' : 'text-neutral-400'
              }`}>
                <span>{courierDelta}% delta</span>
              </div>
            </div>
          </div>

          {/* D3 SVG Sparkline */}
          <div className="mt-2 relative">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-16 overflow-visible"
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <defs>
                <linearGradient id="courierGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid line at baseline */}
              <line
                x1={margin.left}
                y1={height - margin.bottom}
                x2={width - margin.right}
                y2={height - margin.bottom}
                stroke="#262626"
                strokeWidth="1"
                strokeDasharray="2,2"
              />

              {/* Area */}
              <path d={couriersSparkline.area} fill="url(#courierGrad)" />

              {/* Line */}
              <path
                d={couriersSparkline.path}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2"
                strokeLinecap="round"
              />

              {/* Points & Interactive Hover Circles */}
              {data.map((d, i) => {
                const cx = couriersSparkline.x(d.minute);
                const cy = couriersSparkline.y(d.couriers);
                const isHovered = hoveredIdx === i || (hoveredIdx === null && i === data.length - 1);

                return (
                  <g key={i}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r="12"
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredIdx(i)}
                    />
                    {isHovered && (
                      <>
                        <line
                          x1={cx}
                          y1={margin.top}
                          x2={cx}
                          y2={height - margin.bottom}
                          stroke="#06b6d4"
                          strokeWidth="1"
                          strokeDasharray="2,2"
                        />
                        <circle
                          cx={cx}
                          cy={cy}
                          r="4"
                          fill="#06b6d4"
                          stroke="#0a0a0a"
                          strokeWidth="2"
                        />
                      </>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="flex justify-between text-[9px] font-mono text-neutral-500 pt-1 border-t border-neutral-900">
            <span>T-40m</span>
            <span>T-20m</span>
            <span>T-0m (Live)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
