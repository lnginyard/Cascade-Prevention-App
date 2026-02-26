import React from 'react';
import { useStore } from '../../state/Store.jsx';

const KIRO_ICON_URL = 'https://kiro.dev/images/kiro-wordmark.png?h=0ad65a93';

export default function AIRiskPanel() {
  const { scenario, isLoadingScenario, simulationRuns, eventId, events, failoverEnabled } = useStore();
  const { riskSummary, chain, mitigations } = scenario;
  const hasSimulation = simulationRuns > 0;
  const selectedEvent = events.find((event) => event.id === eventId) || null;

  const alertColumns = React.useMemo(() => {
    const buckets = {
      Operations: [],
      Cloud: [],
      Policy: [],
    };

    (mitigations || []).forEach((mitigation) => {
      const category = mitigation.category?.toLowerCase() || '';
      if (category.includes('cloud') || category.includes('infra') || category.includes('application')) {
        buckets.Cloud.push(...mitigation.actions);
      } else if (category.includes('policy') || category.includes('financial') || category.includes('customer')) {
        buckets.Policy.push(...mitigation.actions);
      } else {
        buckets.Operations.push(...mitigation.actions);
      }
    });

    return buckets;
  }, [mitigations]);

  const columnTitles = ['Operations', 'Cloud', 'Policy'];
  const [activeColumn, setActiveColumn] = React.useState('Operations');
  const [activeAlertKey, setActiveAlertKey] = React.useState(null);

  React.useEffect(() => {
    const alerts = alertColumns[activeColumn] || [];
    if (alerts.length === 0) {
      setActiveAlertKey(null);
      return;
    }

    const [firstAlert] = alerts;
    setActiveAlertKey((prev) => prev || `${activeColumn}-0-${firstAlert}`);
  }, [activeColumn, alertColumns]);

  function buildAlertDetail(column, warningText) {
    const currentIndex = riskSummary?.overallIndex ?? 0;
    const chainSummary = (chain || []).slice(0, 3).join(' → ') || 'No chain available';

    if (column === 'Cloud') {
      return {
        impact: `Cloud service reliability is at risk with index ${currentIndex}. This warning is tied to disruptions in platform availability and dependent services.`,
        why: `Kiro flagged this because the cascade chain currently starts with ${chainSummary}, which often propagates through core cloud dependencies quickly.`,
        response: ['Validate failover readiness now', 'Prioritize tier-1 workload continuity', 'Pause non-critical workloads during instability'],
      };
    }

    if (column === 'Policy') {
      return {
        impact: `Governance and customer obligations may drift during this scenario. Contract/SLA risk increases as severity rises.`,
        why: `Kiro correlates this warning with policy-sensitive outcomes (customer commitments, financial controls, and communication cadence).`,
        response: ['Trigger policy playbook owner review', 'Publish stakeholder update cadence', 'Track SLA/financial exception approvals'],
      };
    }

    return {
      impact: `Operational throughput can degrade while this warning is active, causing backlog and response delays across teams.`,
      why: `Kiro maps this to frontline execution risk and supply-chain pressure seen in the active cascade path (${chainSummary}).`,
      response: ['Escalate incident commander handoff', 'Rebalance staffing to critical lanes', 'Track mitigation completion every 15 minutes'],
    };
  }

  const severityTone =
    riskSummary?.cascadeSeverity === 'Critical'
      ? 'text-red-300 bg-red-900/30 border-red-700'
      : riskSummary?.cascadeSeverity === 'Major'
        ? 'text-amber-300 bg-amber-900/30 border-amber-700'
        : 'text-cyan-300 bg-cyan-900/30 border-cyan-700';

  const activeAlerts = alertColumns[activeColumn] || [];
  const selectedAlert = activeAlerts.find((item, index) => `${activeColumn}-${index}-${item}` === activeAlertKey) || null;
  const selectedAlertDetail = selectedAlert ? buildAlertDetail(activeColumn, selectedAlert) : null;

  const explainability = React.useMemo(() => {
    const risk = riskSummary?.overallIndex || 0;
    const chainPressure = Math.min(100, chain.length * 14 + 18);
    const mitigationCoverage = Math.min(100, mitigations.reduce((sum, item) => sum + (item.actions?.length || 0), 0) * 6);
    const failoverOffset = failoverEnabled ? -12 : 8;

    return [
      { label: 'Dependency pressure', value: Math.max(5, Math.min(100, chainPressure + failoverOffset)) },
      { label: 'Mitigation readiness', value: Math.max(5, Math.min(100, mitigationCoverage)) },
      { label: 'Regional exposure', value: Math.max(5, Math.min(100, risk + (failoverEnabled ? -6 : 10))) },
    ];
  }, [chain.length, failoverEnabled, mitigations, riskSummary?.overallIndex]);

  const costModel = React.useMemo(() => {
    const risk = riskSummary?.overallIndex || 0;
    const estimatedDowntimeCost = Math.round(8000 + risk * 420);
    const mttrHours = Math.max(1.2, Number((7.8 - risk / 18).toFixed(1)));
    const resourcePressure = Math.min(99, Math.round(34 + risk * 0.62));
    return { estimatedDowntimeCost, mttrHours, resourcePressure };
  }, [riskSummary?.overallIndex]);

  function downloadPlaybook() {
    const playbook = `# Cascade Playbook\n\n` +
      `Generated: ${new Date().toLocaleString()}\n` +
      `Event: ${selectedEvent?.name || eventId}\n` +
      `Risk Index: ${riskSummary?.overallIndex ?? 0}\n` +
      `Cascade Severity: ${riskSummary?.cascadeSeverity || 'Unknown'}\n` +
      `Failover Enabled: ${failoverEnabled ? 'Yes' : 'No'}\n\n` +
      `## Recommended AWS Services\n` +
      `- Route 53 health checks + DNS failover\n` +
      `- Elastic Load Balancing across healthy targets\n` +
      `- S3 replication for critical data durability\n` +
      `- CloudWatch alarms + incident dashboards\n\n` +
      `## Cascade Chain\n` +
      `${(chain || []).map((step, index) => `${index + 1}. ${step}`).join('\n') || 'No chain data'}\n\n` +
      `## Mitigations\n` +
      `${(mitigations || []).map((m) => `### ${m.category}\n${(m.actions || []).map((a) => `- ${a}`).join('\n')}`).join('\n\n') || 'No mitigation data'}\n`;

    const blob = new Blob([playbook], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cascade-playbook-${eventId}-${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  if (!hasSimulation) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded p-4 h-full flex flex-col neon-panel" role="region" aria-label="AI risk analysis panel">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <img src={KIRO_ICON_URL} alt="Kiro logo" className="h-7 w-auto sm:h-8" />
            <div>
              <h3 className="font-semibold leading-tight">AI Risk Analysis</h3>
              <p className="text-xs text-gray-400">Powered by Kiro · waiting for simulation</p>
            </div>
          </div>
          <span className="text-xs border rounded px-2 py-1 text-gray-300 bg-gray-900/40 border-gray-700">—</span>
        </div>
        <div className="space-y-3 flex-1">
          <div className="h-20 rounded border border-dashed border-gray-700 bg-gray-900/40" />
          <div className="h-20 rounded border border-dashed border-gray-700 bg-gray-900/40" />
          <div className="h-20 rounded border border-dashed border-gray-700 bg-gray-900/40" />
          <div className="h-24 rounded border border-dashed border-gray-700 bg-gray-900/40" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded p-4 h-full flex flex-col neon-panel" role="region" aria-label="AI risk analysis panel">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <img src={KIRO_ICON_URL} alt="Kiro logo" className="h-7 w-auto sm:h-8" />
          <div>
            <h3 className="font-semibold leading-tight">AI Risk Analysis</h3>
            <p className="text-xs text-gray-400">Powered by Kiro · informal ops briefing</p>
          </div>
        </div>
        <span className={`text-xs border rounded px-2 py-1 ${severityTone}`}>
          {riskSummary?.cascadeSeverity || 'Unknown'}
        </span>
      </div>

      <div className="bg-gray-900 rounded p-3 mb-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>Overall Index</span>
          <strong>{riskSummary?.overallIndex ?? 0}</strong>
        </div>
        <div className="flex items-center justify-between text-sm text-gray-300">
          <span>Model Confidence</span>
          <span>{Math.round((riskSummary?.confidence || 0) * 100)}%</span>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Simulation Runs</span>
          <span>{simulationRuns}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Selected Event</span>
          <span className="text-gray-300">{selectedEvent?.name || eventId}</span>
        </div>
        <div className="w-full h-2 bg-gray-700 rounded mt-2 overflow-hidden">
          <div
            className="h-full bg-cyan-400 transition-all duration-500"
            style={{ width: `${riskSummary?.overallIndex || 0}%` }}
          />
        </div>
      </div>

      <div className="bg-gray-900 rounded p-3 mb-3">
        <div className="text-sm mb-2">Risk Explainability</div>
        {hasSimulation ? (
          <div className="space-y-2">
            {explainability.map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs text-gray-300">
                  <span>{item.label}</span>
                  <span>{item.value}%</span>
                </div>
                <div className="h-1.5 bg-gray-700 rounded overflow-hidden mt-1">
                  <div className="h-full bg-cyan-500 transition-all duration-500" style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-[72px] rounded border border-dashed border-gray-700 bg-gray-900/40" />
        )}
      </div>

      <div className="bg-gray-900 rounded p-3 mb-3">
        <div className="text-sm mb-2">Cost and Resource Impact</div>
        {hasSimulation ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="rounded border border-gray-700 p-2">
              <div className="text-gray-400">Downtime cost</div>
              <div className="text-amber-300 font-semibold">${costModel.estimatedDowntimeCost.toLocaleString()}/hr</div>
            </div>
            <div className="rounded border border-gray-700 p-2">
              <div className="text-gray-400">Estimated MTTR</div>
              <div className="text-cyan-300 font-semibold">{costModel.mttrHours} hrs</div>
            </div>
            <div className="rounded border border-gray-700 p-2">
              <div className="text-gray-400">Resource utilization</div>
              <div className="text-emerald-300 font-semibold">{costModel.resourcePressure}%</div>
            </div>
          </div>
        ) : (
          <div className="h-[72px] rounded border border-dashed border-gray-700 bg-gray-900/40" />
        )}
      </div>

      <div className="mb-3">
        <div className="text-sm mb-1">Propagation Chain</div>
        <div className="flex flex-wrap gap-1.5">
          {(chain || []).map((step, index) => (
            <span key={index} className="text-[11px] px-2 py-1 rounded bg-gray-900 text-gray-200 border border-gray-700">
              {step}
            </span>
          ))}
        </div>
        {isLoadingScenario ? <div className="text-xs text-gray-400 mt-1">Updating analysis…</div> : null}
      </div>

      <div className="mt-1 flex-1 flex flex-col">
        <div className="text-sm mb-2">Action Alerts</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 flex-1">
          {columnTitles.map((title) => {
            const isActive = activeColumn === title;
            const alerts = alertColumns[title] || [];

            return (
              <div
                key={title}
                className={`text-left rounded border p-2 min-h-[12rem] transition ${
                  isActive ? 'border-cyan-400 bg-cyan-900/20' : 'border-gray-700 bg-gray-900/60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    className="text-sm font-semibold"
                    onClick={() => setActiveColumn(title)}
                  >
                    {title}
                  </button>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-gray-800 border border-gray-700">{alerts.length}</span>
                </div>

                <div className="space-y-1 max-h-44 overflow-auto pr-1">
                  {alerts.length === 0 ? (
                    <div className="text-xs text-gray-500">No active alerts</div>
                  ) : (
                    alerts.map((item, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          setActiveColumn(title);
                          setActiveAlertKey(`${title}-${index}-${item}`);
                        }}
                        className={`w-full text-left text-xs rounded border px-2 py-1 transition ${
                          activeAlertKey === `${title}-${index}-${item}`
                            ? 'border-amber-300 bg-amber-900/40 text-amber-100'
                            : 'border-amber-700/50 bg-amber-900/20 text-amber-100'
                        }`}
                      >
                        ⚠ {item}
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 rounded border border-gray-700 bg-gray-900/70 p-3">
          <div className="text-xs text-gray-400 mb-1">Selected warning detail</div>
          {selectedAlert ? (
            <>
              <div className="text-sm text-amber-200 mb-2">⚠ {selectedAlert}</div>
              <div className="space-y-2 text-xs text-gray-200">
                <div>
                  <span className="text-cyan-300">Impact:</span> {selectedAlertDetail?.impact}
                </div>
                <div>
                  <span className="text-cyan-300">Why Kiro flagged it:</span> {selectedAlertDetail?.why}
                </div>
                <div>
                  <span className="text-cyan-300">Immediate response:</span>
                  <ul className="mt-1 ml-4 list-disc space-y-1">
                    {(selectedAlertDetail?.response || []).map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          ) : (
            <div className="text-xs text-gray-400">Select a warning to view detailed analysis and actions.</div>
          )}
        </div>

        <div className="mt-2 text-xs text-gray-400">
          Tip: click any warning card for expanded context. Current focus: <span className="text-cyan-300">{activeColumn}</span>
        </div>
        <button
          type="button"
          aria-label="Download simulation playbook"
          onClick={downloadPlaybook}
          className="mt-3 text-xs rounded border border-cyan-500/60 text-cyan-300 px-3 py-1.5 hover:bg-cyan-900/20 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          Download Incident Playbook
        </button>
      </div>
    </div>
  );
}