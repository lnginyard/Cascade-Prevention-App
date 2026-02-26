import React from 'react';
import {
  actionTypes,
  ALL_INDUSTRIES,
  ALL_REGIONS,
  useStore,
  useStoreDispatch,
} from '../../state/Store.jsx';

const DEMO_PRESETS = [
  {
    id: 'calm',
    label: 'Calm Baseline',
    caption: 'Normal operating conditions with broad regional coverage and lower cascade pressure.',
    eventId: 'ev_hurricane_gulf_cat4',
    selectedIndustries: ['Healthcare', 'Government'],
    selectedRegions: ['us-west-2', 'eu-central-1'],
    failoverEnabled: true,
  },
  {
    id: 'hurricane',
    label: 'Hurricane Impact',
    caption: 'Ports and supply chain pressure increase across Gulf-dependent operations.',
    eventId: 'ev_hurricane_gulf_cat4',
    selectedIndustries: ALL_INDUSTRIES,
    selectedRegions: ['us-east-1', 'us-west-2', 'eu-central-1'],
    failoverEnabled: false,
  },
  {
    id: 'outage',
    label: 'AWS Outage Ripple',
    caption: 'Service instability propagates quickly through customer-facing dependencies.',
    eventId: 'ev_aws_outage',
    selectedIndustries: ['E-Commerce', 'Financial Services', 'Logistics'],
    selectedRegions: ALL_REGIONS,
    failoverEnabled: false,
  },
];

export default function EventControlPanel() {
  const dispatch = useStoreDispatch();
  const {
    eventId,
    events,
    simulationRuns,
    isDataLoading,
    isLoadingScenario,
    failoverEnabled,
    demoCaption,
    loadError,
  } = useStore();
  const hasSimulation = simulationRuns > 0;

  const selectedEvent = events.find((event) => event.id === eventId);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded p-4 space-y-4 neon-panel transition-all duration-300" role="region" aria-label="Event simulation controls">
      <h3 className="font-semibold text-lg">Simulate Event</h3>
      <select
        aria-label="Select event to simulate"
        value={eventId}
        onChange={(e) => {
          dispatch({ type: actionTypes.SET_EVENT, payload: e.target.value });
        }}
        className="w-full bg-gray-700 text-white rounded p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
      >
        <option value="">Select an event…</option>
        {events.map((event) => (
          <option key={event.id} value={event.id}>{`${event.name}${event.type ? ` (${event.type})` : ''}`}</option>
        ))}
      </select>
      <button
        type="button"
        aria-label="Run cascade simulation"
        className="w-full bg-green-600 py-2 rounded disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-300"
        disabled={isLoadingScenario || isDataLoading}
        onClick={() => dispatch({ type: actionTypes.RUN_SIMULATION })}
      >
        {isDataLoading ? 'Loading data…' : isLoadingScenario ? 'Running…' : 'Run Cascade Simulation'}
      </button>

      <div className="bg-gray-900 rounded p-3 border border-gray-700">
        <div className="text-xs text-cyan-300 mb-2">Demo presets</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {DEMO_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              aria-label={`Load demo preset ${preset.label}`}
              className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs hover:border-cyan-400 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              onClick={() => dispatch({ type: actionTypes.SET_DEMO_SCENARIO, payload: preset })}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 mt-2">{demoCaption}</p>
      </div>

      <div className="bg-gray-900 rounded p-3">
        {hasSimulation ? (
          <>
            <p className="text-sm text-gray-300">
              Selected: {selectedEvent?.name || 'Loading…'}
            </p>
            <p className="text-xs text-cyan-300">
              Type: {selectedEvent?.type || 'Unclassified'}
            </p>
            <p className="text-xs text-gray-400">
              {selectedEvent?.description || 'Preparing event profile'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Simulation runs: {simulationRuns}</p>
            <p className="text-xs text-cyan-300 mt-1">Data source: Local events.json + propagation.json (simulated latency)</p>
            {loadError ? <p className="text-xs text-red-300 mt-1">{loadError}</p> : null}
          </>
        ) : (
          <div className="h-16 rounded border border-dashed border-gray-700 bg-gray-900/40" />
        )}
      </div>

      <label className="flex items-center justify-between gap-3 bg-gray-900 rounded p-3 border border-gray-700 text-sm">
        <span>Cross-region reroute (failover)</span>
        <input
          type="checkbox"
          aria-label="Toggle cross-region failover reroute"
          checked={failoverEnabled}
          onChange={(event) => dispatch({ type: actionTypes.SET_FAILOVER_ENABLED, payload: event.target.checked })}
        />
      </label>

      <p className="text-[11px] text-gray-400">Keyboard hint: Tab to controls and press Space/Enter to toggle run/reset and preset buttons.</p>
    </div>
  );
}