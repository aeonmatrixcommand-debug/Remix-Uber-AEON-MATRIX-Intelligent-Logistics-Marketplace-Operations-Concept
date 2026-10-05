import React, { useState } from 'react';
import {
  ShieldAlert,
  Activity,
  DollarSign,
  Layers,
  Cpu,
  Lock,
  Server,
  ArrowRight,
  CheckCircle2,
  Users,
  Sparkles,
  X,
  Info,
  ExternalLink,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tabId: string) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onSelectTab,
}) => {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState<number>(1);

  if (!isOpen) return null;

  const coreCapabilities = [
    {
      id: 'marketplace',
      number: '01',
      title: 'Marketplace Operations Intelligence',
      icon: Activity,
      color: 'text-cyan-400',
      description:
        'Real-time control tower monitoring spatial supply-demand dynamics, zone imbalances, SLA velocity, and advisory AI recommendations.',
    },
    {
      id: 'pricing',
      number: '02',
      title: 'Dynamic Pricing & Surge Control',
      icon: DollarSign,
      color: 'text-emerald-400',
      description:
        'Transparent delivery fee adjustments based on courier availability deficit, order surge multipliers, and price ceiling caps.',
    },
    {
      id: 'fulfillment',
      number: '03',
      title: 'Event-Driven Fulfillment Orchestration',
      icon: Layers,
      color: 'text-amber-400',
      description:
        'FSM state transitions from order creation through pick/pack, courier assignment, and real-time GPS tracking on Google Maps.',
    },
    {
      id: 'routing',
      number: '04',
      title: 'Route & Logistics Optimization',
      icon: Cpu,
      color: 'text-purple-400',
      description:
        '3D volumetric cargo packing algorithms, vehicle route optimization, and SLA breach probability mitigation.',
    },
    {
      id: 'governance',
      number: '05',
      title: 'Fail-Closed AI Governance (AEON Guardian)',
      icon: Lock,
      color: 'text-red-400',
      description:
        'Strict policy enforcement ensuring AI recommendations remain 100% advisory and require human approver sign-off with audit evidence hashes.',
    },
  ];

  const targetAudiences = [
    'Uber Engineering Recruiters & Hiring Managers',
    'Enterprise Solution Architects',
    'Logistics & Delivery Product Teams',
    'Platform & Marketplace Engineering Leads',
  ];

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative my-auto animate-scaleUp">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-6">
          <span className="px-2.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold">
            SHOWCASE WALKTHROUGH • STEP {currentStep} OF 3
          </span>
          <div className="flex items-center gap-1 ml-auto">
            {[1, 2, 3].map((step) => (
              <span
                key={step}
                className={`w-2.5 h-2.5 rounded-full transition ${
                  step === currentStep ? 'bg-cyan-400 w-6' : 'bg-neutral-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* STEP 1: Vision & Purpose */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 mb-1 font-mono text-xs font-semibold">
                <Sparkles className="w-4 h-4" />
                SYSTEMS ENGINEERING PORTFOLIO SHOWCASE
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Uber × AEON MATRIX Operational Concept
              </h2>
              <p className="text-xs text-neutral-300 leading-relaxed mt-2">
                An independent systems-engineering concept demonstrating real-time marketplace operations, event-driven fulfillment orchestration, advisory-only agentic AI, and fail-closed operational governance.
              </p>
            </div>

            {/* Core Architectural Vision Callout */}
            <div className="p-4 bg-neutral-950 border border-cyan-500/30 rounded-xl space-y-1">
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase block">
                Core Architectural Vision:
              </span>
              <p className="text-sm font-medium text-neutral-200 italic leading-snug">
                “I design AI-enabled operational systems that connect business requirements, logistics execution, distributed backend services, governance, evidence, and human decision-making.”
              </p>
            </div>

            {/* Boundary Notice */}
            <div className="p-3 bg-amber-950/40 border border-amber-900/50 rounded-lg text-xs text-amber-300/90 leading-relaxed flex items-start gap-2 font-mono">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Operational Boundary Notice:</strong> Independent concept showcase only. Not affiliated with or endorsed by Uber Technologies, Inc. No proprietary Uber data is used.
              </span>
            </div>

            <div className="pt-4 border-t border-neutral-800 flex justify-end">
              <button
                onClick={() => setCurrentStep(2)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold transition cursor-pointer shadow-lg shadow-cyan-600/30"
              >
                Explore Target Audience & Capabilities <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Target Audience & Core Capabilities */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                5 Core Capabilities Being Demonstrated
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Designed to address real-world distributed systems and marketplace challenges.
              </p>
            </div>

            {/* Capability Grid */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {coreCapabilities.map((cap) => {
                const Icon = cap.icon;
                return (
                  <div
                    key={cap.id}
                    className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl flex items-start gap-3 hover:border-neutral-700 transition"
                  >
                    <div className={`p-2 rounded-lg bg-neutral-900 shrink-0 ${cap.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-neutral-500 font-bold">
                          {cap.number}
                        </span>
                        <h4 className="text-xs font-bold text-white">{cap.title}</h4>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                        {cap.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
              <button
                onClick={() => setCurrentStep(1)}
                className="text-xs font-mono text-neutral-400 hover:text-white"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold transition cursor-pointer shadow-lg shadow-cyan-600/30"
              >
                View Target Audiences <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Target Audiences & Launch */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Designed for Key Stakeholders
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Demonstrating full-stack engineering proficiency, systems design, and AI safety governance.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {targetAudiences.map((aud, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl flex items-center gap-2.5 text-xs text-neutral-200 font-medium"
                >
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>{aud}</span>
                </div>
              ))}
            </div>

            <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-300 font-mono space-y-1.5">
              <div className="text-cyan-400 font-bold">Ready to Explore?</div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Use the top navigation bar to jump between live capability modules, simulate demand surges, monitor real-time courier GPS tracking, and inspect fail-closed AI audit records.
              </p>
            </div>

            <div className="pt-4 border-t border-neutral-800 flex items-center justify-between">
              <button
                onClick={() => setCurrentStep(2)}
                className="text-xs font-mono text-neutral-400 hover:text-white"
              >
                Back
              </button>
              <button
                onClick={() => {
                  onClose();
                  onSelectTab('marketplace');
                }}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-mono font-bold transition cursor-pointer shadow-xl shadow-cyan-500/20"
              >
                Enter Mission Control Workspace <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
