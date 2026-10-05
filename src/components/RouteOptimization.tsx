import React, { useState } from 'react';
import {
  Cpu,
  MapPin,
  Truck,
  Box,
  Clock,
  AlertCircle,
  FileCheck,
  CheckCircle,
  Sliders,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { DeliveryStop, RouteOptimizationResult } from '../types';
import { INITIAL_DELIVERY_STOPS } from '../data/mockData';

export const RouteOptimization: React.FC = () => {
  const [vehicleType, setVehicleType] = useState<'CARGO_VAN' | 'E_BIKE' | 'REFRIGERATED_SPRINTER'>('CARGO_VAN');
  const [trafficCondition, setTrafficCondition] = useState<'CLEAR' | 'MODERATE' | 'HEAVY'>('MODERATE');
  const [enforceLifo, setEnforceLifo] = useState<boolean>(true);
  const [enforceHeavyBottom, setEnforceHeavyBottom] = useState<boolean>(true);
  const [enforceColdChain, setEnforceColdChain] = useState<boolean>(true);
  const [enableReplacementBuffer, setEnableReplacementBuffer] = useState<boolean>(true);
  const [activeStopId, setActiveStopId] = useState<string>('STOP-1');

  // Traffic multiplier calculation
  const trafficMultiplier = trafficCondition === 'CLEAR' ? 0.85 : trafficCondition === 'MODERATE' ? 1.0 : 1.45;

  // Stops calculation based on constraints
  const stops: DeliveryStop[] = INITIAL_DELIVERY_STOPS.map((stop, idx) => {
    const adjustedEta = +(stop.etaMinutes * trafficMultiplier).toFixed(1);
    const adjustedRisk = +(stop.slaRisk * (trafficCondition === 'HEAVY' ? 1.6 : 1.0)).toFixed(2);
    return {
      ...stop,
      etaMinutes: adjustedEta,
      slaRisk: Math.min(0.99, adjustedRisk),
    };
  });

  const selectedStop = stops.find((s) => s.id === activeStopId) || stops[0];

  const totalDistanceKm = +(stops.reduce((acc, s) => acc + s.distanceKm, 0) / 2.5).toFixed(1);
  const projectedDurationMin = +(stops[stops.length - 1].etaMinutes).toFixed(1);
  const totalWeightKg = stops.reduce((acc, s) => acc + s.weightKg, 0);
  const maxWeightKg = vehicleType === 'E_BIKE' ? 75 : vehicleType === 'CARGO_VAN' ? 650 : 450;
  const weightUtilPct = Math.round((totalWeightKg / maxWeightKg) * 100);
  const volumetricUtilPct = vehicleType === 'E_BIKE' ? 88 : vehicleType === 'CARGO_VAN' ? 64 : 78;
  const meanSlaRisk = +(stops.reduce((acc, s) => acc + s.slaRisk, 0) / stops.length).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="bg-neutral-900/60 p-4 rounded-xl border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-mono text-xs font-semibold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30">
              CAPABILITY 03
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">Route & Logistics Optimization</h2>
          </div>
          <p className="text-xs text-neutral-400 mt-1 max-w-3xl">
            Advisory multi-stop vehicle routing engine (PDPTW) with physical cargo loading topologies (LIFO deliver-first loaded-last, heavy-goods base placement, perishable cold-chain thresholds, and replacement stock routing).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded bg-neutral-800 text-neutral-300 font-mono text-xs border border-neutral-700 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Advisory-Only Engine</span>
          </span>
        </div>
      </div>

      {/* Inputs & Parameters Panel */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
              Optimization Constraints & Scenario Inputs
            </h3>
          </div>
          <span className="text-[11px] font-mono text-neutral-400">5 Delivery Drops In Queue</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Vehicle Type Selection */}
          <div>
            <label className="text-[11px] font-mono text-neutral-400 block mb-1.5">Vehicle Fleet Profile:</label>
            <div className="space-y-1">
              {[
                { id: 'CARGO_VAN', label: 'Cargo Van (Payload 650kg)', icon: Truck },
                { id: 'E_BIKE', label: 'E-Cargo Bike (Payload 75kg)', icon: Box },
                { id: 'REFRIGERATED_SPRINTER', label: 'Refrigerated Sprinter', icon: Truck },
              ].map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVehicleType(v.id as any)}
                  className={`w-full px-2.5 py-1.5 rounded text-left text-xs font-mono flex items-center justify-between transition cursor-pointer ${
                    vehicleType === v.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                      : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                  }`}
                >
                  <span>{v.label}</span>
                  {vehicleType === v.id && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                </button>
              ))}
            </div>
          </div>

          {/* Traffic Assumption */}
          <div>
            <label className="text-[11px] font-mono text-neutral-400 block mb-1.5">Traffic Assumption:</label>
            <div className="space-y-1">
              {[
                { id: 'CLEAR', label: 'Light Traffic (Off-Peak, -15% ETA)' },
                { id: 'MODERATE', label: 'Standard Urban Flow (Baseline)' },
                { id: 'HEAVY', label: 'Congested Arterials (+45% ETA)' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTrafficCondition(t.id as any)}
                  className={`w-full px-2.5 py-1.5 rounded text-left text-xs font-mono transition cursor-pointer ${
                    trafficCondition === t.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                      : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product Handling Constraints Toggles */}
          <div className="lg:col-span-2">
            <label className="text-[11px] font-mono text-neutral-400 block mb-1.5">
              Active Physical & Operational Constraints:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
              <label className="flex items-center gap-2 bg-neutral-950 p-2 rounded border border-neutral-800 cursor-pointer hover:border-neutral-700">
                <input
                  type="checkbox"
                  checked={enforceLifo}
                  onChange={(e) => setEnforceLifo(e.target.checked)}
                  className="rounded bg-neutral-800 border-neutral-700 text-cyan-500 focus:ring-0"
                />
                <span className="text-neutral-300">Deliver-First Loaded-Last (LIFO)</span>
              </label>

              <label className="flex items-center gap-2 bg-neutral-950 p-2 rounded border border-neutral-800 cursor-pointer hover:border-neutral-700">
                <input
                  type="checkbox"
                  checked={enforceHeavyBottom}
                  onChange={(e) => setEnforceHeavyBottom(e.target.checked)}
                  className="rounded bg-neutral-800 border-neutral-700 text-cyan-500 focus:ring-0"
                />
                <span className="text-neutral-300">Heavy Goods Placement (&gt;15kg Base Deck)</span>
              </label>

              <label className="flex items-center gap-2 bg-neutral-950 p-2 rounded border border-neutral-800 cursor-pointer hover:border-neutral-700">
                <input
                  type="checkbox"
                  checked={enforceColdChain}
                  onChange={(e) => setEnforceColdChain(e.target.checked)}
                  className="rounded bg-neutral-800 border-neutral-700 text-cyan-500 focus:ring-0"
                />
                <span className="text-neutral-300">Cold-Chain Temperature Lock (4°C)</span>
              </label>

              <label className="flex items-center gap-2 bg-neutral-950 p-2 rounded border border-neutral-800 cursor-pointer hover:border-neutral-700">
                <input
                  type="checkbox"
                  checked={enableReplacementBuffer}
                  onChange={(e) => setEnableReplacementBuffer(e.target.checked)}
                  className="rounded bg-neutral-800 border-neutral-700 text-cyan-500 focus:ring-0"
                />
                <span className="text-neutral-300">Replacement Stock Routing for High-Risk</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Top 5 Optimization KPI Outputs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-neutral-400 uppercase">Total Stops</div>
          <div className="text-xl font-bold font-mono text-white mt-1">{stops.length} Drops</div>
          <div className="text-[10px] text-neutral-500 font-mono mt-0.5">Origin: Fulfillment Hub 04</div>
        </div>

        <div className="bg-neutral-900/80 border border-neutral-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-neutral-400 uppercase">Est Total Distance</div>
          <div className="text-xl font-bold font-mono text-cyan-400 mt-1">{totalDistanceKm} km</div>
          <div className="text-[10px] text-emerald-400 font-mono mt-0.5">-2.4 km vs greedy route</div>
        </div>

        <div className="bg-neutral-900/80 border border-neutral-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-neutral-400 uppercase">Total Duration</div>
          <div className="text-xl font-bold font-mono text-white mt-1">{projectedDurationMin} min</div>
          <div className="text-[10px] text-neutral-400 font-mono mt-0.5">Traffic: {trafficCondition}</div>
        </div>

        <div className="bg-neutral-900/80 border border-neutral-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-neutral-400 uppercase">Payload Capacity</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">{weightUtilPct}%</div>
          <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{totalWeightKg.toFixed(1)} / {maxWeightKg} kg</div>
        </div>

        <div className="bg-neutral-900/80 border border-neutral-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-neutral-400 uppercase">Mean SLA Risk</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{meanSlaRisk} / 1.0</div>
          <div className="text-[10px] text-neutral-400 font-mono mt-0.5">Low Breach Probability</div>
        </div>
      </div>

      {/* Main Grid: Visual SVG Route Map & Cargo Placement vs Stop Sequence Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Visual Schematic Map & Vehicle Compartment (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Visual Route Canvas */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800 mb-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  Recommended Multi-Stop Sequence Visualizer
                </h3>
              </div>
              <span className="text-[10px] font-mono text-neutral-400">Advisory ID: RO-2026-9921</span>
            </div>

            <div className="relative h-64 bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden">
              {/* Subtle Grid lines */}
              <svg className="w-full h-full">
                <defs>
                  <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#262626" strokeWidth="0.5" />
                  </pattern>
                  <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#gridPattern)" />

                {/* Hub Point */}
                <circle cx="15%" cy="20%" r="9" fill="#0284c7" />
                <text x="15%" y="20%" textAnchor="middle" dy="3" fill="#fff" fontSize="9" fontWeight="bold" fontFamily="monospace">
                  HUB
                </text>

                {/* Route connecting path */}
                <polyline
                  points="55,48 110,84 165,96 220,132 275,168 92,156"
                  fill="none"
                  stroke="url(#routeGrad)"
                  strokeWidth="2.5"
                  strokeDasharray="4,3"
                />

                {/* Stops */}
                {stops.map((stop, idx) => {
                  const isSelected = stop.id === activeStopId;
                  // Map coordinates roughly across the SVG width
                  const cx = `${stop.coordinates.x * 3.4 + 20}`;
                  const cy = `${stop.coordinates.y * 2.1 + 20}`;

                  return (
                    <g key={stop.id} onClick={() => setActiveStopId(stop.id)} className="cursor-pointer">
                      {isSelected && (
                        <circle cx={cx} cy={cy} r="18" fill="#06b6d4" fillOpacity="0.2" className="animate-pulse" />
                      )}
                      <circle
                        cx={cx}
                        cy={cy}
                        r="11"
                        fill={isSelected ? '#06b6d4' : '#171717'}
                        stroke={isSelected ? '#22d3ee' : '#525252'}
                        strokeWidth="2"
                      />
                      <text
                        x={cx}
                        y={cy}
                        textAnchor="middle"
                        dy="3.5"
                        fill={isSelected ? '#000' : '#fff'}
                        fontSize="10"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {idx + 1}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Map Footer status */}
              <div className="absolute bottom-2 left-2 right-2 bg-neutral-900/90 border border-neutral-800 rounded px-3 py-1.5 flex items-center justify-between text-[11px] font-mono">
                <span className="text-neutral-400">
                  Inspecting Stop #{stops.findIndex((s) => s.id === activeStopId) + 1}: <strong className="text-cyan-400">{selectedStop.customer}</strong>
                </span>
                <span className="text-neutral-300">ETA: {selectedStop.etaMinutes}m</span>
              </div>
            </div>
          </div>

          {/* Cargo Bay Cross-Section Loading Schematic */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800 mb-2">
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  Vehicle Cargo Bay Schematic (LIFO & Weight Distribution)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">CG Balanced</span>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-neutral-950 p-3 rounded-lg border border-neutral-800 text-xs font-mono">
              {/* Upper Deck */}
              <div className="p-2.5 rounded bg-neutral-900 border border-neutral-800">
                <div className="text-[10px] text-neutral-500 font-bold uppercase">Upper Tier (Fragile)</div>
                <div className="text-white font-semibold mt-1">ORD-89230 (Stop 3)</div>
                <div className="text-[10px] text-neutral-400 mt-0.5">4.1 kg • Glassware</div>
                <div className="mt-2 text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 inline-block">
                  TOP DECK
                </div>
              </div>

              {/* Mid Secure */}
              <div className="p-2.5 rounded bg-neutral-900 border border-cyan-500/30">
                <div className="text-[10px] text-cyan-400 font-bold uppercase">Mid Deck (Cold-Chain)</div>
                <div className="text-white font-semibold mt-1">ORD-89219 (Stop 2)</div>
                <div className="text-[10px] text-neutral-400 mt-0.5">6.2 kg • 4°C Monitored</div>
                <div className="mt-2 text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 inline-block">
                  ISOTHERMAL
                </div>
              </div>

              {/* Rear Accessible */}
              <div className="p-2.5 rounded bg-neutral-900 border border-emerald-500/30">
                <div className="text-[10px] text-emerald-400 font-bold uppercase">Rear Hatch (LIFO 1st Out)</div>
                <div className="text-white font-semibold mt-1">ORD-89255 (Stop 5)</div>
                <div className="text-[10px] text-neutral-400 mt-0.5">2.8 kg • Quick Access</div>
                <div className="mt-2 text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 inline-block">
                  LAST LOADED
                </div>
              </div>

              {/* Base Deck Heavy Goods */}
              <div className="col-span-3 p-2.5 rounded bg-neutral-900/90 border border-amber-500/40 mt-1">
                <div className="text-[10px] text-amber-400 font-bold uppercase flex items-center justify-between">
                  <span>Base Deck (Heavy Low-CG Goods &gt; 15 kg)</span>
                  <span className="text-neutral-400">Total: 34.5 kg base ballast</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="text-[11px] text-neutral-200">
                    • ORD-89211 (18.5 kg, Stop 1, Hard Window)
                  </div>
                  <div className="text-[11px] text-neutral-200">
                    • ORD-89244 (16.0 kg, Stop 4, Ground Pallet)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Stop Sequence Manifest & Evidence Attestation (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Stops Table */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800 mb-2">
              <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                Advisory Stop Sequence & Windows
              </h3>
              <span className="text-[10px] font-mono text-cyan-400">PDPTW Solved (18ms)</span>
            </div>

            <div className="space-y-2">
              {stops.map((stop, idx) => {
                const isSelected = stop.id === activeStopId;
                return (
                  <div
                    key={stop.id}
                    onClick={() => setActiveStopId(stop.id)}
                    className={`p-2.5 rounded-lg border transition cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-800/90 border-cyan-400 shadow-md shadow-cyan-500/10'
                        : 'bg-neutral-950/80 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2 font-bold text-white">
                        <span className="w-5 h-5 rounded bg-neutral-700 flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        <span>{stop.customer}</span>
                      </div>
                      <span className="text-cyan-400 font-semibold">ETA: {stop.etaMinutes}m</span>
                    </div>

                    <div className="text-[11px] text-neutral-400 mt-1 font-sans truncate">{stop.address}</div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                        {stop.weightKg}kg
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded ${
                          stop.isHardWindow ? 'bg-amber-500/20 text-amber-300' : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        {stop.timeWindow}
                      </span>
                      {stop.constraints.slice(0, 1).map((c, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Evidence-Backed Justification Manifest */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800 mb-2">
              <div className="flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  Advisory Justification Evidence
                </h3>
              </div>
              <span className="text-[10px] font-mono text-neutral-500">sha256:4a01e9...</span>
            </div>

            <div className="space-y-2 text-xs text-neutral-300 font-sans">
              <div className="bg-neutral-950 p-2.5 rounded border border-neutral-800 leading-relaxed">
                <strong className="text-white font-mono">• Stop 1 Priority Rationale:</strong> Scheduled first to respect the 01:30–01:45 hard SLA window for Apex BioTech despite an initial +0.8km detour.
              </div>
              <div className="bg-neutral-950 p-2.5 rounded border border-neutral-800 leading-relaxed">
                <strong className="text-white font-mono">• Stop 2 Perishable Gate:</strong> Cold-chain battery pack verified. Scheduled within 30 min maximum allowable ambient transit window.
              </div>
              <div className="bg-neutral-950 p-2.5 rounded border border-neutral-800 leading-relaxed">
                <strong className="text-white font-mono">• LIFO Cargo Invariant:</strong> Stop 5 parcel staged in rear hatch for zero-delay curbside retrieval.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
