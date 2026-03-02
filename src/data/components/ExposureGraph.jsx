import React from 'react';
import { useStore } from '../../state/Store.jsx';

const INDUSTRY_RISK_PROFILES = {
  Healthcare: { weight: 1.18, signal: 'Patient care continuity and SLA breach risk', action: 'Prioritize critical care systems and failover runbooks' },
  'E-Commerce': { weight: 1.1, signal: 'Checkout, fulfillment, and cart abandonment risk', action: 'Protect checkout path and throttle non-essential workloads' },
  'Financial Services': { weight: 1.2, signal: 'Transaction integrity and latency sensitivity', action: 'Enforce tier-1 transaction isolation and rollback controls' },
  Government: { weight: 1.12, signal: 'Public service availability and compliance continuity', action: 'Activate continuity playbooks and citizen-service routing priorities' },
  Logistics: { weight: 1.15, signal: 'Route disruption and inventory imbalance risk', action: 'Shift loads to resilient lanes and lock high-priority shipment flow' },
  'Energy & Utilities': { weight: 1.22, signal: 'Critical infrastructure uptime and control-system risk', action: 'Harden control-plane dependencies and pre-stage backup operations' },
  Telecommunications: { weight: 1.17, signal: 'Network congestion and regional service degradation', action: 'Rebalance capacity and isolate critical network services' },
  'Transportation & Aviation': { weight: 1.16, signal: 'Scheduling disruption and passenger/cargo delay risk', action: 'Prioritize operational control systems and reroute planning capacity' },
  Insurance: { weight: 1.08, signal: 'Claims processing and underwriting service pressure', action: 'Protect claims intake systems and automate surge handling' },
  Manufacturing: { weight: 1.11, signal: 'Production throughput and supplier dependency risk', action: 'Secure production orchestration and backup supplier decision paths' },
  'Pharmaceuticals & Life Sciences': { weight: 1.19, signal: 'Cold-chain and regulated process disruption risk', action: 'Protect validated workflows and monitor compliance-critical services' },
  Retail: { weight: 1.07, signal: 'Point-of-sale and inventory synchronization risk', action: 'Harden POS dependencies and prioritize stock-reconciliation channels' },
  'Hospitality & Travel': { weight: 1.09, signal: 'Reservation platform and demand volatility risk', action: 'Stabilize booking platform and preserve customer communication channels' },
  Education: { weight: 1.03, signal: 'Learning platform and enrollment-service disruption risk', action: 'Prioritize student-facing platforms and identity services' },
  'Media & Communications': { weight: 1.06, signal: 'Publishing and content delivery latency risk', action: 'Scale delivery paths and protect editorial/streaming pipelines' },
  'Technology & SaaS': { weight: 1.14, signal: 'Platform multi-tenant reliability pressure', action: 'Protect authentication and tenant-isolation pathways' },
  'Real Estate': { weight: 0.98, signal: 'Property platform and transaction workflow delays', action: 'Prioritize transaction systems and document workflow continuity' },
  Agriculture: { weight: 0.96, signal: 'Seasonal supply and field-operations coordination risk', action: 'Stabilize planning systems and logistics partner integrations' },
};

export default function ExposureGraph() {
  const {
    scenario,
    simulationRuns,
    eventId,
    events,
    selectedIndustries,
    selectedRegions,
    lastSimulationAt,
    failoverEnabled,
    eventLogs,
  } = useStore();
  const nodes = scenario.nodes || [];
  const chain = scenario.chain || [];
  const mitigations = scenario.mitigations || [];
  const lines = scenario.lines || [];
  const hasSimulation = simulationRuns > 0;
  const selectedEvent = events.find((event) => event.id === eventId) || null;
  const generatedAt = new Date().toLocaleString();
  const lastRunLabel = lastSimulationAt ? new Date(lastSimulationAt).toLocaleString() : 'Not run yet';

  const clamp = React.useCallback((value, min, max) => Math.max(min, Math.min(max, value)), []);

  const layoutNodes = React.useMemo(() => {
    if (!hasSimulation) {
      return [];
    }

    const baseRisk = scenario.riskSummary?.overallIndex ?? 0;
    const confidencePct = Math.round((scenario.riskSummary?.confidence || 0) * 100);
    const chainSteps = chain.length
      ? chain.slice(0, 5)
      : [selectedEvent?.name || 'Event Trigger', ...(nodes.map((node) => node.label).slice(0, 2))].filter(Boolean);

    const stepCount = Math.max(1, chainSteps.length);
    const spacing = stepCount > 1 ? 540 / (stepCount - 1) : 0;

    return chainSteps.map((step, index) => {
      const fallbackScore = Math.round(baseRisk * (1 - index * 0.1));
      const modelScore = nodes[index]?.score ?? fallbackScore;
      const lineImpactScore = typeof lines[index]?.impact === 'number' ? Math.round(lines[index].impact * 100) : fallbackScore;
      const score = clamp(Math.round(modelScore * 0.65 + lineImpactScore * 0.35), 8, 99);
      const probability = clamp(Math.round(score * 0.68 + confidencePct * 0.32), 10, 99);
      const leadTimeBase = Math.max(0.3, Number(lines[index]?.delay ?? index * 0.25 + 0.4));
      const etaMinutes = clamp(Math.round((index + 1) * 18 + leadTimeBase * 28 + (100 - score) * 0.5), 12, 480);

      return {
        id: `chain-node-${index}`,
        label: String(step),
        score,
        probability,
        etaMinutes,
        x: 90 + spacing * index,
        y: index === 0 || index === stepCount - 1 ? 116 : (index % 2 === 0 ? 86 : 146),
        state: index === 0 ? 'origin' : index === stepCount - 1 ? 'impact' : 'propagation',
      };
    });
  }, [chain, clamp, hasSimulation, lines, nodes, scenario.riskSummary?.confidence, scenario.riskSummary?.overallIndex, selectedEvent?.name]);

  const [focusedNodeId, setFocusedNodeId] = React.useState(null);
  const [focusedEdgeId, setFocusedEdgeId] = React.useState(null);
  const [focusedIndustryId, setFocusedIndustryId] = React.useState(null);

  React.useEffect(() => {
    if (!hasSimulation) {
      setFocusedNodeId(null);
      setFocusedIndustryId(null);
      return;
    }
    setFocusedNodeId((prev) => prev || layoutNodes[0]?.id || null);
    setFocusedIndustryId((prev) => prev || selectedIndustries[0] || null);
  }, [hasSimulation, layoutNodes, selectedIndustries]);

  const edges = React.useMemo(() => {
    if (layoutNodes.length < 2) return [];

    return layoutNodes.slice(0, -1).map((fromNode, index) => {
      const toNode = layoutNodes[index + 1];
      const weight = hasSimulation ? Math.max(8, Math.round((fromNode.score + toNode.score) / 2)) : 0;
      const controlX = (fromNode.x + toNode.x) / 2;
      const controlY = Math.min(fromNode.y, toNode.y) - 26 - (index % 2) * 12;

      return {
        id: `edge-${index}`,
        from: fromNode,
        to: toNode,
        weight,
        path: `M${fromNode.x + 18},${fromNode.y} Q${controlX},${controlY} ${toNode.x - 18},${toNode.y}`,
      };
    });
  }, [hasSimulation, layoutNodes]);

  const focusedNode = layoutNodes.find((node) => node.id === focusedNodeId) || null;
  const focusedEdge = edges.find((edge) => edge.id === focusedEdgeId) || null;
  const svgRef = React.useRef(null);

  const industryOverlays = React.useMemo(() => {
    const baseRisk = scenario.riskSummary?.overallIndex || 0;
    return (selectedIndustries || []).map((industry) => {
      const profile = INDUSTRY_RISK_PROFILES[industry] || {
        weight: 1,
        signal: 'Operational dependency and continuity pressure',
        action: 'Prioritize mission-critical systems and failover readiness',
      };

      const score = Math.max(0, Math.min(99, Math.round(baseRisk * profile.weight + (failoverEnabled ? -4 : 4))));
      return {
        id: industry,
        industry,
        score,
        signal: profile.signal,
        action: profile.action,
      };
    }).sort((a, b) => b.score - a.score);
  }, [failoverEnabled, scenario.riskSummary?.overallIndex, selectedIndustries]);

  const activeIndustry = industryOverlays.find((item) => item.id === focusedIndustryId) || industryOverlays[0] || null;

  function riskBand(score) {
    if (score >= 80) return { label: 'Critical', color: 'text-red-300' };
    if (score >= 60) return { label: 'High', color: 'text-amber-300' };
    if (score >= 40) return { label: 'Moderate', color: 'text-yellow-300' };
    return { label: 'Low', color: 'text-emerald-300' };
  }

  function csvCell(value) {
    return `"${String(value ?? '').replaceAll('"', '""')}"`;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function downloadCsv() {
    const rows = [
      ['Section', 'Name', 'Value'],
      ['Metadata', 'Generated', generatedAt],
      ['Metadata', 'Last Simulation Run', lastRunLabel],
      ['Event', 'Event ID', eventId],
      ['Event', 'Event Name', selectedEvent?.name || 'Unknown'],
      ['Event', 'Event Description', selectedEvent?.description || 'N/A'],
      ['Filters', 'Selected Industries', selectedIndustries.join(' | ') || 'None'],
      ['Filters', 'Selected AWS Regions', selectedRegions.join(' | ') || 'None'],
      ['Summary', 'Simulation Runs', String(simulationRuns)],
      ['Summary', 'Overall Risk Index', String(scenario.riskSummary?.overallIndex ?? 0)],
      ['Summary', 'Cascade Severity', scenario.riskSummary?.cascadeSeverity || 'Unknown'],
      ['Summary', 'Confidence', `${Math.round((scenario.riskSummary?.confidence || 0) * 100)}%`],
      ...chain.map((item, index) => ['Cascade Chain', `Step ${index + 1}`, item]),
      ...mitigations.flatMap((mitigation, index) => {
        const actions = mitigation.actions || [];
        return [
          ['Mitigation', `Category ${index + 1}`, mitigation.category || 'Uncategorized'],
          ...actions.map((action, actionIndex) => ['Mitigation Action', `${mitigation.category || 'Category'} #${actionIndex + 1}`, action]),
        ];
      }),
      ...layoutNodes.map((node) => ['Node', node.label, hasSimulation ? String(node.score) : 'Pending']),
      ...edges.map((edge) => ['Edge', `${edge.from.label} -> ${edge.to.label}`, hasSimulation ? `${edge.weight}%` : 'Idle']),
      ...lines.map((line, index) => [
        'Propagation Line',
        `Path ${index + 1}`,
        `Impact ${Math.round((line.impact || 0) * 100)}% | Width ${line.strokeWidth || 0} | Opacity ${line.opacity || 0}`,
      ]),
    ];

    const content = rows
      .map((row) => row.map((value) => csvCell(value)).join(','))
      .join('\r\n');

    const csvPayload = `\uFEFF${content || '"Section","Name","Value"\r\n"Summary","Status","No data"'}`;
    const blob = new Blob([csvPayload], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cascade-propagation-${Date.now()}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    window.setTimeout(() => {
      link.remove();
      URL.revokeObjectURL(url);
    }, 1200);
  }

  function exportPdf() {
    const rowsHtml = layoutNodes
      .map(
        (node) =>
          `<tr><td>${escapeHtml(node.label)}</td><td>${escapeHtml(hasSimulation ? `Risk ${node.score}` : 'Pending')}</td><td>${escapeHtml(node.state)}</td></tr>`
      )
      .join('');

    const edgeRowsHtml = edges
      .map(
        (edge) =>
          `<tr><td>${escapeHtml(edge.from.label)} → ${escapeHtml(edge.to.label)}</td><td>${escapeHtml(hasSimulation ? `${edge.weight}%` : 'Idle')}</td></tr>`
      )
      .join('');

    const chainRowsHtml = chain
      .map((step, index) => `<tr><td>Step ${index + 1}</td><td>${escapeHtml(step)}</td></tr>`)
      .join('');

    const mitigationRowsHtml = mitigations
      .map((mitigation) => {
        const actions = (mitigation.actions || []).map((action) => `<li>${escapeHtml(action)}</li>`).join('');
        return `<tr><td>${escapeHtml(mitigation.category || 'Uncategorized')}</td><td><ul>${actions}</ul></td></tr>`;
      })
      .join('');

    const propagationRowsHtml = lines
      .map(
        (line, index) =>
          `<tr><td>Path ${index + 1}</td><td>${Math.round((line.impact || 0) * 100)}%</td><td>${line.strokeWidth || 0}</td><td>${line.opacity || 0}</td></tr>`
      )
      .join('');

    const reportHtml = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Cascade Propagation Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 28px; color: #0f172a; }
            h1 { margin: 0 0 8px 0; }
            p { margin: 4px 0; }
            h2 { margin: 22px 0 8px 0; font-size: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 13px; }
            th { background: #e2e8f0; }
            ul { margin: 0; padding-left: 18px; }
            .meta { display: grid; grid-template-columns: 200px 1fr; gap: 4px 12px; margin-top: 12px; }
            .label { color: #334155; font-weight: 600; }
          </style>
        </head>
        <body>
          <h1>Cascade Propagation Report</h1>
          <div class="meta">
            <div class="label">Generated</div><div>${escapeHtml(generatedAt)}</div>
            <div class="label">Last Simulation Run</div><div>${escapeHtml(lastRunLabel)}</div>
            <div class="label">Event ID</div><div>${escapeHtml(eventId)}</div>
            <div class="label">Event Name</div><div>${escapeHtml(selectedEvent?.name || 'Unknown')}</div>
            <div class="label">Event Description</div><div>${escapeHtml(selectedEvent?.description || 'N/A')}</div>
            <div class="label">Selected Industries</div><div>${escapeHtml(selectedIndustries.join(', ') || 'None')}</div>
            <div class="label">Selected AWS Regions</div><div>${escapeHtml(selectedRegions.join(', ') || 'None')}</div>
            <div class="label">Simulation Runs</div><div>${simulationRuns}</div>
            <div class="label">Risk Index</div><div>${scenario.riskSummary?.overallIndex ?? 0}</div>
            <div class="label">Cascade Severity</div><div>${escapeHtml(scenario.riskSummary?.cascadeSeverity || 'Unknown')}</div>
            <div class="label">Confidence</div><div>${Math.round((scenario.riskSummary?.confidence || 0) * 100)}%</div>
          </div>

          <h2>Cascade Chain</h2>
          <table>
            <thead>
              <tr><th>Step</th><th>Description</th></tr>
            </thead>
            <tbody>
              ${chainRowsHtml || '<tr><td colspan="2">No chain data</td></tr>'}
            </tbody>
          </table>

          <h2>Mitigations</h2>
          <table>
            <thead>
              <tr><th>Category</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${mitigationRowsHtml || '<tr><td colspan="2">No mitigation data</td></tr>'}
            </tbody>
          </table>

          <h2>Graph Nodes</h2>
          <table>
            <thead>
              <tr><th>Node</th><th>Status</th><th>State</th></tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="3">No node data</td></tr>'}
            </tbody>
          </table>

          <h2>Propagation Edges</h2>
          <table>
            <thead>
              <tr><th>Edge</th><th>Weight</th></tr>
            </thead>
            <tbody>
              ${edgeRowsHtml || '<tr><td colspan="2">No edge data</td></tr>'}
            </tbody>
          </table>

          <h2>Propagation Paths</h2>
          <table>
            <thead>
              <tr><th>Path</th><th>Impact</th><th>Stroke Width</th><th>Opacity</th></tr>
            </thead>
            <tbody>
              ${propagationRowsHtml || '<tr><td colspan="4">No propagation path data</td></tr>'}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.setAttribute('aria-hidden', 'true');
    document.body.appendChild(printFrame);

    const frameWindow = printFrame.contentWindow;
    if (!frameWindow) {
      printFrame.remove();
      return;
    }

    frameWindow.document.open();
    frameWindow.document.write(reportHtml);
    frameWindow.document.close();

    const printNow = () => {
      frameWindow.focus();
      frameWindow.print();
      window.setTimeout(() => {
        printFrame.remove();
      }, 800);
    };

    if (printFrame.contentDocument?.readyState === 'complete') {
      printNow();
    } else {
      printFrame.onload = printNow;
    }
  }

  function exportJson() {
    const payload = {
      exportedAt: new Date().toISOString(),
      eventId,
      eventName: selectedEvent?.name || 'Unknown',
      simulationRuns,
      failoverEnabled,
      selectedIndustries,
      selectedRegions,
      scenario,
      graph: {
        nodes: layoutNodes,
        edges,
      },
      logs: eventLogs.slice(0, 30),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cascade-report-${eventId}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function exportPng() {
    const svgNode = svgRef.current;
    if (!svgNode) return;

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgNode);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1440;
      canvas.height = 420;
      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(url);
        return;
      }

      context.fillStyle = '#0f172a';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((pngBlob) => {
        if (!pngBlob) {
          URL.revokeObjectURL(url);
          return;
        }
        const pngUrl = URL.createObjectURL(pngBlob);
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `cascade-graph-${eventId}-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(pngUrl);
        URL.revokeObjectURL(url);
      }, 'image/png');
    };

    image.src = url;
  }

  return (
    <section className="bg-gray-800 border border-gray-700 rounded p-4 neon-panel" role="region" aria-label="Propagation graph and exports">
      <div className="flex items-center justify-between mb-2 gap-2">
        <strong>Dynamic Cascade Propagation Graph</strong>
        <div className="flex flex-wrap gap-2 justify-end">
          <button type="button" aria-label="Export report as CSV" disabled={!hasSimulation} className="px-3 py-1 bg-gray-700 rounded text-xs disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400" onClick={downloadCsv}>Export CSV</button>
          <button type="button" aria-label="Export report as PDF" disabled={!hasSimulation} className="px-3 py-1 bg-gray-700 rounded text-xs disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400" onClick={exportPdf}>Export PDF</button>
          <button type="button" aria-label="Export report as JSON" disabled={!hasSimulation} className="px-3 py-1 bg-gray-700 rounded text-xs disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400" onClick={exportJson}>Export JSON</button>
          <button type="button" aria-label="Export graph snapshot as PNG" disabled={!hasSimulation} className="px-3 py-1 bg-gray-700 rounded text-xs disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400" onClick={exportPng}>Export PNG</button>
        </div>
      </div>
      <div className="mb-2 rounded border border-gray-700 bg-gray-900/70 p-2 text-[11px] text-gray-300">
        <div className="font-semibold text-gray-100 mb-1">How to read this graph</div>
        <div>1) Start at the left source node. 2) Follow connection lines to downstream nodes. 3) Higher edge % and higher node risk indicate stronger propagation pressure.</div>
      </div>
      <svg ref={svgRef} viewBox="0 0 720 210" width="100%" height="210" className="rounded bg-gray-900/40" role="img" aria-label="Cascade propagation weighted graph">
        <defs>
          <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.25" />
            <stop offset="50%" stopColor="#67e8f9" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fde68a" stopOpacity="0.75" />
          </linearGradient>
        </defs>

        {hasSimulation ? (
          <g transform="translate(12,10)">
            <rect x="0" y="0" width="230" height="48" rx="6" fill="rgba(15,23,42,0.82)" stroke="rgba(100,116,139,0.45)" />
            <line x1="10" y1="17" x2="72" y2="17" stroke="url(#edgeGradient)" strokeWidth="3" />
            <text x="80" y="20" fill="#cbd5e1" fontSize="10">Propagation link (weight %)</text>
            <circle cx="18" cy="35" r="6" fill="#22d3ee" stroke="#fde68a" strokeWidth="1.5" />
            <text x="30" y="38" fill="#cbd5e1" fontSize="10">Service node (risk score)</text>
          </g>
        ) : null}

        {hasSimulation ? edges.map((edge, index) => (
          <g
            key={edge.id}
            onMouseEnter={() => setFocusedEdgeId(edge.id)}
            onMouseLeave={() => setFocusedEdgeId(null)}
            className="cursor-pointer"
          >
            <path
              d={edge.path}
              stroke="url(#edgeGradient)"
              strokeWidth={hasSimulation ? Math.max(2, edge.weight / (focusedEdgeId === edge.id ? 14 : 20)) : 1.2}
              strokeOpacity={hasSimulation ? (focusedEdgeId === edge.id ? 1 : 0.9) : 0.22}
              fill="none"
              className={hasSimulation ? 'graph-edge-flow' : ''}
              style={{ animationDelay: `${index * 0.3}s` }}
            />
            <text x={(edge.from.x + edge.to.x) / 2 - 12} y={(edge.from.y + edge.to.y) / 2 - 10} fill="#9ca3af" fontSize="10">
              {hasSimulation ? `${edge.weight}%` : 'idle'}
            </text>
            <title>{`${edge.from.label} to ${edge.to.label} · propagation weight ${edge.weight}%`}</title>
          </g>
        )) : null}

        {hasSimulation ? layoutNodes.map((node) => {
          const isFocused = node.id === focusedNodeId;
          const nodeFill = hasSimulation ? (isFocused ? '#67e8f9' : '#22d3ee') : '#475569';

          return (
            <g
              key={node.id}
              onMouseEnter={() => setFocusedNodeId(node.id)}
              onClick={() => setFocusedNodeId(node.id)}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setFocusedNodeId(node.id);
                }
              }}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={isFocused ? 14 : 12}
                fill={nodeFill}
                fillOpacity={hasSimulation ? 0.95 : 0.5}
                stroke={isFocused ? '#fde68a' : '#0f172a'}
                strokeWidth={isFocused ? 2.2 : 1.6}
                className={hasSimulation ? 'neon-pulse' : ''}
              >
                <title>{hasSimulation ? `${node.label}: Risk ${node.score}` : `${node.label}: waiting for simulation`}</title>
              </circle>
              <text x={node.x + 18} y={node.y - 2} fill="#fff" fontSize="12">{node.label}</text>
              <text x={node.x + 18} y={node.y + 14} fill="#9ca3af" fontSize="11">
                {hasSimulation ? `Risk ${node.score}` : 'Pending'}
              </text>
            </g>
          );
        }) : (
          <text x="360" y="108" textAnchor="middle" fill="#94a3b8" fontSize="13">Run a simulation to render cascade propagation graph</text>
        )}
      </svg>

      <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        <div className="bg-gray-900/70 rounded px-2 py-1 text-gray-300">
          {hasSimulation ? `Runs: ${simulationRuns}` : '—'}
        </div>
        <div className="bg-gray-900/70 rounded px-2 py-1 text-gray-300">
          {hasSimulation ? 'Flow: Active weighted propagation' : '—'}
        </div>
        <div className="bg-gray-900/70 rounded px-2 py-1 text-gray-300">
          {focusedNode ? `${focusedNode.label} ${hasSimulation ? `(${focusedNode.score})` : ''}` : '—'}
        </div>
      </div>

      {hasSimulation ? (
        <div className="mt-2 grid grid-cols-1 lg:grid-cols-2 gap-2 text-xs">
          <div className="bg-gray-900/70 rounded px-3 py-2 text-gray-300">
            <div className="text-gray-100 font-semibold mb-1">Selected node</div>
            {focusedNode ? (
              <>
                <div>{focusedNode.label}</div>
                <div>
                  Risk score: <span className="text-cyan-300">{focusedNode.score}</span>
                  {' · '}
                  <span className={riskBand(focusedNode.score).color}>{riskBand(focusedNode.score).label}</span>
                </div>
              </>
            ) : 'Hover or click a node'}
          </div>
          <div className="bg-gray-900/70 rounded px-3 py-2 text-gray-300">
            <div className="text-gray-100 font-semibold mb-1">Selected connection</div>
            {focusedEdge ? (
              <>
                <div>{focusedEdge.from.label} → {focusedEdge.to.label}</div>
                <div>Propagation weight: <span className="text-amber-300">{focusedEdge.weight}%</span></div>
              </>
            ) : 'Hover a connection line to inspect weight'}
          </div>
        </div>
      ) : null}

      <div className="mt-2 rounded border border-gray-700 bg-gray-900/60 p-2 text-[11px] text-gray-300">
        <div className="font-semibold text-gray-100 mb-1">Use this data for</div>
        <div>Prioritize mitigation actions, compare failover-on vs failover-off propagation, and identify the highest-risk handoff point before customer impact.</div>
      </div>

      {hasSimulation ? (
        <div className="mt-3 rounded border border-gray-700 bg-gray-900/70 p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="text-sm font-semibold text-gray-100">Industry Impact Overlay</div>
            <div className="text-[11px] text-gray-400">Select an industry to inspect sector-level risk context</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {industryOverlays.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFocusedIndustryId(item.id)}
                className={`text-left rounded border px-3 py-2 transition ${
                  focusedIndustryId === item.id ? 'border-cyan-400 bg-cyan-900/20' : 'border-gray-700 bg-gray-900/60 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-gray-100">{item.industry}</span>
                  <span className="text-[11px] text-cyan-300">{item.score}</span>
                </div>
                <div className="mt-1 h-1.5 w-full rounded bg-gray-700 overflow-hidden">
                  <div className="h-full bg-cyan-500" style={{ width: `${item.score}%` }} />
                </div>
                <div className="mt-1 text-[11px] text-gray-400">Impact Index {item.score}</div>
              </button>
            ))}
          </div>

          <div className="mt-3 rounded border border-gray-700 bg-gray-900/80 p-2 text-xs text-gray-300">
            {activeIndustry ? (
              <>
                <div className="text-gray-100 font-semibold mb-1">{activeIndustry.industry}</div>
                <div><span className="text-cyan-300">Primary risk signal:</span> {activeIndustry.signal}</div>
                <div className="mt-1"><span className="text-cyan-300">Recommended action:</span> {activeIndustry.action}</div>
              </>
            ) : (
              <div className="text-gray-400">Select one or more industries to view sector-specific impact guidance.</div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}