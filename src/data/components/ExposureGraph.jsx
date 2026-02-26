import React from 'react';
import { useStore } from '../../state/Store.jsx';

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

  const layoutNodes = React.useMemo(() => {
    if (!hasSimulation) {
      return [];
    }

    return [
      { ...(nodes[0] || { id: 'aws', label: 'Source', score: 0 }), x: 120, y: 120, state: 'active' },
      { ...(nodes[1] || { id: 'chain', label: 'Chain', score: 0 }), x: 360, y: 70, state: 'active' },
      { ...(nodes[2] || { id: 'edge', label: 'Edge', score: 0 }), x: 600, y: 120, state: 'active' },
    ];
  }, [hasSimulation, nodes]);

  const [focusedNodeId, setFocusedNodeId] = React.useState(null);

  React.useEffect(() => {
    if (!hasSimulation) {
      setFocusedNodeId(null);
      return;
    }
    setFocusedNodeId((prev) => prev || layoutNodes[0]?.id || null);
  }, [hasSimulation, layoutNodes]);

  const edges = React.useMemo(() => {
    if (layoutNodes.length < 3) return [];

    const edgeAWeight = hasSimulation ? Math.max(8, Math.round((layoutNodes[0].score + layoutNodes[1].score) / 2)) : 0;
    const edgeBWeight = hasSimulation ? Math.max(8, Math.round((layoutNodes[1].score + layoutNodes[2].score) / 2)) : 0;

    return [
      {
        id: 'edge-a',
        from: layoutNodes[0],
        to: layoutNodes[1],
        weight: edgeAWeight,
        path: `M${layoutNodes[0].x + 26},${layoutNodes[0].y - 8} Q240,54 ${layoutNodes[1].x - 30},${layoutNodes[1].y + 4}`,
      },
      {
        id: 'edge-b',
        from: layoutNodes[1],
        to: layoutNodes[2],
        weight: edgeBWeight,
        path: `M${layoutNodes[1].x + 32},${layoutNodes[1].y + 8} Q484,150 ${layoutNodes[2].x - 30},${layoutNodes[2].y - 8}`,
      },
    ];
  }, [hasSimulation, layoutNodes]);

  const focusedNode = layoutNodes.find((node) => node.id === focusedNodeId) || null;
  const svgRef = React.useRef(null);

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
      <svg ref={svgRef} viewBox="0 0 720 210" width="100%" height="210" className="rounded bg-gray-900/40" role="img" aria-label="Cascade propagation weighted graph">
        <defs>
          <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.25" />
            <stop offset="50%" stopColor="#67e8f9" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fde68a" stopOpacity="0.75" />
          </linearGradient>
        </defs>

        {hasSimulation ? edges.map((edge, index) => (
          <g key={edge.id}>
            <path
              d={edge.path}
              stroke="url(#edgeGradient)"
              strokeWidth={hasSimulation ? Math.max(1.8, edge.weight / 20) : 1.2}
              strokeOpacity={hasSimulation ? 0.95 : 0.22}
              fill="none"
              className={hasSimulation ? 'graph-edge-flow' : ''}
              style={{ animationDelay: `${index * 0.3}s` }}
            />
            <text x={(edge.from.x + edge.to.x) / 2 - 12} y={(edge.from.y + edge.to.y) / 2 - 10} fill="#9ca3af" fontSize="10">
              {hasSimulation ? `${edge.weight}%` : 'idle'}
            </text>
          </g>
        )) : null}

        {hasSimulation ? layoutNodes.map((node) => {
          const isFocused = node.id === focusedNodeId;
          const nodeFill = hasSimulation ? (isFocused ? '#67e8f9' : '#22d3ee') : '#475569';

          return (
            <g key={node.id} onMouseEnter={() => setFocusedNodeId(node.id)} className="cursor-pointer">
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
    </section>
  );
}