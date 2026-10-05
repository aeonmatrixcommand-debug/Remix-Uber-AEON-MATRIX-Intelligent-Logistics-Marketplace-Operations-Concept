import React, { useState } from 'react';
import { Header } from './components/Header';
import { MarketplaceIntelligence } from './components/MarketplaceIntelligence';
import { DynamicPricingModule } from './components/DynamicPricingModule';
import { FulfillmentOrchestration } from './components/FulfillmentOrchestration';
import { CustomerFeedbackModule } from './components/CustomerFeedbackModule';
import { CourierPerformanceDashboard } from './components/CourierPerformanceDashboard';
import { GmailAlertHub } from './components/GmailAlertHub';
import { RouteOptimization } from './components/RouteOptimization';
import { AeonGuardian } from './components/AeonGuardian';
import { EnterpriseArchitecture } from './components/EnterpriseArchitecture';
import { WhatICanContribute } from './components/WhatICanContribute';
import { UberProblemExploration } from './components/UberProblemExploration';
import { AiScenarioStudio } from './components/AiScenarioStudio';
import { OnboardingModal } from './components/OnboardingModal';
import { Footer } from './components/Footer';
import { CITIES_DATA } from './data/mockData';

export default function App() {
  const [selectedCityId, setSelectedCityId] = useState<string>('nyc');
  const [activeTab, setActiveTab] = useState<string>('marketplace');
  const [feedbackOrderId, setFeedbackOrderId] = useState<string>('ORD-98214');
  const [feedbackCourierId, setFeedbackCourierId] = useState<string>('CR-8841');
  const [gmailAlertMode, setGmailAlertMode] = useState<'summary' | 'shift' | 'incident'>('summary');
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(true);

  const currentCity = CITIES_DATA[selectedCityId] || CITIES_DATA.nyc;

  const handleNavigateToGovernance = (advisoryData?: any) => {
    setActiveTab('governance');
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const handleNavigateToGmailAlerts = (mode: 'summary' | 'shift' | 'incident' = 'summary') => {
    setGmailAlertMode(mode);
    setActiveTab('gmail_alerts');
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const handleNavigateToFeedback = (orderId: string, courierId: string) => {
    setFeedbackOrderId(orderId);
    setFeedbackCourierId(courierId);
    setActiveTab('feedback');
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Header & Sticky Mission Navigation */}
      <Header
        selectedCityId={selectedCityId}
        onSelectCity={setSelectedCityId}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
      />

      {/* Onboarding Guide Walkthrough Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onSelectTab={(tabId) => {
          setActiveTab(tabId);
          setIsOnboardingOpen(false);
        }}
      />

      {/* Main Mission Control Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 space-y-8">
        {/* Render Tab Content */}
        {activeTab === 'marketplace' && (
          <div className="space-y-8 animate-fadeIn">
            <MarketplaceIntelligence
              city={currentCity}
              onNavigateToGovernance={handleNavigateToGovernance}
            />
            {/* Live AI Scenario Studio */}
            <AiScenarioStudio />
          </div>
        )}

        {activeTab === 'pricing' && (
          <div className="space-y-8 animate-fadeIn">
            <DynamicPricingModule city={currentCity} />
          </div>
        )}

        {activeTab === 'fulfillment' && (
          <div className="space-y-8 animate-fadeIn">
            <FulfillmentOrchestration onNavigateToFeedback={handleNavigateToFeedback} />
          </div>
        )}

        {activeTab === 'feedback' && (
          <div className="space-y-8 animate-fadeIn">
            <CustomerFeedbackModule
              initialOrderId={feedbackOrderId}
              initialCourierId={feedbackCourierId}
            />
          </div>
        )}

        {activeTab === 'courier_performance' && (
          <div className="space-y-8 animate-fadeIn">
            <CourierPerformanceDashboard
              city={currentCity}
              onNavigateToGmailAlerts={handleNavigateToGmailAlerts}
            />
          </div>
        )}

        {activeTab === 'gmail_alerts' && (
          <div className="space-y-8 animate-fadeIn">
            <GmailAlertHub
              city={currentCity}
              initialMode={gmailAlertMode}
            />
          </div>
        )}

        {activeTab === 'routing' && (
          <div className="space-y-8 animate-fadeIn">
            <RouteOptimization />
          </div>
        )}

        {activeTab === 'governance' && (
          <div className="space-y-8 animate-fadeIn">
            <AeonGuardian />
          </div>
        )}

        {activeTab === 'architecture' && (
          <div className="space-y-8 animate-fadeIn">
            <EnterpriseArchitecture />
          </div>
        )}

        {activeTab === 'contributions' && (
          <div className="space-y-8 animate-fadeIn">
            <WhatICanContribute />
          </div>
        )}

        {activeTab === 'uber_problem' && (
          <div className="space-y-8 animate-fadeIn">
            <UberProblemExploration />
          </div>
        )}
      </main>

      {/* Footer Attributions */}
      <Footer />
    </div>
  );
}
