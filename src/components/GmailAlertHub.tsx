import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Users,
  UserCheck,
  UserPlus,
  RefreshCw,
  FileText,
  Eye,
  Code,
  Lock,
  Sparkles,
  ExternalLink,
  Trash2,
  Clock,
  Check,
  X,
  Info,
  ChevronRight,
  LogOut,
  Calendar,
} from 'lucide-react';
import { CityMarketplace } from '../types';
import { useLanguage } from '../context/LanguageContext';
import {
  initAuth,
  googleSignIn,
  logout,
  getCurrentUser,
  getAccessToken,
  WORKSPACE_SCOPES,
} from '../services/googleAuth';
import {
  OperationsManager,
  INITIAL_OPERATIONS_MANAGERS,
  generatePerformanceSummaryEmail,
  generateCriticalIncidentEmail,
  sendGmailMessage,
  SentEmailRecord,
  EmailDispatchPayload,
} from '../services/gmailService';
import { COURIER_PROFILES_DATA } from '../data/mockData';
import { User } from 'firebase/auth';

interface GmailAlertHubProps {
  city: CityMarketplace;
  initialMode?: 'summary' | 'shift' | 'incident';
}

export const GmailAlertHub: React.FC<GmailAlertHubProps> = ({
  city,
  initialMode = 'summary',
}) => {
  const { t } = useLanguage();

  // Auth States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hasAuthToken, setHasAuthToken] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Operations Managers Directory State
  const [managers, setManagers] = useState<OperationsManager[]>(INITIAL_OPERATIONS_MANAGERS);
  const [selectedManagerEmails, setSelectedManagerEmails] = useState<string[]>(
    INITIAL_OPERATIONS_MANAGERS.filter((m) => m.status === 'ON_DUTY').map((m) => m.email)
  );
  const [showAddManagerModal, setShowAddManagerModal] = useState<boolean>(false);
  const [newManagerForm, setNewManagerForm] = useState<Partial<OperationsManager>>({
    name: '',
    email: '',
    title: 'Operations Manager',
    assignedZones: ['ZONE-01', 'ZONE-02'],
    shift: 'MORNING',
    phone: '',
    status: 'ACTIVE',
    receiveCriticalAlerts: true,
    receiveDailyPerformance: true,
  });

  // Dispatch Compose States
  const [dispatchType, setDispatchType] = useState<'PERFORMANCE_SUMMARY' | 'CRITICAL_INCIDENT' | 'SHIFT_RECOMMENDATION'>(
    initialMode === 'incident' ? 'CRITICAL_INCIDENT' : initialMode === 'shift' ? 'SHIFT_RECOMMENDATION' : 'PERFORMANCE_SUMMARY'
  );
  const [customDirectorNotes, setCustomDirectorNotes] = useState<string>(
    'Priority directive: Reallocate 30 couriers from Zone-03 to Zone-04 to counter the 27.6% supply deficit before the 12:30 PM corporate lunch surge.'
  );
  const [previewTab, setPreviewTab] = useState<'RENDERED' | 'RAW_HTML' | 'PLAIN_TEXT'>('RENDERED');

  // Incident Alert specifics
  const [incidentSeverity, setIncidentSeverity] = useState<'P1_CRITICAL' | 'P2_HIGH' | 'SLA_BREACH_SPIKE'>('P1_CRITICAL');
  const [incidentTitle, setIncidentTitle] = useState<string>('Sub-Market Supply Imbalance & SLA Degradation in Midtown South');
  const [incidentActionRequired, setIncidentActionRequired] = useState<string>(
    'Authorize cross-zone courier surge incentives and notify merchant prep dispatchers to throttle batch sizes.'
  );

  // Mandatory Confirmation Modal State
  const [pendingDispatchPayload, setPendingDispatchPayload] = useState<EmailDispatchPayload | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [dispatchStatusNotification, setDispatchStatusNotification] = useState<{
    success: boolean;
    message: string;
    messageId?: string;
  } | null>(null);

  // Sent Emails Audit Trail
  const [sentHistory, setSentHistory] = useState<SentEmailRecord[]>([
    {
      id: 'DISPATCH-HIST-01',
      messageId: '18f2a93b44c8012e',
      timestamp: new Date(Date.now() - 3600000 * 2).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      to: ['sarah.lin.ops@aeon-matrix.internal', 'marcus.vance@aeon-matrix.internal'],
      subject: '[AEON MATRIX] Courier Operations Daily Performance Briefing — New York Metro (NYC-METRO-01)',
      alertType: 'PERFORMANCE_SUMMARY',
      status: 'SENT',
      evidenceHash: '9D48-F2E1-A890-B77C',
      senderEmail: 'nuttidagoedseesuk@gmail.com',
    },
  ]);

  // Check auth state on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setHasAuthToken(!!token);
      },
      () => {
        const user = getCurrentUser();
        setCurrentUser(user);
        getAccessToken().then((token) => setHasAuthToken(!!token));
      }
    );
    return () => unsubscribe();
  }, []);

  // Handle Google Sign-In
  const handleGoogleLogin = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setCurrentUser(result.user);
        setHasAuthToken(true);
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Authentication failed. Please check popup permissions.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
    setHasAuthToken(false);
  };

  // Toggle recipient selection
  const toggleRecipient = (email: string) => {
    setSelectedManagerEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const selectAllOnDuty = () => {
    setSelectedManagerEmails(managers.filter((m) => m.status === 'ON_DUTY').map((m) => m.email));
  };

  const selectAllManagers = () => {
    setSelectedManagerEmails(managers.map((m) => m.email));
  };

  // Build top couriers list from data
  const topCouriersSummary = COURIER_PROFILES_DATA.slice(0, 5).map((c) => ({
    name: c.name,
    deliveries: c.totalDeliveries,
    rating: c.averageRating,
    qualityScore: c.qualityScorePct,
  }));

  // Generate Current Email Payload
  const generateCurrentPayload = (): EmailDispatchPayload => {
    const timestampStr = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    const senderEmail = currentUser?.email || 'dispatcher@aeon-matrix.internal';

    if (dispatchType === 'PERFORMANCE_SUMMARY') {
      const { subject, htmlBody, plainTextBody } = generatePerformanceSummaryEmail({
        cityName: city.cityName,
        cluster: city.cluster,
        healthScore: city.healthScore,
        activeOrders: city.activeOrders,
        availableCouriers: city.availableCouriers,
        avgSlaMinutes: city.avgSlaMinutes,
        cancellationRiskPct: city.cancellationRiskPct,
        zones: city.zones.map((z) => ({
          name: z.name,
          imbalancePct: z.imbalancePct,
          medianSlaMinutes: z.medianSlaMinutes,
          activeOrders: z.activeOrders,
          availableCouriers: z.availableCouriers,
          status: z.status,
        })),
        topCouriers: topCouriersSummary,
        generatedBy: `${currentUser?.displayName || 'Operations Dispatcher'} (${senderEmail})`,
        timestamp: timestampStr,
        customNotes: customDirectorNotes,
      });

      return {
        to: selectedManagerEmails.length > 0 ? selectedManagerEmails : [senderEmail],
        subject,
        htmlBody,
        plainTextBody,
        alertType: 'PERFORMANCE_SUMMARY',
        priority: 'NORMAL',
      };
    } else if (dispatchType === 'CRITICAL_INCIDENT') {
      const degradedZones = city.zones.filter((z) => z.status === 'CRITICAL' || z.status === 'DEGRADED').map((z) => z.name);
      const totalBacklog = city.zones.reduce((sum, z) => sum + z.unmatchedBacklog, 0);

      const { subject, htmlBody, plainTextBody } = generateCriticalIncidentEmail({
        incidentId: `INC-${city.cityId.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
        severity: incidentSeverity,
        title: incidentTitle,
        cityName: city.cityName,
        affectedZones: degradedZones.length > 0 ? degradedZones : [city.zones[0]?.name || 'Downtown'],
        backlogCount: totalBacklog > 0 ? totalBacklog : 218,
        slaBreachMinutes: Math.round(city.avgSlaMinutes * 1.4),
        aiAdvisoryAction: 'Dynamic surge cap adjusted +25% in degraded zones and fail-closed throttle engaged on low-priority restaurant pickup batches.',
        failClosedStatus: 'ENFORCED (AEON Guardian Policy v2.6.4)',
        escalatedBy: `${currentUser?.displayName || 'Automated Incident Sentinel'} (${senderEmail})`,
        timestamp: timestampStr,
        immediateActionRequired: incidentActionRequired,
      });

      return {
        to: selectedManagerEmails.length > 0 ? selectedManagerEmails : [senderEmail],
        subject,
        htmlBody,
        plainTextBody,
        alertType: 'CRITICAL_INCIDENT',
        priority: 'URGENT',
      };
    } else {
      // SHIFT_RECOMMENDATION
      const subject = `[AEON MATRIX] Optimal Courier Shift Roster Briefing — ${city.cityName}`;
      const plainTextBody = `Automated Shift Roster recommendation for ${city.cityName}.\nOptimized working windows: Lunch Peak (11:30-14:30), Dinner Surge (17:30-21:30).\nGenerated by ${senderEmail}`;
      const htmlBody = `
        <div style="font-family: sans-serif; background-color: #121212; color: #fff; padding: 20px; border-radius: 8px;">
          <h2 style="color: #38bdf8;">Optimal Courier Shift Recommendation Roster</h2>
          <p>Region: <strong>${city.cityName}</strong> | Generated: ${timestampStr}</p>
          <div style="background-color: #1e1e1e; padding: 12px; border-radius: 6px; margin-top: 10px;">
            <p><strong>Recommended Shift 1:</strong> Lunch Acceleration (11:30 AM – 2:30 PM) — Est. $39.50/hr (1.65× Surge)</p>
            <p><strong>Recommended Shift 2:</strong> Evening Prime Dinner (5:30 PM – 9:30 PM) — Est. $44.00/hr (1.85× Surge)</p>
          </div>
          <p style="font-size: 12px; color: #888; margin-top: 15px;">Sent by ${senderEmail}</p>
        </div>
      `;

      return {
        to: selectedManagerEmails.length > 0 ? selectedManagerEmails : [senderEmail],
        subject,
        htmlBody,
        plainTextBody,
        alertType: 'SHIFT_RECOMMENDATION',
        priority: 'HIGH',
      };
    }
  };

  const currentPayload = generateCurrentPayload();

  // Trigger Confirmation Flow (Mandatory user confirmation per skill guidelines)
  const handleInitiateSend = () => {
    if (selectedManagerEmails.length === 0) {
      alert('Please select at least one recipient Operations Manager.');
      return;
    }
    setPendingDispatchPayload(currentPayload);
  };

  // Execute Send after explicit confirmation dialog
  const handleConfirmExecuteSend = async () => {
    if (!pendingDispatchPayload) return;

    setIsSending(true);
    setPendingDispatchPayload(null);
    const senderEmail = currentUser?.email || 'dispatcher@aeon-matrix.internal';

    try {
      if (hasAuthToken) {
        // Send via official Gmail REST API
        const result = await sendGmailMessage(pendingDispatchPayload, senderEmail);

        const newRecord: SentEmailRecord = {
          id: `DISPATCH-${Date.now().toString(36).toUpperCase()}`,
          messageId: result.messageId,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          to: pendingDispatchPayload.to,
          subject: pendingDispatchPayload.subject,
          alertType: pendingDispatchPayload.alertType,
          status: 'SENT',
          evidenceHash: Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
          senderEmail,
        };

        setSentHistory((prev) => [newRecord, ...prev]);
        setDispatchStatusNotification({
          success: true,
          message: `Email successfully dispatched to ${pendingDispatchPayload.to.length} operations manager(s) via Gmail API!`,
          messageId: result.messageId,
        });
      } else {
        // Simulated dispatch mode if user wants preview simulation before Google login
        const newRecord: SentEmailRecord = {
          id: `SIM-DISPATCH-${Date.now().toString(36).toUpperCase()}`,
          messageId: `sim_${Math.random().toString(36).substring(2, 12)}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          to: pendingDispatchPayload.to,
          subject: pendingDispatchPayload.subject,
          alertType: pendingDispatchPayload.alertType,
          status: 'SIMULATED',
          evidenceHash: 'SIM-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
          senderEmail: 'simulation-sandbox@aeon-matrix.internal',
        };

        setSentHistory((prev) => [newRecord, ...prev]);
        setDispatchStatusNotification({
          success: true,
          message: `[Simulation Mode] Dispatch verified & logged. Sign in with Google to deliver directly to inboxes.`,
        });
      }
    } catch (err: any) {
      setDispatchStatusNotification({
        success: false,
        message: err?.message || 'Failed to send email via Gmail API.',
      });
    } finally {
      setIsSending(false);
    }
  };

  // Add Manager Form Submission
  const handleAddManager = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newManagerForm.name || !newManagerForm.email) return;

    const newMgr: OperationsManager = {
      id: `MGR-${(managers.length + 1).toString().padStart(2, '0')}`,
      name: newManagerForm.name!,
      email: newManagerForm.email!,
      title: newManagerForm.title || 'Operations Manager',
      assignedZones: newManagerForm.assignedZones || ['ZONE-01'],
      shift: (newManagerForm.shift as any) || 'MORNING',
      phone: newManagerForm.phone || '+1 (555) 000-0000',
      status: (newManagerForm.status as any) || 'ACTIVE',
      receiveCriticalAlerts: true,
      receiveDailyPerformance: true,
    };

    setManagers((prev) => [...prev, newMgr]);
    setSelectedManagerEmails((prev) => [...prev, newMgr.email]);
    setShowAddManagerModal(false);
    setNewManagerForm({
      name: '',
      email: '',
      title: 'Operations Manager',
      assignedZones: ['ZONE-01'],
      shift: 'MORNING',
      phone: '',
      status: 'ACTIVE',
      receiveCriticalAlerts: true,
      receiveDailyPerformance: true,
    });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-6 relative overflow-hidden backdrop-blur-sm">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold tracking-wider">
                GMAIL & WORKSPACE INTEGRATION MODULE
              </span>
              <span className="text-xs font-mono text-neutral-400">
                OAuth 2.0 • Gmail REST API v1
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
              <Mail className="w-6 h-6 text-cyan-400" />
              Automated Operations Dispatch & Incident Escalation
            </h2>
            <p className="text-sm text-neutral-400 mt-1 max-w-3xl">
              Delivers automated courier performance summaries, daily health audits, and high-priority critical incident alerts directly to registered courier operations managers via Gmail.
            </p>
          </div>

          {/* Authentication Badge / Google Sign In */}
          <div className="shrink-0">
            {currentUser && hasAuthToken ? (
              <div className="flex items-center gap-3 bg-neutral-950/80 border border-emerald-500/30 rounded-lg p-2.5">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center font-bold text-xs text-cyan-300">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'User'}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    (currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()
                  )}
                </div>
                <div className="text-left text-xs font-mono">
                  <div className="text-white font-medium truncate max-w-[160px]">
                    {currentUser.displayName || currentUser.email}
                  </div>
                  <div className="text-emerald-400 text-[10px] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Gmail Connected
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign out of Google"
                  className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-red-400 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* Official Google Sign-In Styled Button */
              <button
                onClick={handleGoogleLogin}
                disabled={isAuthenticating}
                className="group relative flex items-center gap-3 px-4 py-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-cyan-500/50 text-white text-xs font-medium transition cursor-pointer shadow-md hover:shadow-cyan-500/10"
              >
                {/* Official Google 'G' Icon */}
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
                <span className="font-mono">
                  {isAuthenticating ? 'Connecting Google...' : 'Sign in with Google'}
                </span>
              </button>
            )}
          </div>
        </div>

        {authError && (
          <div className="mt-4 p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs font-mono flex items-center justify-between">
            <span>{authError}</span>
            <button onClick={() => setAuthError(null)} className="text-neutral-400 hover:text-white">
              ×
            </button>
          </div>
        )}

        {dispatchStatusNotification && (
          <div
            className={`mt-4 p-3 rounded-lg text-xs font-mono flex items-center justify-between border ${
              dispatchStatusNotification.success
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-red-950/40 border-red-500/40 text-red-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {dispatchStatusNotification.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{dispatchStatusNotification.message}</span>
              {dispatchStatusNotification.messageId && (
                <span className="text-[10px] text-neutral-400 font-mono">
                  (ID: {dispatchStatusNotification.messageId})
                </span>
              )}
            </div>
            <button
              onClick={() => setDispatchStatusNotification(null)}
              className="text-neutral-400 hover:text-white ml-2 cursor-pointer"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Registered Operations Managers Directory (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  Courier Operations Managers
                </h3>
                <p className="text-xs text-neutral-400">
                  Target recipients for automated dispatch alerts & summaries
                </p>
              </div>

              <button
                onClick={() => setShowAddManagerModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-mono text-cyan-300 transition cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add Manager
              </button>
            </div>

            {/* Quick Bulk Selection Buttons */}
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-neutral-800 text-[11px] font-mono">
              <span className="text-neutral-500">Select:</span>
              <button
                onClick={selectAllOnDuty}
                className="text-cyan-400 hover:underline cursor-pointer"
              >
                On-Duty Only
              </button>
              <span className="text-neutral-600">•</span>
              <button
                onClick={selectAllManagers}
                className="text-cyan-400 hover:underline cursor-pointer"
              >
                All Managers ({managers.length})
              </button>
              <span className="text-neutral-600">•</span>
              <button
                onClick={() => setSelectedManagerEmails([])}
                className="text-neutral-400 hover:text-neutral-200 cursor-pointer"
              >
                Clear
              </button>
            </div>

            {/* Manager Roster List */}
            <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
              {managers.map((manager) => {
                const isSelected = selectedManagerEmails.includes(manager.email);
                return (
                  <div
                    key={manager.id}
                    onClick={() => toggleRecipient(manager.email)}
                    className={`p-3 rounded-lg border transition cursor-pointer flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-neutral-950 border-cyan-500/40 shadow-sm shadow-cyan-500/5'
                        : 'bg-neutral-950/50 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // Handled by container click
                        className="mt-1 rounded border-neutral-700 text-cyan-500 focus:ring-0 cursor-pointer"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{manager.name}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                              manager.status === 'ON_DUTY'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : manager.status === 'STANDBY'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {manager.status}
                          </span>
                        </div>

                        <div className="text-xs text-neutral-400 font-mono mt-0.5">{manager.email}</div>
                        <div className="text-[11px] text-neutral-500 mt-0.5">{manager.title}</div>

                        <div className="flex flex-wrap gap-1 mt-2">
                          {manager.assignedZones.map((z, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px] font-mono text-neutral-300"
                            >
                              {z}
                            </span>
                          ))}
                          <span className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px] font-mono text-neutral-400">
                            Shift: {manager.shift}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-[10px] font-mono text-neutral-500 shrink-0">
                      {manager.receiveCriticalAlerts && <span className="text-red-400 block">⚡ Alerts</span>}
                      {manager.receiveDailyPerformance && <span className="text-cyan-400 block">📊 Reports</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-800 text-[11px] text-neutral-400 flex items-center justify-between">
              <span>{selectedManagerEmails.length} recipient(s) selected</span>
              <span className="text-xs font-mono text-cyan-400">AEON Ops Registry</span>
            </div>
          </div>

          {/* Sent Dispatches History & Audit Record */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Dispatched Alerts Audit Log
              </h3>
              <span className="text-[11px] font-mono text-neutral-400">
                {sentHistory.length} Recorded
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {sentHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-mono space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white font-semibold truncate max-w-[200px]">
                      {item.subject}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        item.status === 'SENT'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-neutral-400">
                    <span>To: {item.to.length} recipient(s)</span>
                    <span>{item.timestamp}</span>
                  </div>

                  <div className="text-[10px] text-neutral-500 flex items-center justify-between pt-1 border-t border-neutral-900">
                    <span>Evidence Hash: {item.evidenceHash}</span>
                    {item.messageId && <span>ID: {item.messageId.substring(0, 8)}...</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Email Compose, Template Selector & Live Previewer (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-5">
            {/* Dispatch Type Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-neutral-800">
              <div className="flex items-center gap-1.5 bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs font-mono">
                <button
                  onClick={() => setDispatchType('PERFORMANCE_SUMMARY')}
                  className={`px-3 py-1.5 rounded transition cursor-pointer flex items-center gap-1.5 ${
                    dispatchType === 'PERFORMANCE_SUMMARY'
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Performance Summary
                </button>

                <button
                  onClick={() => setDispatchType('CRITICAL_INCIDENT')}
                  className={`px-3 py-1.5 rounded transition cursor-pointer flex items-center gap-1.5 ${
                    dispatchType === 'CRITICAL_INCIDENT'
                      ? 'bg-red-500/20 text-red-300 font-semibold border border-red-500/40'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                  Critical Incident Alert
                </button>

                <button
                  onClick={() => setDispatchType('SHIFT_RECOMMENDATION')}
                  className={`px-3 py-1.5 rounded transition cursor-pointer flex items-center gap-1.5 ${
                    dispatchType === 'SHIFT_RECOMMENDATION'
                      ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/40'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  Shift Roster
                </button>
              </div>

              {/* Preview Format Mode Switcher */}
              <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-[11px] font-mono">
                <button
                  onClick={() => setPreviewTab('RENDERED')}
                  className={`px-2 py-1 rounded transition cursor-pointer ${
                    previewTab === 'RENDERED' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-white'
                  }`}
                >
                  <Eye className="w-3 h-3 inline mr-1" />
                  Rendered
                </button>
                <button
                  onClick={() => setPreviewTab('RAW_HTML')}
                  className={`px-2 py-1 rounded transition cursor-pointer ${
                    previewTab === 'RAW_HTML' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-white'
                  }`}
                >
                  <Code className="w-3 h-3 inline mr-1" />
                  HTML
                </button>
                <button
                  onClick={() => setPreviewTab('PLAIN_TEXT')}
                  className={`px-2 py-1 rounded transition cursor-pointer ${
                    previewTab === 'PLAIN_TEXT' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-white'
                  }`}
                >
                  Text
                </button>
              </div>
            </div>

            {/* Config & Parameters depending on Dispatch Type */}
            <div className="mt-4 space-y-3">
              {dispatchType === 'PERFORMANCE_SUMMARY' && (
                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1">
                    Director Operational Remarks & Shift Directives:
                  </label>
                  <textarea
                    value={customDirectorNotes}
                    onChange={(e) => setCustomDirectorNotes(e.target.value)}
                    rows={2}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-200 focus:border-cyan-500 focus:outline-none font-mono resize-none"
                    placeholder="Add custom managerial instructions to be included in the email..."
                  />
                </div>
              )}

              {dispatchType === 'CRITICAL_INCIDENT' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono text-neutral-400 mb-1">Severity Tier:</label>
                    <select
                      value={incidentSeverity}
                      onChange={(e) => setIncidentSeverity(e.target.value as any)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-neutral-200 focus:border-red-500 focus:outline-none font-mono"
                    >
                      <option value="P1_CRITICAL">P1 - Critical Citywide Outage / Spike</option>
                      <option value="P2_HIGH">P2 - High Sub-Market Imbalance</option>
                      <option value="SLA_BREACH_SPIKE">SLA Breach Escalation (&gt;40m)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-neutral-400 mb-1">Incident Headline:</label>
                    <input
                      type="text"
                      value={incidentTitle}
                      onChange={(e) => setIncidentTitle(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-neutral-200 focus:border-red-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-mono text-neutral-400 mb-1">
                      Immediate Action Required from Managers:
                    </label>
                    <input
                      type="text"
                      value={incidentActionRequired}
                      onChange={(e) => setIncidentActionRequired(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-neutral-200 focus:border-red-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Email Metadata Bar */}
            <div className="mt-4 p-3 bg-neutral-950 border border-neutral-800 rounded-lg space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Subject:</span>
                <span className="text-white font-semibold truncate max-w-md">{currentPayload.subject}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Recipients ({selectedManagerEmails.length}):</span>
                <span className="text-cyan-400 truncate max-w-md">
                  {selectedManagerEmails.join(', ') || 'No recipients selected'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">From / Sender:</span>
                <span className="text-neutral-300">
                  {currentUser?.email || 'AEON Dispatcher (Sign-in pending)'}
                </span>
              </div>
            </div>

            {/* Live Preview Container */}
            <div className="mt-4 border border-neutral-800 rounded-lg overflow-hidden bg-neutral-950">
              <div className="p-2 bg-neutral-900 border-b border-neutral-800 text-[11px] font-mono text-neutral-400 flex items-center justify-between">
                <span>MIME Preview: {currentPayload.alertType}</span>
                <span>Content-Type: multipart/alternative</span>
              </div>

              {previewTab === 'RENDERED' && (
                <div className="p-4 max-h-96 overflow-y-auto bg-neutral-950">
                  <div
                    className="text-xs"
                    dangerouslySetInnerHTML={{ __html: currentPayload.htmlBody }}
                  />
                </div>
              )}

              {previewTab === 'RAW_HTML' && (
                <pre className="p-4 max-h-96 overflow-y-auto text-[11px] text-neutral-300 font-mono whitespace-pre-wrap">
                  {currentPayload.htmlBody}
                </pre>
              )}

              {previewTab === 'PLAIN_TEXT' && (
                <pre className="p-4 max-h-96 overflow-y-auto text-[11px] text-neutral-300 font-mono whitespace-pre-wrap">
                  {currentPayload.plainTextBody}
                </pre>
              )}
            </div>

            {/* Action Bar & Send Button */}
            <div className="mt-5 pt-4 border-t border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-neutral-400 font-mono flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Explicit confirmation required before dispatching</span>
              </div>

              <button
                onClick={handleInitiateSend}
                disabled={isSending || selectedManagerEmails.length === 0}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold font-mono transition cursor-pointer shadow-lg shadow-cyan-500/20 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {isSending ? 'Dispatching via Gmail...' : 'Send Email to Ops Managers'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MANDATORY EXPLICIT USER CONFIRMATION DIALOG MODAL (Workspace Integration Skill Mandate) */}
      {pendingDispatchPayload && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-cyan-500/50 rounded-xl max-w-xl w-full p-6 shadow-2xl animate-scaleUp">
            <div className="flex items-center gap-2.5 text-amber-400 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <h3 className="text-lg font-bold text-white">
                Confirm Outbound Email Dispatch
              </h3>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed mb-4">
              You are about to send an email via your authenticated Gmail account to the registered courier operations managers. Please review the dispatch parameters:
            </p>

            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 space-y-2 text-xs font-mono mb-5">
              <div className="flex justify-between">
                <span className="text-neutral-500">Alert Type:</span>
                <span className="text-cyan-400 font-semibold">{pendingDispatchPayload.alertType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Priority Level:</span>
                <span className={pendingDispatchPayload.priority === 'URGENT' ? 'text-red-400 font-bold' : 'text-white'}>
                  {pendingDispatchPayload.priority}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Subject:</span>
                <span className="text-white font-medium truncate max-w-xs">{pendingDispatchPayload.subject}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Target Recipients:</span>
                <span className="text-emerald-400">{pendingDispatchPayload.to.length} manager(s)</span>
              </div>
              <div className="pt-2 border-t border-neutral-800 text-[11px] text-neutral-400">
                Recipients: {pendingDispatchPayload.to.join(', ')}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setPendingDispatchPayload(null)}
                className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono transition cursor-pointer"
              >
                Cancel & Review
              </button>
              <button
                onClick={handleConfirmExecuteSend}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-semibold transition cursor-pointer shadow-lg shadow-cyan-600/30"
              >
                <Send className="w-3.5 h-3.5" />
                Confirm & Send via Gmail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Operations Manager Modal */}
      {showAddManagerModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-md w-full p-6 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-cyan-400" />
                Register Courier Operations Manager
              </h3>
              <button
                onClick={() => setShowAddManagerModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddManager} className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-neutral-400 mb-1">Full Name:</label>
                <input
                  type="text"
                  required
                  value={newManagerForm.name}
                  onChange={(e) => setNewManagerForm({ ...newManagerForm, name: e.target.value })}
                  placeholder="e.g. Jordan Miller"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Email Address:</label>
                <input
                  type="email"
                  required
                  value={newManagerForm.email}
                  onChange={(e) => setNewManagerForm({ ...newManagerForm, email: e.target.value })}
                  placeholder="e.g. jordan.miller@example.com"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Operational Role Title:</label>
                <input
                  type="text"
                  value={newManagerForm.title}
                  onChange={(e) => setNewManagerForm({ ...newManagerForm, title: e.target.value })}
                  placeholder="e.g. Senior Dispatch Controller"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-neutral-400 mb-1">Duty Shift:</label>
                  <select
                    value={newManagerForm.shift}
                    onChange={(e) => setNewManagerForm({ ...newManagerForm, shift: e.target.value as any })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="MORNING">Morning (06:00 - 14:00)</option>
                    <option value="AFTERNOON">Afternoon (14:00 - 22:00)</option>
                    <option value="NIGHT">Night (22:00 - 06:00)</option>
                    <option value="24_7">24/7 On-Call</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1">Initial Status:</label>
                  <select
                    value={newManagerForm.status}
                    onChange={(e) => setNewManagerForm({ ...newManagerForm, status: e.target.value as any })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="ON_DUTY">On Duty</option>
                    <option value="ACTIVE">Active</option>
                    <option value="STANDBY">Standby</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowAddManagerModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition cursor-pointer"
                >
                  Register Manager
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
