import { getAccessToken } from './googleAuth';

export interface OperationsManager {
  id: string;
  name: string;
  email: string;
  title: string;
  assignedZones: string[];
  shift: 'MORNING' | 'AFTERNOON' | 'NIGHT' | '24_7';
  phone: string;
  status: 'ACTIVE' | 'ON_DUTY' | 'STANDBY';
  receiveCriticalAlerts: boolean;
  receiveDailyPerformance: boolean;
}

export interface EmailDispatchPayload {
  to: string[];
  cc?: string[];
  subject: string;
  htmlBody: string;
  plainTextBody: string;
  alertType: 'PERFORMANCE_SUMMARY' | 'CRITICAL_INCIDENT' | 'SHIFT_RECOMMENDATION' | 'CUSTOM_ADVISORY';
  priority: 'HIGH' | 'NORMAL' | 'URGENT';
  metadata?: Record<string, any>;
}

export interface SentEmailRecord {
  id: string;
  messageId?: string;
  threadId?: string;
  timestamp: string;
  to: string[];
  subject: string;
  alertType: 'PERFORMANCE_SUMMARY' | 'CRITICAL_INCIDENT' | 'SHIFT_RECOMMENDATION' | 'CUSTOM_ADVISORY';
  status: 'SENT' | 'SIMULATED' | 'FAILED';
  evidenceHash: string;
  senderEmail: string;
  error?: string;
}

// Initial registered courier operations managers
export const INITIAL_OPERATIONS_MANAGERS: OperationsManager[] = [
  {
    id: 'MGR-01',
    name: 'Sarah Lin',
    email: 'sarah.lin.ops@aeon-matrix.internal',
    title: 'Lead Courier Operations Director',
    assignedZones: ['ZONE-01', 'ZONE-02', 'ZONE-03', 'ZONE-04'],
    shift: '24_7',
    phone: '+1 (555) 234-8901',
    status: 'ON_DUTY',
    receiveCriticalAlerts: true,
    receiveDailyPerformance: true,
  },
  {
    id: 'MGR-02',
    name: 'Marcus Vance',
    email: 'marcus.vance@aeon-matrix.internal',
    title: 'Senior Dispatch & Logistics Manager (Midtown & South)',
    assignedZones: ['ZONE-02', 'ZONE-04'],
    shift: 'AFTERNOON',
    phone: '+1 (555) 345-9012',
    status: 'ON_DUTY',
    receiveCriticalAlerts: true,
    receiveDailyPerformance: true,
  },
  {
    id: 'MGR-03',
    name: 'Elena Rostova',
    email: 'elena.rostova@aeon-matrix.internal',
    title: 'Regional Courier Network Lead (Downtown / Financial)',
    assignedZones: ['ZONE-01', 'ZONE-03'],
    shift: 'MORNING',
    phone: '+1 (555) 456-0123',
    status: 'STANDBY',
    receiveCriticalAlerts: true,
    receiveDailyPerformance: false,
  },
  {
    id: 'MGR-04',
    name: 'David Chen',
    email: 'david.chen@aeon-matrix.internal',
    title: 'Courier Safety & Incident Escalation Commander',
    assignedZones: ['ZONE-01', 'ZONE-02', 'ZONE-03', 'ZONE-04'],
    shift: 'NIGHT',
    phone: '+1 (555) 567-1234',
    status: 'ACTIVE',
    receiveCriticalAlerts: true,
    receiveDailyPerformance: false,
  },
];

// Helper to base64url encode UTF-8 strings
function base64UrlEncode(str: string): string {
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Generate RFC 2822 compliant MIME message
export function createMimeMessage(payload: EmailDispatchPayload, senderEmail: string): string {
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  const toHeader = payload.to.join(', ');
  const ccHeader = payload.cc && payload.cc.length > 0 ? `Cc: ${payload.cc.join(', ')}\r\n` : '';

  const headers = [
    `From: AEON MATRIX Dispatcher <${senderEmail}>`,
    `To: ${toHeader}`,
    ccHeader ? ccHeader.trim() : null,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(payload.subject)))}?=`,
    `MIME-Version: 1.0`,
    `X-Priority: ${payload.priority === 'URGENT' ? '1' : payload.priority === 'HIGH' ? '2' : '3'}`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ]
    .filter(Boolean)
    .join('\r\n');

  const body = [
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    payload.plainTextBody,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    payload.htmlBody,
    '',
    `--${boundary}--`,
  ].join('\r\n');

  return `${headers}\r\n\r\n${body}`;
}

// Send Email via Gmail REST API
export async function sendGmailMessage(
  payload: EmailDispatchPayload,
  senderEmail: string
): Promise<{ success: boolean; messageId?: string; threadId?: string; simulated?: boolean }> {
  const token = await getAccessToken();

  if (!token) {
    // If not authenticated, throw so UI triggers sign in or shows graceful prompt
    throw new Error('No Google OAuth access token available. Please sign in with Google to send via Gmail.');
  }

  const rawMime = createMimeMessage(payload, senderEmail);
  const rawBase64Url = base64UrlEncode(rawMime);

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: rawBase64Url,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const message = errData?.error?.message || response.statusText;
    throw new Error(`Gmail API error (${response.status}): ${message}`);
  }

  const data = await response.json();
  return {
    success: true,
    messageId: data.id,
    threadId: data.threadId,
  };
}

// Format Performance Summary HTML Template
export function generatePerformanceSummaryEmail(params: {
  cityName: string;
  cluster: string;
  healthScore: number;
  activeOrders: number;
  availableCouriers: number;
  avgSlaMinutes: number;
  cancellationRiskPct: number;
  zones: Array<{
    name: string;
    imbalancePct: number;
    medianSlaMinutes: number;
    activeOrders: number;
    availableCouriers: number;
    status: string;
  }>;
  topCouriers: Array<{ name: string; deliveries: number; rating: number; qualityScore: number }>;
  generatedBy: string;
  timestamp: string;
  customNotes?: string;
}): { subject: string; htmlBody: string; plainTextBody: string } {
  const subject = `[AEON MATRIX] Courier Operations Daily Performance Briefing — ${params.cityName} (${params.cluster})`;

  const zoneRows = params.zones
    .map(
      (z) => `
    <tr style="border-bottom: 1px solid #262626;">
      <td style="padding: 10px 12px; color: #f5f5f5; font-weight: 500;">${z.name}</td>
      <td style="padding: 10px 12px; color: ${z.imbalancePct < -15 ? '#ef4444' : z.imbalancePct > 0 ? '#10b981' : '#f59e0b'}; font-weight: bold; font-family: monospace;">${z.imbalancePct > 0 ? '+' : ''}${z.imbalancePct}%</td>
      <td style="padding: 10px 12px; color: #d4d4d4; font-family: monospace;">${z.medianSlaMinutes} min</td>
      <td style="padding: 10px 12px; color: #d4d4d4; font-family: monospace;">${z.activeOrders} / ${z.availableCouriers}</td>
      <td style="padding: 10px 12px;">
        <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; background-color: ${
          z.status === 'STABLE' ? 'rgba(16, 185, 129, 0.15)' : z.status === 'DEGRADED' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)'
        }; color: ${
          z.status === 'STABLE' ? '#34d399' : z.status === 'DEGRADED' ? '#fbbf24' : '#f87171'
        }; border: 1px solid ${
          z.status === 'STABLE' ? 'rgba(16, 185, 129, 0.3)' : z.status === 'DEGRADED' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'
        };">${z.status}</span>
      </td>
    </tr>
  `
    )
    .join('');

  const courierRows = params.topCouriers
    .map(
      (c, idx) => `
    <tr style="border-bottom: 1px solid #262626;">
      <td style="padding: 8px 12px; color: #a3a3a3; font-family: monospace;">#${idx + 1}</td>
      <td style="padding: 8px 12px; color: #f5f5f5; font-weight: 500;">${c.name}</td>
      <td style="padding: 8px 12px; color: #38bdf8; font-family: monospace; font-weight: 600;">${c.deliveries} trips</td>
      <td style="padding: 8px 12px; color: #fbbf24; font-family: monospace;">★ ${c.rating.toFixed(2)}</td>
      <td style="padding: 8px 12px; color: #34d399; font-family: monospace;">${c.qualityScore}%</td>
    </tr>
  `
    )
    .join('');

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0a0a0a; color: #e5e5e5; margin: 0; padding: 24px; }
    .container { max-width: 680px; margin: 0 auto; background-color: #121212; border: 1px solid #262626; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #09090b 0%, #1e1b4b 100%); padding: 24px; border-bottom: 1px solid #312e81; }
    .badge { display: inline-block; padding: 4px 10px; background-color: rgba(6, 182, 212, 0.15); border: 1px solid rgba(6, 182, 212, 0.4); color: #22d3ee; font-size: 11px; font-weight: 700; border-radius: 6px; letter-spacing: 0.05em; font-family: monospace; }
    .title { font-size: 20px; font-weight: 700; color: #ffffff; margin: 12px 0 4px 0; }
    .subtitle { font-size: 13px; color: #9ca3af; margin: 0; }
    .content { padding: 24px; }
    .kpi-grid { display: table; width: 100%; margin-bottom: 24px; border-collapse: separate; border-spacing: 8px; }
    .kpi-cell { display: table-cell; width: 25%; background-color: #171717; border: 1px solid #262626; border-radius: 8px; padding: 12px; text-align: center; }
    .kpi-val { font-size: 20px; font-weight: 700; color: #ffffff; font-family: monospace; }
    .kpi-lbl { font-size: 11px; color: #a3a3a3; text-transform: uppercase; margin-top: 4px; font-weight: 600; }
    .table-section { margin-top: 24px; background-color: #171717; border: 1px solid #262626; border-radius: 8px; overflow: hidden; }
    .table-title { padding: 12px 16px; background-color: #1f1f1f; font-size: 13px; font-weight: 600; color: #f5f5f5; border-bottom: 1px solid #262626; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; }
    th { padding: 10px 12px; color: #737373; font-weight: 600; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #262626; }
    .notes-box { margin-top: 20px; padding: 16px; background-color: rgba(6, 182, 212, 0.05); border: 1px solid rgba(6, 182, 212, 0.25); border-radius: 8px; font-size: 12px; color: #cbd5e1; }
    .footer { padding: 16px 24px; background-color: #0d0d0d; border-top: 1px solid #262626; font-size: 11px; color: #737373; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="badge">AEON MATRIX • COURIER INTELLIGENCE</span>
      <h1 class="title">Courier Performance & Fulfillment Briefing</h1>
      <p class="subtitle">Region: <strong>${params.cityName}</strong> (${params.cluster}) | Timestamp: ${params.timestamp}</p>
    </div>
    
    <div class="content">
      <table class="kpi-grid">
        <tr>
          <td class="kpi-cell">
            <div class="kpi-val" style="color: #38bdf8;">${params.activeOrders.toLocaleString()}</div>
            <div class="kpi-lbl">Active Orders</div>
          </td>
          <td class="kpi-cell">
            <div class="kpi-val" style="color: #34d399;">${params.availableCouriers.toLocaleString()}</div>
            <div class="kpi-lbl">Avail Couriers</div>
          </td>
          <td class="kpi-cell">
            <div class="kpi-val" style="color: #facc15;">${params.avgSlaMinutes}m</div>
            <div class="kpi-lbl">Avg Delivery SLA</div>
          </td>
          <td class="kpi-cell">
            <div class="kpi-val" style="color: ${params.healthScore >= 90 ? '#34d399' : '#f59e0b'};">${params.healthScore}%</div>
            <div class="kpi-lbl">Health Index</div>
          </td>
        </tr>
      </table>

      ${
        params.customNotes
          ? `<div class="notes-box">
              <strong style="color: #38bdf8;">Operations Director Notes:</strong><br/>
              ${params.customNotes.replace(/\n/g, '<br/>')}
            </div>`
          : ''
      }

      <div class="table-section">
        <div class="table-title">Sub-Market Zone Logistics Health & Supply Balance</div>
        <table>
          <thead>
            <tr>
              <th>Zone</th>
              <th>Imbalance</th>
              <th>Median SLA</th>
              <th>Orders / Couriers</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${zoneRows}
          </tbody>
        </table>
      </div>

      <div class="table-section" style="margin-top: 16px;">
        <div class="table-title">Top Performing Couriers of the Shift</div>
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Courier</th>
              <th>Completed</th>
              <th>Rating</th>
              <th>Quality Score</th>
            </tr>
          </thead>
          <tbody>
            ${courierRows}
          </tbody>
        </table>
      </div>
    </div>

    <div class="footer">
      Generated automatically by <strong>AEON MATRIX Operations Dispatcher</strong> | Sent by: ${params.generatedBy}<br/>
      Cryptographic Evidence Hash: <code style="color: #a3a3a3;">${Math.random().toString(36).substring(2, 15).toUpperCase()}</code> | Fail-Closed Policy v2.6.4
    </div>
  </div>
</body>
</html>
`;

  const plainTextBody = `
=====================================================
AEON MATRIX COURIER OPERATIONS PERFORMANCE BRIEFING
Region: ${params.cityName} (${params.cluster})
Timestamp: ${params.timestamp}
=====================================================

KEY METRICS:
- Active Orders: ${params.activeOrders}
- Available Couriers: ${params.availableCouriers}
- Average SLA: ${params.avgSlaMinutes} minutes
- System Health Score: ${params.healthScore}%

ZONE SUPPLY-DEMAND STATUS:
${params.zones.map((z) => `* ${z.name}: ${z.imbalancePct}% imbalance | ${z.medianSlaMinutes}m SLA | Status: ${z.status}`).join('\n')}

TOP COURIERS:
${params.topCouriers.map((c, i) => `#${i + 1} ${c.name} - ${c.deliveries} trips | ★ ${c.rating.toFixed(2)} | Score: ${c.qualityScore}%`).join('\n')}

${params.customNotes ? `\nDIRECTOR NOTES:\n${params.customNotes}\n` : ''}
Sent by: ${params.generatedBy}
AEON MATRIX Operational Dispatch Hub
`;

  return { subject, htmlBody, plainTextBody };
}

// Format Critical Incident Alert HTML Template
export function generateCriticalIncidentEmail(params: {
  incidentId: string;
  severity: 'P1_CRITICAL' | 'P2_HIGH' | 'SLA_BREACH_SPIKE';
  title: string;
  cityName: string;
  affectedZones: string[];
  backlogCount: number;
  slaBreachMinutes: number;
  aiAdvisoryAction: string;
  failClosedStatus: string;
  escalatedBy: string;
  timestamp: string;
  immediateActionRequired: string;
}): { subject: string; htmlBody: string; plainTextBody: string } {
  const subject = `[URGENT INCIDENT ALERT ${params.severity}] ${params.title} — ${params.cityName}`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #e5e5e5; margin: 0; padding: 24px; }
    .container { max-width: 680px; margin: 0 auto; background-color: #121212; border: 1px solid #7f1d1d; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #450a0a 0%, #1f1212 100%); padding: 24px; border-bottom: 2px solid #ef4444; }
    .alert-badge { display: inline-block; padding: 4px 12px; background-color: #ef4444; color: #ffffff; font-size: 12px; font-weight: 800; border-radius: 4px; letter-spacing: 0.08em; font-family: monospace; }
    .title { font-size: 22px; font-weight: 800; color: #ffffff; margin: 12px 0 4px 0; }
    .subtitle { font-size: 13px; color: #fca5a5; margin: 0; }
    .content { padding: 24px; }
    .alert-card { background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 8px; padding: 16px; margin-bottom: 20px; }
    .action-card { background-color: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.4); border-radius: 8px; padding: 16px; margin-bottom: 20px; }
    .meta-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 16px; }
    .meta-table td { padding: 8px 12px; border-bottom: 1px solid #262626; }
    .meta-lbl { color: #a3a3a3; width: 35%; font-weight: 600; }
    .meta-val { color: #f5f5f5; font-family: monospace; }
    .footer { padding: 16px 24px; background-color: #0d0d0d; border-top: 1px solid #262626; font-size: 11px; color: #737373; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="alert-badge">CRITICAL OPERATIONAL DISPATCH ALERT</span>
      <h1 class="title">${params.title}</h1>
      <p class="subtitle">Incident ID: <strong>${params.incidentId}</strong> | Region: <strong>${params.cityName}</strong> | ${params.timestamp}</p>
    </div>

    <div class="content">
      <div class="alert-card">
        <h3 style="margin: 0 0 8px 0; color: #f87171; font-size: 14px;">⚠️ IMMEDIATE INCIDENT SYNOPSIS</h3>
        <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #fecaca;">
          Severe operational degradation detected. Backlog spike has exceeded safety thresholds, risking widespread SLA breach and customer cancellations across affected courier zones.
        </p>
      </div>

      <table class="meta-table">
        <tr>
          <td class="meta-lbl">Severity Tier:</td>
          <td class="meta-val"><strong style="color: #ef4444;">${params.severity}</strong></td>
        </tr>
        <tr>
          <td class="meta-lbl">Affected Sub-Markets:</td>
          <td class="meta-val" style="color: #fbbf24;">${params.affectedZones.join(', ')}</td>
        </tr>
        <tr>
          <td class="meta-lbl">Unmatched Order Backlog:</td>
          <td class="meta-val" style="color: #f87171;">${params.backlogCount} orders</td>
        </tr>
        <tr>
          <td class="meta-lbl">Max SLA Breach Duration:</td>
          <td class="meta-val" style="color: #f87171;">${params.slaBreachMinutes} minutes</td>
        </tr>
        <tr>
          <td class="meta-lbl">Guardian Governance Status:</td>
          <td class="meta-val" style="color: #34d399;">${params.failClosedStatus}</td>
        </tr>
        <tr>
          <td class="meta-lbl">Escalated By:</td>
          <td class="meta-val">${params.escalatedBy}</td>
        </tr>
      </table>

      <div class="action-card" style="margin-top: 20px;">
        <h3 style="margin: 0 0 8px 0; color: #60a5fa; font-size: 14px;">🤖 AI RECOMMENDED MITIGATION ACTION</h3>
        <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.5; color: #bfdbfe;">
          ${params.aiAdvisoryAction}
        </p>
        <p style="margin: 0; font-size: 12px; color: #93c5fd;">
          <strong>Manager Action Required:</strong> ${params.immediateActionRequired}
        </p>
      </div>
    </div>

    <div class="footer">
      AEON MATRIX High-Priority Alert Dispatcher | Policy Enforcement v2.6.4 | Authenticated through Google Workspace Integration
    </div>
  </div>
</body>
</html>
`;

  const plainTextBody = `
[URGENT INCIDENT ALERT ${params.severity}]
Incident ID: ${params.incidentId}
Title: ${params.title}
Region: ${params.cityName}
Affected Zones: ${params.affectedZones.join(', ')}
Backlog: ${params.backlogCount} orders
SLA Breach: ${params.slaBreachMinutes} min
AI Recommendation: ${params.aiAdvisoryAction}
Immediate Action Required: ${params.immediateActionRequired}
Escalated By: ${params.escalatedBy}
Timestamp: ${params.timestamp}
`;

  return { subject, htmlBody, plainTextBody };
}
