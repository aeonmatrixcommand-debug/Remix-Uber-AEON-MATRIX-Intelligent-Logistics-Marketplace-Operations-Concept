import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Clock,
  Shield,
  Layers,
  Sparkles,
  RefreshCw,
  Eye,
  CheckCircle2,
  Sliders,
  Flame,
} from 'lucide-react';
import { CityMarketplace, SubMarketZone } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { MarketplaceSummarySparklines } from './MarketplaceSummarySparklines';

interface MarketplaceIntelligenceProps {
  city: CityMarketplace;
  onNavigateToGovernance: (advisoryData?: any) => void;
}

export const MarketplaceIntelligence: React.FC<MarketplaceIntelligenceProps> = ({
  city,
  onNavigateToGovernance,
}) => {
  const { language, t } = useLanguage();

  // Interactive simulation state
  const [demandSurgeFactor, setDemandSurgeFactor] = useState<number>(0);
  const [courierDropFactor, setCourierDropFactor] = useState<number>(0);
  const [selectedZoneId, setSelectedZoneId] = useState<string>(city.zones[3]?.id || city.zones[0]?.id);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Compute live simulated metrics based on sliders
  const activeOrdersSim = Math.round(city.activeOrders * (1 + demandSurgeFactor / 100));
  const availableCouriersSim = Math.max(100, Math.round(city.availableCouriers * (1 - courierDropFactor / 100)));
  const unmatchedBacklogSim = Math.round(city.unmatchedBacklog * (1 + (demandSurgeFactor * 1.5 + courierDropFactor * 2) / 100));
  const avgSlaMinutesSim = +(city.avgSlaMinutes * (1 + (demandSurgeFactor * 0.4 + courierDropFactor * 0.6) / 100)).toFixed(1);
  const cancellationRiskSim = +(city.cancellationRiskPct * (1 + (demandSurgeFactor * 0.8 + courierDropFactor * 1.2) / 100)).toFixed(1);
  const healthScoreSim = Math.max(
    42,
    Math.min(99, Math.round(city.healthScore - demandSurgeFactor * 0.35 - courierDropFactor * 0.45))
  );

  const zonesSim: SubMarketZone[] = city.zones.map((z) => {
    const isTargetZone = z.id === selectedZoneId;
    const zoneDemandMultiplier = isTargetZone ? 1 + (demandSurgeFactor * 1.3) / 100 : 1 + demandSurgeFactor / 100;
    const zoneSupplyMultiplier = isTargetZone ? 1 - (courierDropFactor * 1.4) / 100 : 1 - courierDropFactor / 100;

    const newDemand = Math.round(z.demandReqMin * zoneDemandMultiplier);
    const newSupply = Math.max(50, Math.round(z.availableCouriers * zoneSupplyMultiplier));
    const newImbalance = +(((newSupply - newDemand) / newDemand) * 100).toFixed(1);
    const newSla = +(z.medianSlaMinutes * (1 + (demandSurgeFactor * 0.3 + courierDropFactor * 0.5) / 100)).toFixed(1);
    const newCancel = +(z.cancellationRiskPct * (1 + (demandSurgeFactor * 0.6 + courierDropFactor * 0.8) / 100)).toFixed(1);

    let status: SubMarketZone['status'] = 'STABLE';
    if (newImbalance < -25 || newCancel > 4.5) status = 'CRITICAL';
    else if (newImbalance < -12 || newCancel > 2.5) status = 'DEGRADED';

    return {
      ...z,
      demandReqMin: newDemand,
      availableCouriers: newSupply,
      imbalancePct: newImbalance,
      medianSlaMinutes: newSla,
      cancellationRiskPct: newCancel,
      status,
    };
  });

  const selectedZone = zonesSim.find((z) => z.id === selectedZoneId) || zonesSim[0];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 400);
  };

  const handleResetSim = () => {
    setDemandSurgeFactor(0);
    setCourierDropFactor(0);
  };

  const diagFormatted = t.diagText
    .replace('{zone}', selectedZone.id)
    .replace('{imbalance}', `${Math.abs(selectedZone.imbalancePct)}`);

  return (
    <div className="space-y-6">
      {/* Section Header & Subtitle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-900/60 p-4 rounded-xl border border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-mono text-xs font-semibold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30">
              {t.cap1Badge}
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">{t.cap1Title}</h2>
          </div>
          <p className="text-xs text-neutral-400 mt-1 max-w-3xl leading-relaxed">
            {t.cap1Desc}
          </p>
        </div>

        {/* Simulation Sandbox Trigger */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-mono text-neutral-300 border border-neutral-700 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>{t.pollTelemetry}</span>
          </button>
          <button
            onClick={() => setDemandSurgeFactor(38)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-xs font-mono text-cyan-300 border border-cyan-500/40 transition cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t.injectSurge}</span>
          </button>
        </div>
      </div>

      {/* Interactive Simulation Sliders */}
      {(demandSurgeFactor !== 0 || courierDropFactor !== 0) && (
        <div className="bg-cyan-950/30 border border-cyan-900/60 rounded-xl p-3 text-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-cyan-300">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold">{t.simActiveTitle}</span>
            <span>
              {t.simActiveDesc
                .replace('{surge}', `${demandSurgeFactor}`)
                .replace('{drop}', `${courierDropFactor}`)}
            </span>
          </div>
          <button
            onClick={handleResetSim}
            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded font-mono text-[11px] cursor-pointer"
          >
            {t.resetBaselines}
          </button>
        </div>
      )}

      {/* Rolling D3 Mini-Sparkline Telemetry */}
      <MarketplaceSummarySparklines
        surgeFactor={demandSurgeFactor}
        courierDrop={courierDropFactor}
      />

      {/* Top 8 Real-Time Operational KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {/* Active Orders */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-neutral-400 uppercase">{t.kpiActiveOrders}</div>
          <div className="text-lg font-bold font-mono text-white mt-1">{activeOrdersSim.toLocaleString()}</div>
          <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono mt-1">
            <TrendingUp className="w-3 h-3" />
            <span>+{demandSurgeFactor}%</span>
          </div>
        </div>

        {/* Available Couriers */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-neutral-400 uppercase">{t.kpiAvailCouriers}</div>
          <div className="text-lg font-bold font-mono text-cyan-400 mt-1">{availableCouriersSim.toLocaleString()}</div>
          <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-mono mt-1">
            <span>Fleet: 0.72</span>
          </div>
        </div>

        {/* Supply-Demand Imbalance */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-neutral-400 uppercase">{t.kpiImbalance}</div>
          <div className="text-lg font-bold font-mono text-rose-400 mt-1">
            {selectedZone.imbalancePct}%
          </div>
          <div className="flex items-center gap-1 text-[10px] text-rose-400 font-mono mt-1">
            <TrendingDown className="w-3 h-3" />
            <span>{selectedZone.id}</span>
          </div>
        </div>

        {/* Estimated Delivery SLA */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-neutral-400 uppercase">{t.kpiDeliverySla}</div>
          <div className="text-lg font-bold font-mono text-amber-300 mt-1">{avgSlaMinutesSim}m</div>
          <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-mono mt-1">
            <Clock className="w-3 h-3 text-neutral-500" />
            <span>Target: 25m</span>
          </div>
        </div>

        {/* Unmatched Order Backlog */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-neutral-400 uppercase">{t.kpiBacklog}</div>
          <div className="text-lg font-bold font-mono text-white mt-1">{unmatchedBacklogSim}</div>
          <div className="text-[10px] text-amber-400 font-mono mt-1">Latency: 4.2m</div>
        </div>

        {/* Cancellation Risk */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-neutral-400 uppercase">{t.kpiCancelRisk}</div>
          <div className="text-lg font-bold font-mono text-rose-300 mt-1">{cancellationRiskSim}%</div>
          <div className="text-[10px] text-neutral-400 font-mono mt-1">&lt; 3.0%</div>
        </div>

        {/* Operational Incidents */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-neutral-400 uppercase">{t.kpiIncidents}</div>
          <div className="text-lg font-bold font-mono text-white mt-1">
            <span className="text-amber-400">{city.incidents.p2} P2</span>
            <span className="text-neutral-500 mx-1">/</span>
            <span className="text-emerald-400">{city.incidents.p1} P1</span>
          </div>
          <div className="text-[10px] text-neutral-400 font-mono mt-1">Zero P1</div>
        </div>

        {/* Marketplace Health Score */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-neutral-400 uppercase">{t.kpiHealthScore}</div>
          <div className="text-lg font-bold font-mono text-emerald-400 mt-1">{healthScoreSim} / 100</div>
          <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden mt-1.5">
            <div
              className={`h-full transition-all duration-500 ${
                healthScoreSim > 80 ? 'bg-emerald-500' : healthScoreSim > 65 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${healthScoreSim}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Zone Telemetry Matrix vs AI Advisory Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Sub-Market Zone Telemetry Matrix (7 Cols) */}
        <div className="lg:col-span-7 bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                {t.matrixTitle}
              </h3>
            </div>
            <span className="text-[11px] font-mono text-neutral-400">
              Cluster: <strong className="text-neutral-200">{city.cluster}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400 text-[11px]">
                  <th className="pb-2">{t.colZone}</th>
                  <th className="pb-2 text-right">{t.colDemand}</th>
                  <th className="pb-2 text-right">{t.colSupply}</th>
                  <th className="pb-2 text-right">{t.colImbalance}</th>
                  <th className="pb-2 text-right">{t.colMedianSla}</th>
                  <th className="pb-2 text-right">{t.colCancelRisk}</th>
                  <th className="pb-2 text-center">{t.colStatus}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {zonesSim.map((zone) => {
                  const isSelected = zone.id === selectedZoneId;
                  return (
                    <tr
                      key={zone.id}
                      onClick={() => setSelectedZoneId(zone.id)}
                      className={`hover:bg-neutral-800/50 cursor-pointer transition ${
                        isSelected ? 'bg-neutral-800/70 text-white' : 'text-neutral-300'
                      }`}
                    >
                      <td className="py-2.5 font-semibold flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            zone.status === 'STABLE'
                              ? 'bg-emerald-400'
                              : zone.status === 'DEGRADED'
                              ? 'bg-amber-400'
                              : 'bg-rose-500 animate-ping'
                          }`}
                        />
                        <div>
                          <div>{zone.id}</div>
                          <div className="text-[10px] text-neutral-500 font-sans">{zone.name}</div>
                        </div>
                      </td>
                      <td className="py-2.5 text-right">{zone.demandReqMin}</td>
                      <td className="py-2.5 text-right text-cyan-400">{zone.availableCouriers}</td>
                      <td
                        className={`py-2.5 text-right font-semibold ${
                          zone.imbalancePct < -20
                            ? 'text-rose-400'
                            : zone.imbalancePct < 0
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {zone.imbalancePct > 0 ? `+${zone.imbalancePct}%` : `${zone.imbalancePct}%`}
                      </td>
                      <td className="py-2.5 text-right">{zone.medianSlaMinutes}m</td>
                      <td className="py-2.5 text-right">{zone.cancellationRiskPct}%</td>
                      <td className="py-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            zone.status === 'STABLE'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : zone.status === 'DEGRADED'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {zone.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Spatial Heatmap Representation */}
          <div className="mt-4 pt-4 border-t border-neutral-800">
            <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mb-2">
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-neutral-500" />
                <span>{t.spatialGridTitle}</span>
              </span>
              <span>40.7128° N, 74.0060° W</span>
            </div>

            <div className="relative h-44 bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden p-2">
              <div
                className="absolute inset-0 opacity-15"
                style={{
                  backgroundImage:
                    'linear-gradient(#404040 1px, transparent 1px), linear-gradient(90deg, #404040 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              />

              {zonesSim.map((zone) => {
                const isSelected = zone.id === selectedZoneId;
                return (
                  <div
                    key={zone.id}
                    onClick={() => setSelectedZoneId(zone.id)}
                    className="absolute cursor-pointer transition-all duration-300 transform -translate-x-1/2 -translate-y-1/2 group"
                    style={{ left: `${zone.coordinates.x}%`, top: `${zone.coordinates.y}%` }}
                  >
                    <div
                      className={`relative flex items-center justify-center rounded-xl p-2.5 border transition ${
                        isSelected
                          ? 'bg-neutral-900 border-cyan-400 shadow-lg shadow-cyan-500/20 scale-110 ring-2 ring-cyan-500/40'
                          : 'bg-neutral-900/80 border-neutral-700 hover:border-neutral-500'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-[11px] font-mono font-bold text-white flex items-center gap-1 justify-center">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              zone.status === 'STABLE'
                                ? 'bg-emerald-400'
                                : zone.status === 'DEGRADED'
                                ? 'bg-amber-400'
                                : 'bg-rose-500 animate-ping'
                            }`}
                          />
                          {zone.id}
                        </div>
                        <div className="text-[9px] font-mono text-neutral-400">
                          {zone.demandReqMin} req/m | {zone.availableCouriers} drv
                        </div>
                        <div
                          className={`text-[9px] font-mono font-bold ${
                            zone.imbalancePct < 0 ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {zone.imbalancePct}%
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: AI Advisory Panel (5 Cols) */}
        <div className="lg:col-span-5 bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            {/* Header with Fail-Closed Lock Badge */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  {t.aiAdvisoryTitle}
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10px] font-semibold flex items-center gap-1">
                <Shield className="w-3 h-3" />
                {t.advisoryOnlyBadge}
              </span>
            </div>

            {/* Advisory Meta & Status */}
            <div className="mt-3 bg-neutral-950 p-3 rounded-lg border border-neutral-800/80 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between text-neutral-400 text-[11px]">
                <span>{t.advisoryIdLabel} ADV-20260925-0884</span>
                <span className="text-neutral-500">01:15:31 UTC</span>
              </div>
              <div className="text-neutral-300">
                <span className="text-neutral-500">{t.targetPartitionLabel} </span>
                <strong className="text-cyan-400">{selectedZone.id} ({selectedZone.name})</strong>
              </div>
              <div>
                <span className="text-neutral-500">{t.severityLevelLabel} </span>
                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[10px]">
                  {selectedZone.status === 'CRITICAL' ? 'HIGH (Degradation Risk)' : 'MEDIUM (Observation)'}
                </span>
              </div>
            </div>

            {/* Diagnosis Section */}
            <div className="mt-3">
              <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-1">
                {t.diagHeader}
              </div>
              <div className="bg-neutral-950/60 p-3 rounded-lg border border-neutral-800 text-xs text-neutral-200 leading-relaxed font-sans">
                {diagFormatted}
              </div>
            </div>

            {/* Evidence Attestation */}
            <div className="mt-3">
              <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-1">
                {t.evidenceHeader}
              </div>
              <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800 font-mono text-[11px] text-neutral-300 space-y-1">
                <div className="flex justify-between">
                  <span className="text-neutral-500">{t.inflowDemand}</span>
                  <span className="text-neutral-200">{selectedZone.demandReqMin} req/m (+38.2%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">{t.courierPool}</span>
                  <span className="text-cyan-400">{selectedZone.availableCouriers} online</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">{t.merchantBottleneck}</span>
                  <span className="text-amber-400">Cluster M-4 (+7.6m dwell)</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-neutral-800/80 text-[10px]">
                  <span className="text-neutral-500">{t.hashLabel}</span>
                  <span className="text-cyan-400/80 truncate max-w-[200px]">
                    sha256:d8f7e2a4b89e...01c
                  </span>
                </div>
              </div>
            </div>

            {/* Recommended Non-Automated Actions */}
            <div className="mt-3">
              <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-1">
                {t.actionsHeader}
              </div>
              <ul className="space-y-1.5 text-xs text-neutral-300">
                <li className="flex items-start gap-2 bg-neutral-950/40 p-2 rounded border border-neutral-800">
                  <span className="text-cyan-400 font-mono font-bold text-xs mt-0.5">1.</span>
                  <div>
                    <strong className="text-white">{t.action1Title}</strong> {t.action1Desc}
                  </div>
                </li>
                <li className="flex items-start gap-2 bg-neutral-950/40 p-2 rounded border border-neutral-800">
                  <span className="text-cyan-400 font-mono font-bold text-xs mt-0.5">2.</span>
                  <div>
                    <strong className="text-white">{t.action2Title}</strong> {t.action2Desc}
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Invariant & Governance Handoff Button */}
          <div className="mt-4 pt-3 border-t border-neutral-800 space-y-2">
            <div className="text-[11px] font-mono text-amber-400/90 flex items-center gap-1.5 bg-amber-950/30 p-2 rounded border border-amber-900/50">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span>{t.failClosedInvariant}</span>
            </div>

            <button
              onClick={() =>
                onNavigateToGovernance({
                  zone: selectedZone.id,
                  imbalance: selectedZone.imbalancePct,
                  demand: selectedZone.demandReqMin,
                  couriers: selectedZone.availableCouriers,
                })
              }
              className="w-full py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-mono font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-cyan-600/20 cursor-pointer"
            >
              <span>{t.submitToGuardian}</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
