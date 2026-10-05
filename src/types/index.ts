export type MarketplaceStatus = 'STABLE' | 'DEGRADED' | 'CRITICAL';

export interface SubMarketZone {
  id: string;
  name: string;
  demandReqMin: number;
  availableCouriers: number;
  imbalancePct: number;
  medianSlaMinutes: number;
  cancellationRiskPct: number;
  status: MarketplaceStatus;
  activeOrders: number;
  unmatchedBacklog: number;
  coordinates: { x: number; y: number };
}

export interface CityMarketplace {
  cityId: string;
  cityName: string;
  region: string;
  cluster: string;
  healthScore: number;
  activeOrders: number;
  availableCouriers: number;
  unmatchedBacklog: number;
  avgSlaMinutes: number;
  cancellationRiskPct: number;
  incidents: { p1: number; p2: number };
  zones: SubMarketZone[];
}

export type OrderFsmStatus =
  | 'ORDER_CREATED'
  | 'INVENTORY_CONFIRMED'
  | 'PICKING'
  | 'PACKED'
  | 'COURIER_REQUESTED'
  | 'COURIER_ASSIGNED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'ORDER_CANCELLED'
  | 'DISPATCH_RETRY_FALLBACK'
  | 'RETURN_TO_BASE_TRIGGERED';

export interface FulfillmentStepInfo {
  status: OrderFsmStatus;
  label: string;
  system: string;
  description: string;
  timestamp: string;
  telemetryPayload: Record<string, any>;
}

export interface IntegrationConnector {
  id: string;
  name: string;
  category: 'OMS' | 'WMS' | 'TMS' | 'Merchant' | 'DeliveryAPI' | 'EventBus' | 'Notification';
  protocol: string;
  slaP99: string;
  idempotencyEnforced: boolean;
  retryPolicy: string;
  health: 'HEALTHY' | 'DEGRADED' | 'OFFLINE';
  description: string;
}

export interface DeliveryStop {
  id: string;
  orderId: string;
  customer: string;
  address: string;
  coordinates: { x: number; y: number };
  weightKg: number;
  volumeM3: number;
  timeWindow: string;
  isHardWindow: boolean;
  priority: 'VIP' | 'STANDARD' | 'LOW';
  constraints: string[];
  cargoPosition: 'REAR_ACCESSIBLE' | 'MID_SECURE' | 'BASE_DECK' | 'UPPER_DECK';
  etaMinutes: number;
  distanceKm: number;
  slaRisk: number;
}

export interface RouteOptimizationResult {
  routeAdvisoryId: string;
  vehicleId: string;
  vehicleType: string;
  stops: DeliveryStop[];
  totalDistanceKm: number;
  projectedDurationMin: number;
  volumetricUtilizationPct: number;
  weightUtilizationPct: number;
  slaBreachProbability: number;
  advisoryJustifications: string[];
  evidenceHash: string;
}

export type RiskTier = 'LOW' | 'MEDIUM' | 'HIGH';

export interface AuditRecord {
  auditEventId: string;
  requestId: string;
  timestampIso: string;
  evidenceHash: string;
  policyVersion: string;
  riskTier: RiskTier;
  aiRecommendation: {
    action: string;
    orderCount: number;
    sourceZone: string;
    targetZone: string;
    details: string;
  };
  humanDecision: {
    action: 'APPROVED' | 'REJECTED' | 'MODIFIED_APPROVED' | 'AWAITING';
    approverId?: string;
    timestampIso?: string;
    note?: string;
  };
  executionStatus: 'PENDING_APPROVAL' | 'COMMITTED_TO_DISPATCH_SERVICE' | 'REJECTED_DROPPED' | 'FAIL_CLOSED_BLOCKED';
  cryptographicSignature?: string;
}

export interface ArchitectureComponent {
  id: string;
  name: string;
  layer: 'CONTROL_TOWER' | 'API_GATEWAY' | 'CORE_SERVICES' | 'EVENT_STREAMING' | 'AI_AGENT' | 'GOVERNANCE' | 'PERSISTENCE' | 'EXTERNAL';
  type: string;
  protocols: string[];
  slaTarget: string;
  resilienceMechanisms: string[];
  dataContracts: string;
  description: string;
  failureMode: string;
}

// --- Dynamic Pricing System Types ---
export type SurgeCategory = 'OFF_PEAK_DISCOUNT' | 'NORMAL' | 'SURGE_MODERATE' | 'SURGE_PEAK' | 'CEILING_CAPPED';

export interface DynamicPricingQuote {
  quoteId: string;
  orderId: string;
  zoneId: string;
  zoneName: string;
  timestamp: string;
  baseFareUsd: number;
  distanceKm: number;
  distanceRateUsdPerKm: number;
  distanceFareUsd: number;
  demandIndex: number; // e.g. 1.35
  courierDeficitIndex: number; // e.g. 0.72
  rawSurgeMultiplier: number; // calculated multiplier
  appliedMultiplier: number; // after price ceiling capping
  surgeCategory: SurgeCategory;
  surgeAmountUsd: number;
  subtotalFareUsd: number;
  totalPriceUsd: number;
  courierEarningsUsd: number;
  marketplaceTakeUsd: number;
  priceCeilingCapped: boolean;
  policyRef: string;
  evidenceHash: string;
}

export interface PricingAuditLog {
  auditId: string;
  quoteId: string;
  zoneId: string;
  timestamp: string;
  demandRate: number;
  couriersAvail: number;
  imbalancePct: number;
  surgeMultiplier: number;
  totalCustomerPrice: number;
  courierSharePct: number;
  policyVersion: string;
  evidenceHash: string;
  guardianCompliance: 'COMPLIANT' | 'CEILING_ENFORCED' | 'FAIL_CLOSED_BLOCKED';
}

// --- Customer Feedback & Quality Assurance Types ---
export interface CustomerFeedback {
  feedbackId: string;
  orderId: string;
  courierId: string;
  courierName: string;
  customerName: string;
  rating: number; // 1 to 5
  tags: string[];
  comment?: string;
  timestamp: string;
  slaMet: boolean;
  flaggedForReview: boolean;
  resolutionStatus: 'NONE' | 'REVIEW_PENDING' | 'COACHED' | 'DISMISSED';
}

export interface CourierProfile {
  courierId: string;
  name: string;
  avatarInitials: string;
  vehicleType: string;
  totalDeliveries: number;
  averageRating: number;
  ratingDistribution: { [stars: number]: number };
  recentFeedbackIds: string[];
  status: 'ACTIVE' | 'FLAGGED_FOR_COACHING' | 'SUSPENDED_REVIEW';
  flagReason?: string;
  qualityScorePct: number;
}
