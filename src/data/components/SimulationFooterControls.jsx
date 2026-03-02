import React from 'react';
import { actionTypes, ALL_INDUSTRIES, ALL_REGIONS, REGION_DISPLAY_NAMES, useStore, useStoreDispatch } from '../../state/Store.jsx';

export default function SimulationFooterControls() {
  const dispatch = useStoreDispatch();
  const { selectedIndustries, selectedRegions } = useStore();

  return (
    <section className="bg-gray-800 border border-gray-700 rounded p-4 neon-panel" role="region" aria-label="Simulation footer controls">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <div>
          <h4 className="font-semibold">Industries Impact Scope</h4>
          <p className="text-xs text-gray-400">Adjust impacted industries, then rerun simulation to refresh propagation.</p>
        </div>
        <button
          type="button"
          aria-label="Reset all simulation filters"
          className="sm:w-auto w-full bg-gray-600 hover:bg-gray-500 transition py-2 px-4 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
          onClick={() => dispatch({ type: actionTypes.RESET_FILTERS })}
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {ALL_INDUSTRIES.map((industry) => (
          <label key={industry} className="flex items-center gap-2 text-sm rounded border border-gray-700 bg-gray-900/70 px-2 py-1.5">
            <input
              type="checkbox"
              aria-label={`Toggle industry ${industry}`}
              checked={selectedIndustries.includes(industry)}
              onChange={() => dispatch({ type: actionTypes.TOGGLE_INDUSTRY, payload: industry })}
            />
            {industry}
          </label>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-700">
        <h5 className="font-semibold">AWS Regions Scope</h5>
        <p className="text-xs text-gray-400 mb-2">Select regions included in this cascade simulation.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {ALL_REGIONS.map((region) => (
            <label key={region} className="flex items-center gap-2 text-sm rounded border border-gray-700 bg-gray-900/70 px-2 py-1.5">
              <input
                type="checkbox"
                aria-label={`Toggle AWS region ${REGION_DISPLAY_NAMES[region] || region}`}
                checked={selectedRegions.includes(region)}
                onChange={() => dispatch({ type: actionTypes.TOGGLE_REGION, payload: region })}
              />
              <span className="leading-tight">
                <span className="block text-gray-100">{REGION_DISPLAY_NAMES[region] || region}</span>
                <span className="block text-[10px] text-gray-400">{region}</span>
              </span>
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}
