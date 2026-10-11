import React, { useState } from 'react';
import {
  ShieldAlert,
  Activity,
  DollarSign,
  Layers,
  Cpu,
  Lock,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  X,
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
  const { language, setLanguage } = useLanguage();
  const isThai = language === 'th';
  const [currentStep, setCurrentStep] = useState<number>(1);

  if (!isOpen) return null;

  const coreCapabilities = [
    {
      id: 'marketplace',
      number: '01',
      title: isThai
        ? 'ข้อมูลปฏิบัติการมาร์เก็ตเพลส & ระบบตรวจจับความผิดปกติด้วย AI'
        : 'Marketplace Operations Intelligence & AI Anomaly Detection',
      icon: Activity,
      color: 'text-cyan-400',
      description: isThai
        ? 'ศูนย์ควบคุมเรียลไทม์ตรวจสอบสมดุลอุปสงค์-อุปทานรายโซน ความเร็ว SLA ระบบตรวจจับความผิดปกติทางสถิติ (Z-Score) และแผงคำแนะนำ AI แบบ Advisory-Only'
        : 'Real-time control tower monitoring spatial supply-demand dynamics, zone imbalances, statistical anomaly detection, and advisory AI recommendations.',
    },
    {
      id: 'pricing',
      number: '02',
      title: isThai
        ? 'ระบบกำหนดราคาพลวัตและเซิร์จที่โปร่งใส (Dynamic Pricing)'
        : 'Dynamic Pricing & Surge Control',
      icon: DollarSign,
      color: 'text-emerald-400',
      description: isThai
        ? 'คำนวณค่าจัดส่งตามความหนาแน่นไรเดอร์ ปริมาณออเดอร์รายโซน และเพดานราคาสูงสุด โดยต้องผ่านการตรวจสอบจากผู้ควบคุมก่อนมีผล'
        : 'Transparent delivery fee adjustments based on courier availability deficit, order surge multipliers, and price ceiling caps.',
    },
    {
      id: 'fulfillment',
      number: '03',
      title: isThai
        ? 'การจัดการกระบวนการคำสั่งซื้อ & ติดตามพิกัด GPS บน Google Maps'
        : 'Event-Driven Fulfillment & Live GPS Courier Tracking',
      icon: Layers,
      color: 'text-amber-400',
      description: isThai
        ? 'จำลองสถานะ FSM ตั้งแต่รับออเดอร์ จัดเตรียมสินค้า มอบหมายไรเดอร์ และติดตามตำแหน่งไรเดอร์แบบเรียลไทม์บนแผนที่ Google Maps'
        : 'FSM state transitions from order creation through pick/pack, courier assignment, and real-time GPS tracking on Google Maps.',
    },
    {
      id: 'routing',
      number: '04',
      title: isThai
        ? 'การเพิ่มประสิทธิภาพเส้นทางและจัดวางสัมภาระ 3 มิติ'
        : 'Route & Logistics Optimization',
      icon: Cpu,
      color: 'text-purple-400',
      description: isThai
        ? 'อัลกอริทึมคำนวณเส้นทางหลายจุดแวะพัก การจัดเรียงพัสดุตามปริมาตร/น้ำหนัก และการป้องกันความเสี่ยงผิดสัญญา SLA'
        : '3D volumetric cargo packing algorithms, vehicle route optimization, and SLA breach probability mitigation.',
    },
    {
      id: 'governance',
      number: '05',
      title: isThai
        ? 'การกำกับดูแล AI แบบ Fail-Closed & สมุดบันทึก AuditLogs ถาวร'
        : 'Fail-Closed AI Governance (AEON Guardian) & Immutable AuditLogs',
      icon: Lock,
      color: 'text-red-400',
      description: isThai
        ? 'บังคับใช้นโยบายความปลอดภัยสูงสุด ข้อเสนอแนะจาก AI ต้องได้รับการอนุมัติจากมนุษย์เสมอ พร้อมบันทึกใน AuditLogs แบบอ่านอย่างเดียว (Read-Only)'
        : 'Strict policy enforcement ensuring AI recommendations remain 100% advisory and require human approver sign-off with persistent read-only AuditLogs.',
    },
  ];

  const targetAudiences = isThai
    ? [
        'ผู้สรรหาและผู้จัดการฝ่ายวิศวกรรม (Engineering Recruiters & Managers)',
        'สถาปนิกโซลูชันระดับองค์กร (Enterprise Solution Architects)',
        'ทีมผลิตภัณฑ์โลจิสติกส์และการจัดส่ง (Logistics & Delivery Product Teams)',
        'หัวหน้าฝ่ายวิศวกรรมแพลตฟอร์มและมาร์เก็ตเพลส (Platform Engineering Leads)',
      ]
    : [
        'Uber Engineering Recruiters & Hiring Managers',
        'Enterprise Solution Architects',
        'Logistics & Delivery Product Teams',
        'Platform & Marketplace Engineering Leads',
      ];

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative my-auto animate-scaleUp">
        {/* Top Controls: Language Switcher + Close Button */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold">
              {isThai
                ? `แนะนำระบบ • ขั้นตอนที่ ${currentStep} จาก 3`
                : `SHOWCASE WALKTHROUGH • STEP ${currentStep} OF 3`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-neutral-950 border border-neutral-700 rounded-lg p-0.5 text-[11px] font-mono">
              <button
                onClick={() => setLanguage('th')}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${
                  isThai
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                ไทย
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${
                  !isThai
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                EN
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* STEP 1: Vision & Purpose */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 mb-1 font-mono text-xs font-semibold">
                <Sparkles className="w-4 h-4" />
                {isThai
                  ? 'ผลงานการออกแบบวิศวกรรมระบบ (SYSTEMS ENGINEERING PORTFOLIO)'
                  : 'SYSTEMS ENGINEERING PORTFOLIO SHOWCASE'}
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {isThai
                  ? 'Uber × AEON MATRIX (อีออน แมทริกซ์) — แนวคิดระบบปฏิบัติการอัจฉริยะ'
                  : 'Uber × AEON MATRIX Operational Concept'}
              </h2>
              <p className="text-xs text-neutral-300 leading-relaxed mt-2">
                {isThai
                  ? 'แนวคิดวิศวกรรมระบบอิสระที่สาธิตการควบคุมปฏิบัติการมาร์เก็ตเพลสแบบเรียลไทม์ การจัดการกระบวนการจัดส่งที่ขับเคลื่อนด้วยเหตุการณ์ (Event-Driven) ระบบเอไอเพื่อให้คำแนะนำเท่านั้น (Advisory-Only AI) และการกำกับดูแลความปลอดภัยแบบ Fail-Closed'
                  : 'An independent systems-engineering concept demonstrating real-time marketplace operations, event-driven fulfillment orchestration, advisory-only agentic AI, and fail-closed operational governance.'}
              </p>
            </div>

            {/* Core Architectural Vision Callout */}
            <div className="p-4 bg-neutral-950 border border-cyan-500/30 rounded-xl space-y-1">
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase block">
                {isThai ? 'วิสัยทัศน์สถาปัตยกรรมหลัก:' : 'Core Architectural Vision:'}
              </span>
              <p className="text-sm font-medium text-neutral-200 italic leading-snug">
                {isThai
                  ? '“ดิฉันออกแบบระบบปฏิบัติการที่ขับเคลื่อนด้วย AI ซึ่งเชื่อมโยงความต้องการทางธุรกิจ การปฏิบัติการโลจิสติกส์ บริการแบ็กเอนด์แบบกระจายศูนย์ การกำกับดูแล หลักฐานเชิงประจักษ์ และการตัดสินใจของมนุษย์เข้าด้วยกัน”'
                  : '“I design AI-enabled operational systems that connect business requirements, logistics execution, distributed backend services, governance, evidence, and human decision-making.”'}
              </p>
            </div>

            {/* Boundary Notice */}
            <div className="p-3 bg-amber-950/40 border border-amber-900/50 rounded-lg text-xs text-amber-300/90 leading-relaxed flex items-start gap-2 font-mono">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                {isThai ? (
                  <>
                    <strong>ข้อสงวนสิทธิ์ขอบเขตงาน:</strong> จัดทำขึ้นเพื่อแสดงแนวคิดทางวิศวกรรมอิสระเท่านั้น ไม่ได้เกี่ยวข้องหรือเป็นตัวแทนของ Uber Technologies, Inc. และไม่มีการใช้ข้อมูลภายในของบริษัท
                  </>
                ) : (
                  <>
                    <strong>Operational Boundary Notice:</strong> Independent concept showcase only. Not affiliated with or endorsed by Uber Technologies, Inc. No proprietary Uber data is used.
                  </>
                )}
              </span>
            </div>

            <div className="pt-4 border-t border-neutral-800 flex justify-end">
              <button
                onClick={() => setCurrentStep(2)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold transition cursor-pointer shadow-lg shadow-cyan-600/30"
              >
                <span>
                  {isThai ? 'ดู 5 ขีดความสามารถหลักของระบบ' : 'Explore 5 Core Capabilities'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Core Capabilities */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                {isThai
                  ? '5 ขีดความสามารถหลักที่จัดแสดงในระบบนี้'
                  : '5 Core Capabilities Being Demonstrated'}
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                {isThai
                  ? 'ออกแบบเพื่อรองรับระบบกระจายศูนย์ขนาดใหญ่และมาร์เก็ตเพลสความเร็วสูง'
                  : 'Designed to address real-world distributed systems and marketplace challenges.'}
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
                className="text-xs font-mono text-neutral-400 hover:text-white cursor-pointer"
              >
                {isThai ? '← ย้อนกลับ' : '← Back'}
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold transition cursor-pointer shadow-lg shadow-cyan-600/30"
              >
                <span>{isThai ? 'กลุ่มเป้าหมายและเริ่มต้นใช้งาน' : 'View Target Audiences'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Target Audiences & Launch */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                {isThai ? 'ออกแบบสำหรับกลุ่มเป้าหมายหลัก' : 'Designed for Key Stakeholders'}
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                {isThai
                  ? 'แสดงทักษะวิศวกรรมซอฟต์แวร์แบบครบวงจร การออกแบบสถาปัตยกรรมระบบ และการกำกับดูแล AI'
                  : 'Demonstrating full-stack engineering proficiency, systems design, and AI safety governance.'}
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
              <div className="text-cyan-400 font-bold">
                {isThai ? 'พร้อมเข้าสู่ศูนย์ควบคุมปฏิบัติการแล้ว!' : 'Ready to Explore?'}
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                {isThai
                  ? 'ใช้แถบเมนูด้านบนเพื่อสลับดูแต่ละโมดูล ทดลองปรับตัวแปรจำลองสถานการณ์ ตรวจสอบการแจ้งเตือนความผิดปกติ ดูพิกัด GPS ของไรเดอร์ และตรวจสอบสมุดบันทึก AuditLogs แบบอ่านอย่างเดียว'
                  : 'Use the top navigation bar to jump between live capability modules, simulate demand surges, monitor real-time courier GPS tracking, and inspect fail-closed AI audit records.'}
              </p>
            </div>

            <div className="pt-4 border-t border-neutral-800 flex items-center justify-between">
              <button
                onClick={() => setCurrentStep(2)}
                className="text-xs font-mono text-neutral-400 hover:text-white cursor-pointer"
              >
                {isThai ? '← ย้อนกลับ' : '← Back'}
              </button>
              <button
                onClick={() => {
                  onClose();
                  onSelectTab('marketplace');
                }}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-mono font-bold transition cursor-pointer shadow-xl shadow-cyan-500/20"
              >
                <span>
                  {isThai
                    ? 'เข้าสู่ศูนย์ควบคุมปฏิบัติการ (Enter Workspace)'
                    : 'Enter Mission Control Workspace'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
