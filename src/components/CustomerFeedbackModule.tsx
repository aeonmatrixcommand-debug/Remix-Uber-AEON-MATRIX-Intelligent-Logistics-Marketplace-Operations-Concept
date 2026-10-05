import React, { useState } from 'react';
import {
  Star,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Truck,
  RotateCcw,
  Sparkles,
  Send,
  Sliders,
  Filter,
  Eye,
} from 'lucide-react';
import { CustomerFeedback, CourierProfile } from '../types';
import { INITIAL_COURIERS, INITIAL_FEEDBACK_LIST } from '../data/mockData';
import { useLanguage } from '../context/LanguageContext';

interface CustomerFeedbackModuleProps {
  initialOrderId?: string;
  initialCourierId?: string;
}

export const CustomerFeedbackModule: React.FC<CustomerFeedbackModuleProps> = ({
  initialOrderId = 'ORD-98214',
  initialCourierId = 'CR-8841',
}) => {
  const { language } = useLanguage();
  const isThai = language === 'th';

  const [couriers, setCouriers] = useState<CourierProfile[]>(INITIAL_COURIERS);
  const [feedbackList, setFeedbackList] = useState<CustomerFeedback[]>(INITIAL_FEEDBACK_LIST);

  // Form State
  const [selectedOrderId, setSelectedOrderId] = useState<string>(initialOrderId);
  const [selectedCourierId, setSelectedCourierId] = useState<string>(initialCourierId);
  const [customerName, setCustomerName] = useState<string>('Alex Thorne');
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>(['Fast Delivery', 'Food Warm & Intact']);
  const [comment, setComment] = useState<string>('');
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  // Filter State for Courier Table
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'FLAGGED'>('ALL');

  const availableTags = [
    { labelEn: 'Fast Delivery', labelTh: 'จัดส่งรวดเร็ว', positive: true },
    { labelEn: 'Food Warm & Intact', labelTh: 'อาหารอุ่นและสภาพสมบูรณ์', positive: true },
    { labelEn: 'Friendly Courier', labelTh: 'ไรเดอร์สุภาพบริการดี', positive: true },
    { labelEn: 'Cold-Chain Maintained', labelTh: 'ควบคุมความเย็นได้ดี', positive: true },
    { labelEn: 'Followed Dropoff Note', labelTh: 'ปฏิบัติตามคำสั่งจุดส่ง', positive: true },
    { labelEn: 'Delayed Delivery', labelTh: 'ส่งล่าช้าเกินเวลา', positive: false },
    { labelEn: 'Damaged Packaging', labelTh: 'บรรจุภัณฑ์เสียหาย', positive: false },
    { labelEn: 'Cold / Spilled Food', labelTh: 'อาหารเย็นชืด/หกเลอะ', positive: false },
    { labelEn: 'Wrong Dropoff Location', labelTh: 'ส่งผิดสถานที่', positive: false },
    { labelEn: 'Unresponsive', labelTh: 'ติดต่อไม่ได้', positive: false },
  ];

  const handleToggleTag = (tagEn: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagEn) ? prev.filter((t) => t !== tagEn) : [...prev, tagEn]
    );
  };

  const handleCourierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const courierId = e.target.value;
    setSelectedCourierId(courierId);
  };

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();

    const targetCourier = couriers.find((c) => c.courierId === selectedCourierId);
    const courierName = targetCourier ? targetCourier.name : 'Assigned Courier';

    const newFeedbackId = `FDB-${Math.floor(1000 + Math.random() * 9000)}`;
    const isNegative = rating <= 2;

    const newFeedback: CustomerFeedback = {
      feedbackId: newFeedbackId,
      orderId: selectedOrderId,
      courierId: selectedCourierId,
      courierName,
      customerName: customerName || 'Anonymous Customer',
      rating,
      tags: selectedTags,
      comment: comment.trim() || undefined,
      timestamp: new Date().toISOString(),
      slaMet: rating >= 3,
      flaggedForReview: isNegative,
      resolutionStatus: isNegative ? 'REVIEW_PENDING' : 'NONE',
    };

    // Update Feedback list
    const updatedFeedback = [newFeedback, ...feedbackList];
    setFeedbackList(updatedFeedback);

    // Recalculate Courier Rating
    setCouriers((prevCouriers) =>
      prevCouriers.map((c) => {
        if (c.courierId === selectedCourierId) {
          const courierFeedbacks = updatedFeedback.filter((f) => f.courierId === c.courierId);
          const totalRatingsSum = courierFeedbacks.reduce((sum, f) => sum + f.rating, 0);
          const newAvgRating = +(totalRatingsSum / courierFeedbacks.length).toFixed(2);
          const newTotalDeliveries = c.totalDeliveries + 1;

          // Quality threshold rule: Flag if avg < 4.20 or recent 1-star review
          const isLowScore = newAvgRating < 4.2;
          const shouldFlag = isLowScore || (isNegative && c.status === 'ACTIVE');

          let newStatus = c.status;
          let flagReason = c.flagReason;

          if (newAvgRating < 3.7) {
            newStatus = 'SUSPENDED_REVIEW';
            flagReason = isThai
              ? `คะแนนเฉลี่ยลดลงเหลือ ${newAvgRating} (ต่ำกว่าเกณฑ์ 3.70) ระงับงานชั่วคราวเพื่อสอบสวน`
              : `Rating dropped to ${newAvgRating} (< 3.70 critical threshold). Suspended pending QA inspection.`;
          } else if (shouldFlag && c.status !== 'SUSPENDED_REVIEW') {
            newStatus = 'FLAGGED_FOR_COACHING';
            flagReason = isThai
              ? `คะแนนประเมินตกต่ำที่ ${newAvgRating} หรือได้รับรายงานความผิดพลาดในการจัดส่ง`
              : `Rating at ${newAvgRating} with recent negative feedback. Flagged for performance coaching.`;
          }

          return {
            ...c,
            totalDeliveries: newTotalDeliveries,
            averageRating: newAvgRating,
            status: newStatus,
            flagReason,
            qualityScorePct: Math.round((newAvgRating / 5.0) * 100),
          };
        }
        return c;
      })
    );

    setSubmittedMessage(
      isThai
        ? `บันทึกแบบประเมินสำหรับคำสั่งซื้อ ${selectedOrderId} เรียบร้อยแล้ว (รหัส: ${newFeedbackId})`
        : `Feedback successfully registered for Order ${selectedOrderId} (ID: ${newFeedbackId}).`
    );

    // Reset inputs
    setComment('');
    setTimeout(() => setSubmittedMessage(null), 4000);
  };

  // Operational Action Handlers
  const handleCoachCourier = (courierId: string) => {
    setCouriers((prev) =>
      prev.map((c) =>
        c.courierId === courierId
          ? {
              ...c,
              status: 'FLAGGED_FOR_COACHING',
              flagReason: isThai
                ? 'ส่งหนังสือแนะนำการบริการและแนวทางการรักษาคุณภาพสินค้าเรียบร้อยแล้ว'
                : 'Coaching guidance sent regarding packaging integrity and on-time SLA delivery.',
            }
          : c
      )
    );
  };

  const handleSuspendCourier = (courierId: string) => {
    setCouriers((prev) =>
      prev.map((c) =>
        c.courierId === courierId
          ? {
              ...c,
              status: 'SUSPENDED_REVIEW',
              flagReason: isThai
                ? 'ระงับการจัดส่งชั่วคราวเพื่อรอผลการสอบสวนข้อร้องเรียน'
                : 'Temporary dispatch suspension applied pending operations management review.',
            }
          : c
      )
    );
  };

  const handleClearFlag = (courierId: string) => {
    setCouriers((prev) =>
      prev.map((c) =>
        c.courierId === courierId
          ? {
              ...c,
              status: 'ACTIVE',
              flagReason: undefined,
            }
          : c
      )
    );
  };

  const flaggedCount = couriers.filter((c) => c.status !== 'ACTIVE').length;
  const filteredCouriers = filterStatus === 'FLAGGED' ? couriers.filter((c) => c.status !== 'ACTIVE') : couriers;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-neutral-900/60 p-4 rounded-xl border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-mono text-xs font-semibold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30">
              {isThai ? 'การควบคุมคุณภาพ' : 'QUALITY ASSURANCE & FEEDBACK'}
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {isThai ? 'ระบบประเมินความคิดเห็นลูกค้าและการควบคุมคุณภาพไรเดอร์' : 'Customer Feedback & Courier Quality Assurance'}
            </h2>
          </div>
          <p className="text-xs text-neutral-400 mt-1 max-w-3xl leading-relaxed">
            {isThai
              ? 'ระบบรับฟีดแบ็กและคะแนนความพึงพอใจ 1-5 ดาวหลังจัดส่งสำเร็จ คำนวณคะแนนเฉลี่ยแบบเรียลไทม์ และระบบตรวจจับอัตโนมัติแจ้งเตือนไรเดอร์ที่คะแนนต่ำกว่าเกณฑ์ (< 4.20) เพื่อการอบรมหรือระงับงานชั่วคราว'
              : 'Post-delivery 1-5 star rating and feedback capture. Real-time courier quality tracking with automated threshold triggers that flag or suspend underperforming couriers (< 4.20 stars or repeated critical complaints).'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded bg-neutral-800 text-neutral-300 font-mono text-xs border border-neutral-700 flex items-center gap-1.5">
            <ShieldAlert className={`w-3.5 h-3.5 ${flaggedCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
            <span>
              {flaggedCount} {isThai ? 'ไรเดอร์ที่ต้องตรวจสอบ' : 'Couriers Under Review'}
            </span>
          </span>
        </div>
      </div>

      {/* Main Grid: Feedback Submission Form vs Courier Roster (7 vs 5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Customer Feedback Submission Form (5 Cols) */}
        <div className="lg:col-span-5 bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
          <form onSubmit={handleSubmitFeedback} className="space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  {isThai ? 'แบบประเมินความพึงพอใจการจัดส่ง' : 'Rate & Review Delivered Order'}
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                STATUS: DELIVERED
              </span>
            </div>

            {/* Order & Courier Selector */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <label className="text-[10px] text-neutral-500 uppercase block mb-1">
                  {isThai ? 'รหัสคำสั่งซื้อ' : 'Order ID'}
                </label>
                <input
                  type="text"
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="w-full p-2 bg-neutral-950 border border-neutral-800 rounded text-neutral-200 text-xs focus:border-cyan-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-500 uppercase block mb-1">
                  {isThai ? 'ไรเดอร์ผู้จัดส่ง' : 'Courier'}
                </label>
                <select
                  value={selectedCourierId}
                  onChange={handleCourierChange}
                  className="w-full p-2 bg-neutral-950 border border-neutral-800 rounded text-neutral-200 text-xs focus:border-cyan-500 focus:outline-none cursor-pointer"
                >
                  {couriers.map((c) => (
                    <option key={c.courierId} value={c.courierId}>
                      {c.name} ({c.courierId})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Customer Name */}
            <div>
              <label className="text-[10px] text-neutral-500 uppercase font-mono block mb-1">
                {isThai ? 'ชื่อผู้สั่งซื้อ' : 'Customer Name'}
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full p-2 bg-neutral-950 border border-neutral-800 rounded text-neutral-200 text-xs font-mono focus:border-cyan-500 focus:outline-none"
                placeholder="e.g. Sarah Jenkins"
              />
            </div>

            {/* 1-5 Star Interactive Selector */}
            <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 text-center space-y-1.5">
              <label className="text-[11px] font-mono text-neutral-400 block">
                {isThai ? 'ระดับคะแนนความพึงพอใจ (1 - 5 ดาว):' : 'Courier Delivery Rating (1 - 5 Stars):'}
              </label>

              <div className="flex items-center justify-center gap-2 py-1">
                {[1, 2, 3, 4, 5].map((starValue) => {
                  const isFilled = (hoverRating !== null ? hoverRating : rating) >= starValue;
                  return (
                    <button
                      key={starValue}
                      type="button"
                      onMouseEnter={() => setHoverRating(starValue)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => setRating(starValue)}
                      className="p-1 cursor-pointer transition transform hover:scale-125 focus:outline-none"
                    >
                      <Star
                        className={`w-7 h-7 transition-colors ${
                          isFilled
                            ? 'text-amber-400 fill-amber-400 filter drop-shadow(0 0 4px rgba(251,191,36,0.5))'
                            : 'text-neutral-700'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              <div className="text-xs font-mono font-bold text-neutral-200">
                {rating === 5 && (isThai ? '★★★★★ ยอดเยี่ยมมาก (Exceptional)' : '★★★★★ 5.0 - Exceptional')}
                {rating === 4 && (isThai ? '★★★★☆ ดีและตรงเวลา (Good Delivery)' : '★★★★☆ 4.0 - Good Delivery')}
                {rating === 3 && (isThai ? '★★★☆☆ พอใช้ได้ (Satisfactory)' : '★★★☆☆ 3.0 - Satisfactory')}
                {rating === 2 && (isThai ? '★★☆☆☆ ต่ำกว่ามาตรฐาน (Poor / Delayed)' : '★★☆☆☆ 2.0 - Poor / Delayed')}
                {rating === 1 && (isThai ? '★☆☆☆☆ ไม่ผ่านเกณฑ์ (Critical Issues)' : '★☆☆☆☆ 1.0 - Unacceptable')}
              </div>
            </div>

            {/* Quality Tag Chips */}
            <div>
              <label className="text-[10px] text-neutral-500 uppercase font-mono block mb-1.5">
                {isThai ? 'เลือกแท็กประเมินการบริการ:' : 'Select Service Category Tags:'}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {availableTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag.labelEn);
                  return (
                    <button
                      key={tag.labelEn}
                      type="button"
                      onClick={() => handleToggleTag(tag.labelEn)}
                      className={`px-2 py-1 rounded text-[11px] font-mono transition cursor-pointer border ${
                        isSelected
                          ? tag.positive
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-semibold'
                          : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                      }`}
                    >
                      {isThai ? tag.labelTh : tag.labelEn}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Review Comment Text */}
            <div>
              <label className="text-[10px] text-neutral-500 uppercase font-mono block mb-1">
                {isThai ? 'ความคิดเห็นเพิ่มเติม (Optional Comments):' : 'Customer Review Notes (Optional):'}
              </label>
              <textarea
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  isThai
                    ? 'เช่น อาหารจัดส่งรวดเร็ว ไรเดอร์สุภาพมาก บรรจุภัณฑ์เรียบร้อย...'
                    : 'e.g. Arrived on time, handed over with care at the reception desk...'
                }
                className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded text-xs font-mono text-neutral-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-cyan-600/20"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isThai ? 'ส่งแบบประเมินและอัปเดตคะแนน' : 'Submit Customer Feedback & Update QA Scores'}</span>
              </button>
            </div>

            {submittedMessage && (
              <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded text-xs font-mono text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{submittedMessage}</span>
              </div>
            )}
          </form>
        </div>

        {/* Right Column: Courier QA Roster & Performance Console (7 Cols) */}
        <div className="lg:col-span-7 bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  {isThai ? 'แดชบอร์ดควบคุมคุณภาพและประสิทธิภาพไรเดอร์' : 'Active Courier Quality & Performance Roster'}
                </h3>
              </div>

              {/* Filter toggle */}
              <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-lg p-0.5 text-[11px] font-mono">
                <button
                  onClick={() => setFilterStatus('ALL')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    filterStatus === 'ALL' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400'
                  }`}
                >
                  {isThai ? 'ทั้งหมด' : 'All (5)'}
                </button>
                <button
                  onClick={() => setFilterStatus('FLAGGED')}
                  className={`px-2 py-0.5 rounded cursor-pointer flex items-center gap-1 ${
                    filterStatus === 'FLAGGED' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40' : 'text-neutral-400'
                  }`}
                >
                  <span>{isThai ? 'ถูกแจ้งเตือน' : 'Flagged'}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                </button>
              </div>
            </div>

            {/* Threshold Notice Callout */}
            <div className="mt-3 p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono flex items-center justify-between text-neutral-400">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  {isThai
                    ? 'เกณฑ์ความปลอดภัย: ไรเดอร์ที่คะแนนต่ำกว่า 4.20 หรือมีรายงานสินค้าเสียหายจะถูกแจ้งเตือนอัตโนมัติ'
                    : 'QA Rule: Couriers with average rating < 4.20 or critical damaged delivery tags are flagged.'}
                </span>
              </div>
              <span className="text-[10px] text-cyan-400 font-bold">POL-COURIER-QA-V2</span>
            </div>

            {/* Couriers Table */}
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400 text-[11px]">
                    <th className="pb-2">{isThai ? 'ไรเดอร์' : 'Courier Name & ID'}</th>
                    <th className="pb-2">{isThai ? 'ยานพาหนะ' : 'Vehicle'}</th>
                    <th className="pb-2 text-right">{isThai ? 'รอบส่ง' : 'Drops'}</th>
                    <th className="pb-2 text-right">{isThai ? 'คะแนนเฉลี่ย' : 'Avg Rating'}</th>
                    <th className="pb-2 text-center">{isThai ? 'สถานะ QA' : 'QA Status'}</th>
                    <th className="pb-2 text-right">{isThai ? 'การจัดการ' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {filteredCouriers.map((courier) => {
                    const isFlagged = courier.status !== 'ACTIVE';
                    return (
                      <tr key={courier.courierId} className="hover:bg-neutral-800/40 transition">
                        <td className="py-2.5 font-bold text-white flex items-center gap-2">
                          <span
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              courier.averageRating >= 4.5
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : courier.averageRating >= 4.0
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {courier.avatarInitials}
                          </span>
                          <div>
                            <div>{courier.name}</div>
                            <div className="text-[10px] text-neutral-500 font-normal">{courier.courierId}</div>
                          </div>
                        </td>
                        <td className="py-2.5 text-neutral-400 text-[11px]">{courier.vehicleType}</td>
                        <td className="py-2.5 text-right text-neutral-300 font-semibold">
                          {courier.totalDeliveries}
                        </td>
                        <td className="py-2.5 text-right">
                          <span
                            className={`font-bold text-sm ${
                              courier.averageRating >= 4.5
                                ? 'text-emerald-400'
                                : courier.averageRating >= 4.0
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {courier.averageRating.toFixed(2)}★
                          </span>
                        </td>
                        <td className="py-2.5 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              courier.status === 'ACTIVE'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : courier.status === 'FLAGGED_FOR_COACHING'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {courier.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-right space-x-1">
                          {isFlagged ? (
                            <button
                              onClick={() => handleClearFlag(courier.courierId)}
                              className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-mono cursor-pointer"
                              title="Clear Flag after review"
                            >
                              {isThai ? 'ปลดสถานะ' : 'Resolve'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleCoachCourier(courier.courierId)}
                              className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-[10px] font-mono cursor-pointer"
                              title="Send Coaching Alert"
                            >
                              {isThai ? 'ส่งคำเตือน' : 'Coach'}
                            </button>
                          )}
                          <button
                            onClick={() => handleSuspendCourier(courier.courierId)}
                            className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-[10px] font-mono cursor-pointer"
                            title="Suspend Courier"
                          >
                            {isThai ? 'ระงับงาน' : 'Suspend'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Feedback Feed */}
          <div className="pt-3 border-t border-neutral-800">
            <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isThai ? 'บันทึกความคิดเห็นล่าสุดของลูกค้า' : 'Recent Customer Feedback Audit Stream'}</span>
              </span>
              <span>{feedbackList.length} reviews</span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {feedbackList.slice(0, 4).map((f) => (
                <div
                  key={f.feedbackId}
                  className="p-2.5 bg-neutral-950 rounded border border-neutral-800 text-xs font-mono space-y-1 hover:border-neutral-700 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400 font-bold">{f.rating}★</span>
                      <span className="text-white font-semibold">{f.customerName}</span>
                      <span className="text-neutral-500 text-[10px]">({f.orderId} → {f.courierName})</span>
                    </div>
                    {f.flaggedForReview && (
                      <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[9px] font-bold">
                        {isThai ? 'ถูกส่งตรวจสอบ' : 'FLAGGED'}
                      </span>
                    )}
                  </div>

                  {f.comment && (
                    <p className="text-[11px] text-neutral-300 font-sans italic">"{f.comment}"</p>
                  )}

                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {f.tags.map((tag, tIdx) => (
                      <span
                        key={tIdx}
                        className="px-1.5 py-0.2 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 text-[9px]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
