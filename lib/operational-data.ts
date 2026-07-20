// Shared operational data generation — used by atlas-editor (node creation) and
// data-detail-panel (project switcher).

export type ProjectId = "nike" | "google" | "deloitte" | "levis" | "patagonia";

export const PROJECTS: { id: ProjectId; name: string; color: string }[] = [
  { id: "nike",      name: "Nike Running",        color: "#3a6bb5" },
  { id: "google",    name: "Google Brand Sprint",  color: "#2e8b57" },
  { id: "deloitte",  name: "Deloitte Digital",     color: "#c27030" },
  { id: "levis",     name: "Levi's Identity",      color: "#8b3a8b" },
  { id: "patagonia", name: "Patagonia Social",     color: "#2e6b4f" },
];

export const STUDIO_TEAM = [
  { id: "m1", name: "Alex Rivera",  email: "alex@ideate.com",   initials: "AR", role: "Creative Director" },
  { id: "m2", name: "Jordan Kim",   email: "jordan@ideate.com", initials: "JK", role: "Senior Designer" },
  { id: "m3", name: "Sam Torres",   email: "sam@ideate.com",    initials: "ST", role: "Motion Designer" },
  { id: "m4", name: "Casey Morgan", email: "casey@ideate.com",  initials: "CM", role: "Strategist" },
  { id: "m5", name: "Riley Chen",   email: "riley@ideate.com",  initials: "RC", role: "Designer" },
] as const;

export const PROJECT_DATA: Record<ProjectId, {
  margin: number; budgetH: number; loggedH: number; consumed: number;
  phase: string; touchpoint: number; revisions: number; feedbackCycles: number;
  memberIds: string[];
}> = {
  nike:      { margin: 38, budgetH: 120, loggedH: 30,  consumed: 25, phase: "design",   touchpoint: 2, revisions: 4, feedbackCycles: 2, memberIds: ["m1","m3"] },
  google:    { margin: 44, budgetH: 80,  loggedH: 26,  consumed: 33, phase: "research", touchpoint: 1, revisions: 2, feedbackCycles: 1, memberIds: ["m1","m2","m4"] },
  deloitte:  { margin: 29, budgetH: 60,  loggedH: 40,  consumed: 67, phase: "concept",  touchpoint: 4, revisions: 6, feedbackCycles: 3, memberIds: ["m1","m3","m4","m5"] },
  levis:     { margin: 41, budgetH: 90,  loggedH: 22,  consumed: 24, phase: "strategy", touchpoint: 3, revisions: 3, feedbackCycles: 2, memberIds: ["m2","m4","m5"] },
  patagonia: { margin: 35, budgetH: 50,  loggedH: 20,  consumed: 40, phase: "design",   touchpoint: 2, revisions: 3, feedbackCycles: 2, memberIds: ["m2","m5"] },
};

const UTIL_MAP: Record<string, {
  util: number; bill: number; avail: number; alloc: number; planned: number; bench: number;
  skills: string[]; risk: "clear" | "warning" | "critical";
  projects: { projectName: string; allocationPct: number; color: string }[];
}> = {
  m1: { util: 91, bill: 36, avail: 40, alloc: 95, planned: 85, bench: 0,  risk: "critical", skills: ["Brand Strategy", "Visual Design"],
    projects: [{ projectName: "Google Brand Sprint", allocationPct: 60, color: "#3b82f6" }, { projectName: "Nike Campaign", allocationPct: 35, color: "#8b5cf6" }] },
  m2: { util: 84, bill: 34, avail: 40, alloc: 87, planned: 85, bench: 5,  risk: "warning",  skills: ["UI Design", "Motion"],
    projects: [{ projectName: "Nike Campaign", allocationPct: 50, color: "#8b5cf6" }, { projectName: "Internal Rebrand", allocationPct: 37, color: "#f59e0b" }] },
  m3: { util: 86, bill: 34, avail: 40, alloc: 89, planned: 85, bench: 3,  risk: "warning",  skills: ["Motion Design", "After Effects"],
    projects: [{ projectName: "Google Brand Sprint", allocationPct: 55, color: "#3b82f6" }, { projectName: "Pitch Deck", allocationPct: 31, color: "#10b981" }] },
  m4: { util: 62, bill: 25, avail: 40, alloc: 65, planned: 80, bench: 14, risk: "clear",    skills: ["Strategy", "Research"],
    projects: [{ projectName: "Internal Rebrand", allocationPct: 45, color: "#f59e0b" }, { projectName: "Pitch Deck", allocationPct: 20, color: "#10b981" }] },
  m5: { util: 45, bill: 18, avail: 40, alloc: 50, planned: 80, bench: 22, risk: "clear",    skills: ["UI Design", "Branding"],
    projects: [{ projectName: "Pitch Deck", allocationPct: 50, color: "#10b981" }] },
};

type ProjectPhase = "strategy" | "research" | "concept" | "concepting" | "design" | "delivery";

export function generateCapacityData(projectId: ProjectId, projectName: string) {
  const proj = PROJECT_DATA[projectId];
  const members = STUDIO_TEAM.filter(m => proj.memberIds.includes(m.id));
  return {
    label: `${projectName} · Capacity & Resourcing`,
    projectId,
    teamMembers: members.map(m => ({
      member: { id: m.id, name: m.name, email: m.email, initials: m.initials, role: m.role },
      utilizationRate:   UTIL_MAP[m.id]?.util ?? 75,
      billableHours:     UTIL_MAP[m.id]?.bill ?? 30,
      availableHours:    UTIL_MAP[m.id]?.avail ?? 40,
      currentAllocation: UTIL_MAP[m.id]?.alloc ?? 75,
      plannedAllocation: UTIL_MAP[m.id]?.planned ?? 85,
      benchTime:         UTIL_MAP[m.id]?.bench ?? 10,
      skills:            UTIL_MAP[m.id]?.skills ?? [],
      projectAllocations:UTIL_MAP[m.id]?.projects ?? [],
      overloadRisk:      UTIL_MAP[m.id]?.risk ?? "clear",
    })),
    lastUpdated: "just now",
  };
}

export function generateFinancialData(projectId: ProjectId, projectName: string) {
  const proj = PROJECT_DATA[projectId];
  const isAtRisk = proj.consumed > 70 && proj.margin < 28;
  const hoursLogged    = Math.round(proj.consumed * 4.8);
  const hoursEstimated = 480;
  const revenue    = Math.round(proj.margin > 30 ? 148000 : 112000);
  const costToDate = Math.round(revenue * (proj.margin >= 35 ? 0.58 : 0.68));
  const grossMarginPct = proj.margin;
  const effBill = Math.round(revenue / hoursEstimated);
  const effCost = Math.round(costToDate / hoursLogged);
  return {
    label: `${projectName} · Financial Performance`,
    projectId,
    scope: "project" as const,
    billingType: "flat_fee" as const,
    currency: "USD",
    viewRole: "owner" as const,
    status: isAtRisk ? "at-risk" : "healthy",
    lastUpdated: "just now",
    revenue,
    costToDate,
    grossMarginPct,
    projectedMarginPct: Math.max(grossMarginPct - 3, 10),
    hoursLogged,
    hoursEstimated,
    effectiveBillRate: effBill,
    effectiveCostRate: effCost,
    rateEfficiencyRatio: Math.round((effBill / effCost) * 100) / 100,
    teamBreakdown: [
      { name: "K. Laurent", initials: "KL", role: "Senior",  hoursLogged: 89,  billRate: 225, costRate: 140 },
      { name: "M. Torres",  initials: "MT", role: "Mid",     hoursLogged: 124, billRate: 185, costRate: 110 },
      { name: "J. Park",    initials: "JP", role: "Junior",  hoursLogged: 127, billRate: 150, costRate: 85  },
    ],
    scopeVariance:    -4800,
    staffingVariance:  2200,
    totalVariance:    -2600,
    projectMargin:             grossMarginPct,
    budgetConsumed:            proj.consumed,
    revenueRealized:           Math.round(proj.consumed * 0.92),
    blendedRateEfficiency:     proj.margin >= 35 ? 94 : 82,
    utilizationAdjustedMargin: Math.round(proj.margin * 0.87),
  };
}

export function generateProjectHealthData(projectId: ProjectId, projectName: string) {
  const proj = PROJECT_DATA[projectId];
  return {
    label: `${projectName} · Project Health`,
    projectId,
    viewRole: "owner" as const,
    daysSinceClientTouchpoint: proj.touchpoint,
    lastTouchpointType:        "meeting" as const,
    lastTouchpointSource:      "calendar" as const,
    touchpointLog: [
      { date: "Jun 26", type: "meeting" as const,              source: "calendar" as const,          notes: "Alignment call — client happy with direction" },
      { date: "Jun 22", type: "platform_interaction" as const,  source: "client_experience" as const, notes: "Approved logo mark v3" },
      { date: "Jun 18", type: "manual_log" as const,           source: "manual_log" as const,        notes: "Slack thread on color palette" },
    ],
    openFeedbackCycles: proj.feedbackCycles,
    feedbackCycles: [
      { id: "fc1", nodeLabel: "Brand Guidelines", daysOpen: 5, lastClientAction: "Requested changes", status: "awaiting_revision" as const },
    ],
    revisionCount:       proj.revisions,
    expectedRevisionMin: 2,
    expectedRevisionMax: 3,
    projectPhase:        proj.phase as ProjectPhase,
    healthStatus:        proj.consumed > 60 && proj.margin < 32 ? "needs-attention" as const : "on-track" as const,
    lastUpdated:         "just now",
  };
}

// Per-project pipeline data: own follow-on opportunities + competing projects
// that draw from the same team members.
const PIPELINE_DATA: Record<ProjectId, {
  forecast30Days: { projectName: string; probability: number; estimatedHours: number }[];
  forecast60Days: { projectName: string; probability: number; estimatedHours: number }[];
  forecast90Days: { projectName: string; probability: number; estimatedHours: number }[];
  teamCapacity: number;    // available hours from project's assigned members
  projectedLoad: number;
  competingProjects: { projectName: string; teamOverlap: string[]; impactLevel: "low" | "medium" | "high"; hours: number }[];
}> = {
  nike: {
    forecast30Days: [
      { projectName: "Nike Phase 2 — App Redesign",   probability: 84, estimatedHours: 80 },
      { projectName: "Nike Holiday Campaign",           probability: 71, estimatedHours: 60 },
    ],
    forecast60Days: [
      { projectName: "Nike Global Brand Refresh",       probability: 52, estimatedHours: 140 },
    ],
    forecast90Days: [
      { projectName: "Nike Annual Report 2026",         probability: 28, estimatedHours: 90 },
    ],
    teamCapacity: 160, projectedLoad: 140,
    competingProjects: [
      { projectName: "Google Brand Sprint",  teamOverlap: ["Alex Rivera"],   impactLevel: "high",   hours: 96 },
      { projectName: "Deloitte Digital",     teamOverlap: ["Sam Torres"],    impactLevel: "medium", hours: 64 },
    ],
  },
  google: {
    forecast30Days: [
      { projectName: "Google UX Research Phase 2",      probability: 88, estimatedHours: 70 },
    ],
    forecast60Days: [
      { projectName: "Google Design System Extension",  probability: 61, estimatedHours: 120 },
      { projectName: "Google Workspace Rebrand",        probability: 45, estimatedHours: 90 },
    ],
    forecast90Days: [
      { projectName: "Google IO Campaign 2026",         probability: 33, estimatedHours: 180 },
    ],
    teamCapacity: 200, projectedLoad: 190,
    competingProjects: [
      { projectName: "Nike Running",         teamOverlap: ["Alex Rivera"],                    impactLevel: "high",   hours: 80 },
      { projectName: "Deloitte Digital",     teamOverlap: ["Alex Rivera", "Casey Morgan"],    impactLevel: "high",   hours: 96 },
      { projectName: "Levi's Identity",      teamOverlap: ["Jordan Kim", "Casey Morgan"],     impactLevel: "medium", hours: 72 },
    ],
  },
  deloitte: {
    forecast30Days: [
      { projectName: "Deloitte Annual Report 2025",     probability: 79, estimatedHours: 100 },
    ],
    forecast60Days: [
      { projectName: "Deloitte FinTech Rebrand",        probability: 55, estimatedHours: 160 },
    ],
    forecast90Days: [
      { projectName: "Deloitte Digital Academy",        probability: 30, estimatedHours: 200 },
      { projectName: "Deloitte ESG Report",             probability: 22, estimatedHours: 120 },
    ],
    teamCapacity: 240, projectedLoad: 260,
    competingProjects: [
      { projectName: "Google Brand Sprint",  teamOverlap: ["Alex Rivera"],                               impactLevel: "high",   hours: 96 },
      { projectName: "Nike Running",         teamOverlap: ["Alex Rivera", "Sam Torres"],                  impactLevel: "high",   hours: 80 },
      { projectName: "Levi's Identity",      teamOverlap: ["Casey Morgan", "Riley Chen"],                impactLevel: "medium", hours: 72 },
    ],
  },
  levis: {
    forecast30Days: [
      { projectName: "Levi's Europe Campaign",          probability: 76, estimatedHours: 85 },
      { projectName: "Levi's Sustainability Report",    probability: 68, estimatedHours: 50 },
    ],
    forecast60Days: [
      { projectName: "Levi's 501 Anniversary Campaign", probability: 44, estimatedHours: 130 },
    ],
    forecast90Days: [
      { projectName: "Levi's Global Retail Refresh",    probability: 25, estimatedHours: 160 },
    ],
    teamCapacity: 200, projectedLoad: 170,
    competingProjects: [
      { projectName: "Patagonia Social",     teamOverlap: ["Jordan Kim", "Riley Chen"],  impactLevel: "medium", hours: 60 },
      { projectName: "Google Brand Sprint",  teamOverlap: ["Casey Morgan"],             impactLevel: "low",    hours: 40 },
    ],
  },
  patagonia: {
    forecast30Days: [
      { projectName: "Patagonia Brand Guidelines",      probability: 82, estimatedHours: 60 },
    ],
    forecast60Days: [
      { projectName: "Patagonia Product Launch — Vest", probability: 58, estimatedHours: 80 },
    ],
    forecast90Days: [
      { projectName: "Patagonia Outdoor Campaign",      probability: 36, estimatedHours: 110 },
      { projectName: "Patagonia Annual Impact Report",  probability: 20, estimatedHours: 70 },
    ],
    teamCapacity: 120, projectedLoad: 100,
    competingProjects: [
      { projectName: "Levi's Identity",      teamOverlap: ["Jordan Kim", "Riley Chen"],  impactLevel: "medium", hours: 85 },
    ],
  },
};

export function generatePipelineData(projectId: ProjectId, projectName: string) {
  const d = PIPELINE_DATA[projectId];
  const forecasts = [...d.forecast30Days, ...d.forecast60Days, ...d.forecast90Days];
  const projectedLoad = forecasts.reduce((a, f) => a + f.estimatedHours, 0);
  const loadPct = Math.round((projectedLoad / d.teamCapacity) * 100);
  return {
    label: `${projectName} · Pipeline Forecast`,
    projectId,
    forecast30Days: d.forecast30Days,
    forecast60Days: d.forecast60Days,
    forecast90Days: d.forecast90Days,
    currentCapacity: d.teamCapacity,
    projectedLoad,
    capacityStatus: loadPct < 80 ? "available" : loadPct < 100 ? "balanced" : "overloaded",
    competingProjects: d.competingProjects,
    lastUpdated: "just now",
  } as const;
}

// Per-member health metrics on a given project
const MEMBER_HEALTH: Record<string, { onTime: number; blockers: number; healthScore: number; costRate: number }> = {
  m1: { onTime: 88, blockers: 1, healthScore: 76, costRate: 140 },
  m2: { onTime: 91, blockers: 0, healthScore: 84, costRate: 110 },
  m3: { onTime: 85, blockers: 1, healthScore: 79, costRate: 110 },
  m4: { onTime: 94, blockers: 0, healthScore: 89, costRate: 90  },
  m5: { onTime: 96, blockers: 0, healthScore: 92, costRate: 85  },
};

const TEAM_HEALTH_META: Record<ProjectId, {
  feedbackLoop: number; revisionRatio: number; timeSaved: number;
  trend: "improving" | "stable" | "declining"; healthScore: number; onTime: number; blockers: number; velocity: number[];
}> = {
  nike:      { feedbackLoop: 32, revisionRatio: 2.1, timeSaved: 18, trend: "improving", healthScore: 78, onTime: 88, blockers: 1, velocity: [2, 3, 3, 4, 4, 3, 5] },
  google:    { feedbackLoop: 18, revisionRatio: 1.8, timeSaved: 24, trend: "improving", healthScore: 83, onTime: 93, blockers: 0, velocity: [4, 5, 4, 6, 5, 6, 7] },
  deloitte:  { feedbackLoop: 56, revisionRatio: 3.2, timeSaved: 12, trend: "declining", healthScore: 61, onTime: 72, blockers: 2, velocity: [2, 2, 1, 3, 2, 1, 2] },
  levis:     { feedbackLoop: 22, revisionRatio: 1.4, timeSaved: 20, trend: "stable",    healthScore: 85, onTime: 92, blockers: 0, velocity: [3, 4, 4, 5, 4, 5, 4] },
  patagonia: { feedbackLoop: 14, revisionRatio: 1.1, timeSaved: 16, trend: "improving", healthScore: 91, onTime: 97, blockers: 0, velocity: [3, 4, 5, 5, 6, 5, 7] },
};

export function generateTeamHealthData(projectId: ProjectId, projectName: string) {
  const proj = PROJECT_DATA[projectId];
  const meta = TEAM_HEALTH_META[projectId];
  const members = STUDIO_TEAM.filter(m => proj.memberIds.includes(m.id));
  const avgCostRate = Math.round(members.reduce((a, m) => a + (MEMBER_HEALTH[m.id]?.costRate ?? 100), 0) / members.length);
  return {
    label: `${projectName} · Team Health`,
    projectId,
    feedbackLoopVelocity:    meta.feedbackLoop,
    revisionToApprovalRatio: meta.revisionRatio,
    timeSavedHours:          meta.timeSaved,
    trendDirection:          meta.trend,
    overallHealthScore:      meta.healthScore,
    onTimeDeliveryRate:      meta.onTime,
    openBlockers:            meta.blockers,
    weeklyVelocity:          meta.velocity,
    avgCostRate,
    lastUpdated: "just now",
    teamMembers: members.map(m => ({
      name:        m.name,
      initials:    m.initials,
      role:        m.role,
      healthScore: MEMBER_HEALTH[m.id]?.healthScore ?? 80,
      onTimeRate:  MEMBER_HEALTH[m.id]?.onTime ?? 88,
      blockers:    MEMBER_HEALTH[m.id]?.blockers ?? 0,
    })),
  };
}

export type OpNodeType = "capacity" | "financial" | "projectHealth" | "pipeline" | "teamHealth";

export function generateProjectNodeData(
  nodeType: OpNodeType,
  projectId: ProjectId,
): Record<string, unknown> {
  const project = PROJECTS.find(p => p.id === projectId)!;
  if (nodeType === "capacity")      return generateCapacityData(projectId, project.name) as Record<string, unknown>;
  if (nodeType === "financial")     return generateFinancialData(projectId, project.name) as Record<string, unknown>;
  if (nodeType === "pipeline")      return generatePipelineData(projectId, project.name) as Record<string, unknown>;
  if (nodeType === "teamHealth")    return generateTeamHealthData(projectId, project.name) as Record<string, unknown>;
  return generateProjectHealthData(projectId, project.name) as Record<string, unknown>;
}
