import React from 'react';
import { useStore } from '../../state/Store.jsx';

export default function EventLogPanel() {
  const { eventLogs, simulationRuns } = useStore();
  const hasSimulation = simulationRuns > 0;

  return (
    <section className="bg-gray-800 border border-gray-700 rounded p-4 neon-panel" aria-label="Simulation events log">
      <div className="flex items-center justify-between mb-2">
        <strong>Observability Event Log</strong>
        <span className="text-xs text-gray-400">{eventLogs.length} entries</span>
      </div>
      <div className="max-h-64 overflow-auto space-y-2 pr-1">
        {!hasSimulation ? (
          <div className="h-24 rounded border border-dashed border-gray-700 bg-gray-900/40" />
        ) : eventLogs.length === 0 ? (
          <div className="text-sm text-gray-400">No actions yet. Run a simulation to start logging.</div>
        ) : (
          eventLogs.map((log) => (
            <div key={log.id} className="rounded border border-gray-700 bg-gray-900/60 p-2">
              <div className="text-[11px] text-cyan-300">{new Date(log.timestamp).toLocaleTimeString()}</div>
              <div className="text-xs text-gray-200">{log.message}</div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
