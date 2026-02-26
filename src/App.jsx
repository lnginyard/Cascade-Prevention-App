import React from 'react';
import EventControlPanel from './data/components/EventControlPanel.jsx';
import CascadeVisualization from './data/components/CAscadeVisualization.jsx';
import SimulationFooterControls from './data/components/SimulationFooterControls.jsx';
import AIRiskPanel from './data/components/AIRiskPanel.jsx';
import ExposureGraph from './data/components/ExposureGraph.jsx';
import EventLogPanel from './data/components/EventLogPanel.jsx';
import { StoreProvider } from './state/Store.jsx';
import logo from './assets/cascade-logo.svg';

function App() {
  return (
    <StoreProvider>
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 text-white">
        <div className="mx-auto w-full max-w-[1520px] px-3 sm:px-5 py-4 sm:py-6 space-y-5">
          <header className="rounded-xl border border-gray-700/80 bg-gray-800/40 px-4 sm:px-6 py-4 sm:py-5 neon-panel">
            <div className="flex flex-col items-center text-center gap-2">
              <img src={logo} alt="Cascade Prevention Engine logo" className="h-12 w-12 sm:h-14 sm:w-14" />
              <h1 className="text-xl sm:text-3xl font-semibold tracking-wide">Cascade Prevention Engine Dashboard</h1>
              <p className="text-xs sm:text-sm text-gray-300 max-w-3xl">
                Simulate disruptions, visualize global cascade impact, and review AI-guided mitigation signals in one continuous workflow.
              </p>
            </div>
          </header>

          <main className="rounded-xl border border-gray-700/80 bg-gray-800/25 p-3 sm:p-4">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
              <section className="xl:col-span-8">
                <CascadeVisualization />
              </section>
              <aside className="xl:col-span-4 xl:sticky xl:top-5">
                <EventControlPanel />
              </aside>
            </div>
            <div className="mt-4">
              <SimulationFooterControls />
            </div>
          </main>

          <section className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
            <div className="xl:col-span-5">
              <AIRiskPanel />
            </div>
            <div className="xl:col-span-7 space-y-4">
              <ExposureGraph />
              <EventLogPanel />
            </div>
          </section>
        </div>
      </div>
    </StoreProvider>
  );
}
export default App;