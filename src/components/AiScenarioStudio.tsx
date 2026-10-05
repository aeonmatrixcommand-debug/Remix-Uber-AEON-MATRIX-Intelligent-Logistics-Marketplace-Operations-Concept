import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  Loader2,
  FileCheck,
  ShieldAlert,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { PRESET_DISRUPTIONS } from '../data/mockData';
import { useLanguage } from '../context/LanguageContext';

export const AiScenarioStudio: React.FC = () => {
  const { language, t } = useLanguage();

  // Thai presets dictionary
  const thaiPresets = [
    {
      id: 'disrupt_weather',
      title: 'ฝนตกหนักฉับพลันในโซน 04',
      zone: 'ZONE-04',
      description: 'พายุฝนฟ้าคะนองรุนแรงในพื้นที่ Midtown South ส่งผลให้ความเร็วของไรเดอร์สองล้อลดลง 45% และความต้องการสั่งอาหารจัดส่งด่วนพุ่งสูงขึ้น 35%',
    },
    {
      id: 'disrupt_pos_outage',
      title: 'ระบบ POS ร้านอาหารขัดข้องเป็นวงกว้าง',
      zone: 'ZONE-02',
      description: 'กลุ่มร้านค้า M-200 ประสบปัญหาหน้าจอครัวไม่ซิงค์กับระบบคำสั่งซื้อ ออเดอร์กองค้างในสายการปรุงโดยไม่ทราบเวลาเสร็จที่แน่นอน',
    },
    {
      id: 'disrupt_expressway_jam',
      title: 'ทางด่วนปิดซ่อมฉุกเฉินบนเส้นทางหลัก',
      zone: 'ZONE-01',
      description: 'อุบัติเหตุบนเส้นทางสัญจรข้ามเมืองหลัก ระยะเวลาเดินทางระหว่างย่านการเงินไปยังใจกลางเมืองเพิ่มขึ้นจาก 12 นาที เป็น 48 นาที',
    },
    {
      id: 'disrupt_courier_shortage',
      title: 'ไรเดอร์ออกจากระบบกะทันหันช่วงเปลี่ยนกะ',
      zone: 'ZONE-04',
      description: 'ไรเดอร์ 35 คนออฟไลน์พร้อมกัน ณ ช่วงรอยต่อกะเวลา 01:00 UTC ขณะที่คำสั่งซื้อค้างรอเพิ่มขึ้น +22% เหนือค่าเฉลี่ย 7 วัน',
    },
  ];

  const presets = language === 'th' ? thaiPresets : PRESET_DISRUPTIONS;

  const [selectedPresetId, setSelectedPresetId] = useState<string>(presets[0].id);
  const [customScenarioText, setCustomScenarioText] = useState<string>(presets[0].description);
  const [targetZone, setTargetZone] = useState<string>(presets[0].zone);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const handleSelectPreset = (preset: typeof presets[0]) => {
    setSelectedPresetId(preset.id);
    setCustomScenarioText(preset.description);
    setTargetZone(preset.zone);
    setAnalysisResult(null);
  };

  const handleRunAnalysis = async () => {
    setIsLoading(true);
    setAnalysisResult(null);

    try {
      const response = await fetch('/api/analyze-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioDescription: customScenarioText,
          zone: targetZone,
          lang: language,
          customMetrics: { timestamp: new Date().toISOString() },
        }),
      });

      const data = await response.json();
      if (data.success) {
        setAnalysisResult(data.data);
      }
    } catch (err) {
      console.warn('Analysis request error, fallback provided:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-5 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
            {t.aiStudioTitle}
          </h3>
        </div>
        <span className="text-[11px] font-mono text-neutral-400">
          {t.aiStudioSub}
        </span>
      </div>

      <p className="text-xs text-neutral-300 font-sans leading-relaxed">
        {t.aiStudioDesc}
      </p>

      {/* Preset Operational Scenarios */}
      <div>
        <label className="text-[11px] font-mono text-neutral-400 block mb-1.5">
          {t.selectPresetLabel}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset)}
              className={`p-2.5 rounded-lg border text-left font-mono text-xs transition cursor-pointer ${
                selectedPresetId === preset.id
                  ? 'bg-cyan-950/40 border-cyan-400 text-white shadow-md'
                  : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border-neutral-800'
              }`}
            >
              <div className="font-bold flex items-center justify-between">
                <span className="truncate">{preset.title}</span>
                <span className="text-[10px] text-cyan-400">{preset.zone}</span>
              </div>
              <div className="text-[10px] text-neutral-500 font-sans line-clamp-2 mt-1">
                {preset.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Scenario Input & Action */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
          <span>{t.scenarioInputLabel}</span>
          <span>Target: <strong className="text-cyan-400">{targetZone}</strong></span>
        </div>
        <textarea
          rows={3}
          value={customScenarioText}
          onChange={(e) => setCustomScenarioText(e.target.value)}
          placeholder={
            language === 'th'
              ? 'ระบุสถานการณ์จำลอง เช่น สภาพอากาศ พายุ ฝนตกหนัก ร้านค้าค้างสต็อก หรือไรเดอร์ขาดแคลน...'
              : 'Describe any marketplace anomaly, weather shock, or merchant disruption...'
          }
          className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono text-neutral-200 focus:border-cyan-500 focus:outline-none leading-relaxed"
        />

        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] font-mono text-neutral-500">
            {language === 'th' ? 'บังคับใช้: ไม่มีหลักฐาน → ไม่มีการตัดสินใจ • ปิดเพื่อความปลอดภัย' : 'Enforces: NO EVIDENCE → NO DECISION • FAIL-CLOSED'}
          </span>
          <button
            onClick={handleRunAnalysis}
            disabled={isLoading || !customScenarioText.trim()}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition cursor-pointer shadow-lg shadow-cyan-600/20"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>{t.btnEvaluateAdvisory}</span>
          </button>
        </div>
      </div>

      {/* Generated Advisory Result */}
      {analysisResult && (
        <div className="mt-4 p-4 bg-neutral-950 rounded-xl border border-cyan-900/60 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="font-bold text-white">
                {language === 'th' ? 'ข้อเสนอแนะเอไอ' : 'AI OPERATIONAL ADVISORY'} // {analysisResult.advisoryId}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
              RISK: {analysisResult.riskTier || 'MEDIUM'}
            </span>
          </div>

          {/* Root Cause Diagnosis */}
          <div>
            <div className="text-[10px] text-neutral-500 uppercase font-bold">
              {language === 'th' ? '[1] การวินิจฉัยสาเหตุความผิดปกติ' : '[1] Root Cause Diagnosis'}
            </div>
            <div className="text-neutral-200 font-sans text-xs mt-1 leading-relaxed">
              {analysisResult.diagnosis}
            </div>
          </div>

          {/* Evidence Manifest */}
          <div>
            <div className="text-[10px] text-neutral-500 uppercase font-bold">
              {language === 'th' ? '[2] แฟ้มหลักฐานข้อมูลโทรมาตร' : '[2] Telemetry Evidence Manifest'}
            </div>
            <div className="mt-1 p-2.5 bg-neutral-900 rounded border border-neutral-800 space-y-1 text-[11px] text-neutral-300">
              {analysisResult.evidence?.map((ev: string, i: number) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="text-cyan-400">•</span>
                  <span>{ev}</span>
                </div>
              ))}
              <div className="pt-1 text-[10px] text-neutral-500 border-t border-neutral-800 truncate">
                Evidence Hash: <code className="text-cyan-400">{analysisResult.evidenceHash}</code>
              </div>
            </div>
          </div>

          {/* Recommended Non-Automated Actions */}
          <div>
            <div className="text-[10px] text-neutral-500 uppercase font-bold">
              {language === 'th' ? '[3] ข้อเสนอแนะเชิงปฏิบัติการ (รอการอนุมัติ)' : '[3] Non-Automated Action Advisories'}
            </div>
            <ul className="mt-1 space-y-1 text-xs text-neutral-200 font-sans">
              {analysisResult.recommendedActions?.map((act: string, i: number) => (
                <li key={i} className="p-2 bg-neutral-900 rounded border border-neutral-800 flex items-start gap-2">
                  <span className="text-cyan-400 font-mono font-bold text-xs mt-0.5">{i + 1}.</span>
                  <span className="leading-relaxed">{act}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Governance Notice */}
          <div className="p-2.5 bg-amber-950/30 border border-amber-900/50 rounded flex items-center justify-between text-[11px] text-amber-300">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>{analysisResult.governanceCheck || 'Execution LOCKED awaiting Dispatch Lead approval.'}</span>
            </div>
            <span className="font-bold">
              {language === 'th' ? 'การ์เดียน พอลิซี ล็อกสถานะ' : 'FAIL-CLOSED ENFORCED'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
