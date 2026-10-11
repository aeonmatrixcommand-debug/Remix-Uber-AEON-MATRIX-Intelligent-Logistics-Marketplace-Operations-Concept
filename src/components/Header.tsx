import React, { useState } from 'react';
import {
  ShieldAlert,
  Activity,
  Layers,
  Server,
  Lock,
  ChevronDown,
  ChevronUp,
  Cpu,
  Info,
  CheckCircle2,
  Languages,
  DollarSign,
  Star,
  TrendingUp,
  Mail,
  History,
  Users,
  Gauge,
} from 'lucide-react';
import { CITIES_DATA } from '../data/mockData';
import { useLanguage } from '../context/LanguageContext';

interface HeaderProps {
  selectedCityId: string;
  onSelectCity: (cityId: string) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenOnboarding?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedCityId,
  onSelectCity,
  activeTab,
  onSelectTab,
  onOpenOnboarding,
}) => {
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const { language, setLanguage, toggleLanguage, t } = useLanguage();
  const currentCity = CITIES_DATA[selectedCityId] || CITIES_DATA.nyc;

  const navigationTabs = [
    { id: 'marketplace', label: t.tabMarketplace, icon: Activity },
    { id: 'demand_forecast', label: language === 'th' ? 'พยากรณ์คำสั่งซื้อ 24 ชม.' : '24h Demand Forecast', icon: TrendingUp },
    { id: 'performance_monitor', label: t.tabPerformanceMonitor, icon: Gauge },
    { id: 'capacity_planner', label: t.tabCapacityPlanner, icon: Users },
    { id: 'pricing', label: t.tabPricing, icon: DollarSign },
    { id: 'fulfillment', label: t.tabFulfillment, icon: Layers },
    { id: 'feedback', label: t.tabFeedback, icon: Star },
    { id: 'courier_performance', label: t.tabCourierPerformance, icon: TrendingUp },
    { id: 'gmail_alerts', label: t.tabGmailDispatch, icon: Mail },
    { id: 'routing', label: t.tabRouting, icon: Cpu },
    { id: 'governance', label: t.tabGovernance, icon: Lock },
    { id: 'audit_logs', label: t.tabAuditLogs, icon: History },
    { id: 'architecture', label: t.tabArchitecture, icon: Server },
    { id: 'contributions', label: t.tabContributions, icon: CheckCircle2 },
    { id: 'uber_problem', label: t.tabUberProblem, icon: Info },
  ];

  return (
    <header className="border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-md sticky top-0 z-50">
      {/* Top Bar: Operational Disclaimer Notice + Language Switcher */}
      <div className="bg-amber-950/40 border-b border-amber-900/50 px-4 py-2 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-amber-300 font-medium">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>{t.disclaimerTitle}</strong> {t.disclaimerShort}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {onOpenOnboarding && (
              <button
                onClick={onOpenOnboarding}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-mono transition cursor-pointer font-bold"
              >
                <Info className="w-3 h-3 text-cyan-400" />
                {language === 'th' ? 'แนะนำระบบ (Tour)' : 'Showcase Tour'}
              </button>
            )}

            {/* Language Switcher Badge */}
            <div className="flex items-center bg-neutral-900 border border-neutral-700 rounded-lg p-0.5 text-[11px] font-mono">
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${
                  language === 'en'
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('th')}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${
                  language === 'th'
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                ไทย
              </button>
            </div>

            <button
              onClick={() => setShowDisclaimer(!showDisclaimer)}
              className="text-amber-400/80 hover:text-amber-300 flex items-center gap-1 text-[11px] font-mono shrink-0 cursor-pointer"
            >
              {showDisclaimer ? t.toggleDisclaimerHide : t.toggleDisclaimerShow}
              {showDisclaimer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {showDisclaimer && (
          <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-amber-900/30 text-neutral-400 text-[11px] leading-relaxed">
            <p>{t.disclaimerDetails}</p>
          </div>
        )}
      </div>

      {/* Main Brand & Live System Status */}
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-semibold tracking-wider">
                {t.matrixVersion}
              </div>
              <span className="text-neutral-600 font-mono text-xs">×</span>
              <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
                {t.conceptTag}
              </span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {t.systemOnline}
              </div>
            </div>

            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white mt-1">
              {t.mainTitle}
              <span className="font-normal text-neutral-400 text-base md:text-lg block md:inline md:ml-2">
                {t.mainSubtitle}
              </span>
            </h1>

            {/* Core Message Callout */}
            <div className="mt-1.5 text-xs text-neutral-300 font-mono bg-neutral-900/80 px-3 py-1.5 rounded border border-neutral-800 inline-block">
              <span className="text-cyan-400 font-semibold">{t.coreVisionLabel} </span>
              {t.coreVisionText}
            </div>
          </div>

          {/* Controls: Region Selector & Live Cluster Status */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-1 flex items-center gap-1 text-xs">
              <span className="px-2 text-neutral-400 font-mono text-[11px]">{t.regionLabel}</span>
              {Object.keys(CITIES_DATA).map((cityKey) => {
                const city = CITIES_DATA[cityKey];
                const isSelected = selectedCityId === cityKey;
                return (
                  <button
                    key={cityKey}
                    onClick={() => onSelectCity(cityKey)}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
                    }`}
                  >
                    {city.cityName.split(' ')[0]}
                  </button>
                );
              })}
            </div>

            <div className="bg-neutral-900 border border-neutral-800 px-3 py-1 rounded-lg text-right hidden sm:block">
              <div className="text-[10px] text-neutral-500 font-mono">{t.clusterLabel}</div>
              <div className="text-xs text-neutral-200 font-mono font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                {currentCity.cluster}
              </div>
            </div>
          </div>
        </div>

        {/* Target Audience Tags */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-neutral-500 font-mono mr-1">{t.audienceLabel}</span>
          {t.audiences.map((chip, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 text-[10px] font-mono"
            >
              {chip}
            </span>
          ))}
        </div>

        {/* Tab Navigation */}
        <nav className="mt-4 flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar border-t border-neutral-800/80 pt-2">
          {navigationTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-neutral-800 text-cyan-400 border border-cyan-500/30 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-neutral-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
