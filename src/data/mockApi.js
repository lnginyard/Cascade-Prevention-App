import events from './events.json';

const EVENT_PROFILES = {
  ev_hurricane_gulf_cat4: {
    severity: 'Major',
    confidence: 0.74,
    chain: ['Hurricane', 'Port Disruption', 'Fuel Price Spike', 'Logistics Delay', 'Revenue Exposure'],
    mitigations: [
      { category: 'Infrastructure', actions: ['Enable failover in us-west-2', 'Scale backup compute by 25%'] },
      { category: 'Supply Chain', actions: ['Re-route ocean freight to alternates', 'Increase safety stock for critical SKUs'] },
      { category: 'Financial', actions: ['Hedge near-term fuel volatility', 'Adjust insurance exposure limits'] },
    ],
  },
  ev_wildfire_ca: {
    severity: 'Elevated',
    confidence: 0.69,
    chain: ['Wildfire', 'Road Closures', 'Distribution Disruption', 'Fulfillment Delay'],
    mitigations: [
      { category: 'Operations', actions: ['Shift loads to inland hubs', 'Increase ground carrier redundancy'] },
      { category: 'Cloud', actions: ['Pre-warm disaster recovery workloads', 'Enable broader read replicas'] },
      { category: 'Policy', actions: ['Add regional blackout playbooks', 'Pre-stage emergency staffing'] },
    ],
  },
  ev_aws_outage: {
    severity: 'Critical',
    confidence: 0.82,
    chain: ['AWS us-east-1 Outage', 'Service Instability', 'Transaction Failures', 'Customer Churn Risk'],
    mitigations: [
      { category: 'Infrastructure', actions: ['Activate cross-region failover', 'Raise RTO alerts for tier-1 apps'] },
      { category: 'Application', actions: ['Enable graceful degradation mode', 'Throttle non-critical jobs'] },
      { category: 'Customer', actions: ['Publish status updates every 15 mins', 'Issue proactive SLA credits'] },
    ],
  },
  ev_supplier_bankruptcy: {
    severity: 'Major',
    confidence: 0.71,
    chain: ['Supplier Bankruptcy', 'Raw Material Constraint', 'Production Shortfall', 'Order Backlog'],
    mitigations: [
      { category: 'Supply Chain', actions: ['Activate alternate supplier contracts', 'Prioritize high-margin SKUs'] },
      { category: 'Operations', actions: ['Adjust production schedules weekly', 'Increase multi-sourcing coverage'] },
      { category: 'Financial', actions: ['Reforecast procurement spend', 'Renegotiate payment terms'] },
    ],
  },
  ev_geopolitical_sanctions: {
    severity: 'Major',
    confidence: 0.76,
    chain: ['Sanctions Update', 'Trade Restrictions', 'Route Replanning', 'Revenue Exposure'],
    mitigations: [
      { category: 'Policy', actions: ['Run sanctions compliance screening', 'Refresh restricted-party controls'] },
      { category: 'Operations', actions: ['Shift fulfillment to compliant regions', 'Update carrier routing matrices'] },
      { category: 'Customer', actions: ['Communicate delivery changes early', 'Offer regional alternatives'] },
    ],
  },
  ev_port_strike: {
    severity: 'Elevated',
    confidence: 0.7,
    chain: ['Port Strike', 'Inbound Delay', 'Inventory Imbalance', 'Service-Level Breach'],
    mitigations: [
      { category: 'Supply Chain', actions: ['Reroute via alternate ports', 'Increase rail and air fallback volume'] },
      { category: 'Infrastructure', actions: ['Scale logistics planning compute', 'Automate ETA reprioritization rules'] },
      { category: 'Policy', actions: ['Trigger delay communication policy', 'Escalate exception approvals'] },
    ],
  },
  ev_ransomware_internal: {
    severity: 'Critical',
    confidence: 0.83,
    chain: ['Ransomware Entry', 'Lateral Movement', 'System Encryption', 'Operational Shutdown'],
    mitigations: [
      { category: 'Cloud', actions: ['Isolate affected workloads', 'Restore clean backups into quarantined VPCs'] },
      { category: 'Infrastructure', actions: ['Rotate credentials and keys', 'Block suspicious egress patterns'] },
      { category: 'Policy', actions: ['Initiate incident response legal workflow', 'Activate executive communication protocol'] },
    ],
  },
  ev_erp_data_corruption: {
    severity: 'Elevated',
    confidence: 0.72,
    chain: ['Faulty Deployment', 'ERP Corruption', 'Order/Billing Mismatch', 'Manual Recovery Delay'],
    mitigations: [
      { category: 'Application', actions: ['Rollback release and replay events', 'Run integrity checks on finance tables'] },
      { category: 'Operations', actions: ['Temporarily pause auto-fulfillment', 'Establish manual reconciliation queue'] },
      { category: 'Customer', actions: ['Notify affected accounts proactively', 'Offer corrected invoice timelines'] },
    ],
  },
  ev_insider_privilege_abuse: {
    severity: 'Major',
    confidence: 0.78,
    chain: ['Privilege Abuse', 'Unauthorized Config Changes', 'Control Drift', 'Service Instability'],
    mitigations: [
      { category: 'Policy', actions: ['Enforce just-in-time privilege access', 'Audit privileged sessions daily'] },
      { category: 'Cloud', actions: ['Reapply baseline guardrails', 'Alert on high-risk IAM mutations'] },
      { category: 'Operations', actions: ['Run change freeze for critical services', 'Approve emergency rollback windows'] },
    ],
  },
  ev_dc_power_failure: {
    severity: 'Major',
    confidence: 0.75,
    chain: ['Power Failure', 'On-Prem Downtime', 'Failover Strain', 'Latency/Capacity Degradation'],
    mitigations: [
      { category: 'Infrastructure', actions: ['Shift traffic to cloud DR footprint', 'Validate generator and UPS recovery runbook'] },
      { category: 'Cloud', actions: ['Auto-scale fallback clusters', 'Increase multi-region replication frequency'] },
      { category: 'Operations', actions: ['Prioritize critical applications only', 'Track load shedding decisions centrally'] },
    ],
  },
  ev_key_personnel_loss: {
    severity: 'Elevated',
    confidence: 0.66,
    chain: ['Attrition Spike', 'Knowledge Gaps', 'Slower Incident Triage', 'Extended MTTR'],
    mitigations: [
      { category: 'Operations', actions: ['Cross-train on-call rotations', 'Codify runbooks for top failure modes'] },
      { category: 'Policy', actions: ['Activate retention risk plan', 'Adjust hiring fast-track approvals'] },
      { category: 'Customer', actions: ['Publish realistic SLA buffers', 'Prioritize enterprise support routing'] },
    ],
  },
  ev_change_release_regression: {
    severity: 'Major',
    confidence: 0.79,
    chain: ['Release Regression', 'Performance Degradation', 'Error Rate Spike', 'Customer Experience Impact'],
    mitigations: [
      { category: 'Application', actions: ['Trigger automated rollback gates', 'Pinpoint offender services via tracing'] },
      { category: 'Infrastructure', actions: ['Scale hot path services', 'Throttle non-essential background jobs'] },
      { category: 'Policy', actions: ['Require canary validation evidence', 'Enforce production readiness checklist'] },
    ],
  },
};

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function scoreFromEvent(eventId) {
  if (eventId === 'ev_aws_outage') return 84;
  if (eventId === 'ev_ransomware_internal') return 86;
  if (eventId === 'ev_insider_privilege_abuse') return 79;
  if (eventId === 'ev_change_release_regression') return 78;
  if (eventId === 'ev_hurricane_gulf_cat4') return 73;
  if (eventId === 'ev_wildfire_ca') return 67;
  if (eventId === 'ev_supplier_bankruptcy') return 72;
  if (eventId === 'ev_geopolitical_sanctions') return 74;
  if (eventId === 'ev_port_strike') return 69;
  if (eventId === 'ev_erp_data_corruption') return 71;
  if (eventId === 'ev_dc_power_failure') return 76;
  if (eventId === 'ev_key_personnel_loss') return 63;
  return 60;
}

function withImpact(lines, intensity) {
  return lines.map((line, index) => {
    const impact = clamp(intensity - index * 0.09, 0.2, 1);
    return {
      ...line,
      impact,
      strokeWidth: 1.5 + impact * 2,
      opacity: 0.35 + impact * 0.55,
      delay: index * 0.2,
      tooltip: `Impact ${(impact * 100).toFixed(0)}%`,
    };
  });
}

function buildNodes(riskIndex, regions, industries) {
  const regionalFactor = regions.length / 4;
  const industryFactor = industries.length / 5;

  return [
    {
      id: 'aws-us-east-1',
      label: 'AWS us-east-1',
      score: clamp(Math.round(riskIndex * (0.95 + regionalFactor * 0.1)), 0, 99),
    },
    {
      id: 'supply-chain',
      label: 'Supply Chain',
      score: clamp(Math.round(riskIndex * (0.82 + industryFactor * 0.14)), 0, 99),
    },
    {
      id: 'customer-edge',
      label: 'Customer Edge',
      score: clamp(Math.round(riskIndex * 0.68), 0, 99),
    },
  ];
}

export async function listEvents() {
  await wait(120);
  return events;
}

export async function getScenario(eventId, filters) {
  await wait(220);

  const profile = EVENT_PROFILES[eventId] || EVENT_PROFILES.ev_hurricane_gulf_cat4;
  const base = scoreFromEvent(eventId);
  const regionMultiplier = clamp(filters.selectedRegions.length / 4, 0.25, 1);
  const industryMultiplier = clamp(filters.selectedIndustries.length / 5, 0.2, 1);
  const failoverDiscount = filters.failoverEnabled ? 0.09 : 0;
  const runBoost = clamp(filters.simulationRuns * 0.03, 0, 0.12);
  const intensity = clamp(0.45 + regionMultiplier * 0.22 + industryMultiplier * 0.22 + runBoost - failoverDiscount, 0.25, 1);

  const riskIndex = clamp(Math.round(base * (0.78 + intensity * 0.35)), 20, 99);
  const sourceLines = filters.propagationLines?.length ? filters.propagationLines : [];
  const lines = withImpact(sourceLines, intensity);

  return {
    riskSummary: {
      overallIndex: riskIndex,
      cascadeSeverity: profile.severity,
      confidence: profile.confidence,
    },
    chain: profile.chain,
    mitigations: profile.mitigations,
    lines,
    nodes: buildNodes(riskIndex, filters.selectedRegions, filters.selectedIndustries),
  };
}
