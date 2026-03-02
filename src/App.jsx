import React from 'react';
import EventControlPanel from './data/components/EventControlPanel.jsx';
import CascadeVisualization from './data/components/CAscadeVisualization.jsx';
import SimulationFooterControls from './data/components/SimulationFooterControls.jsx';
import AIRiskPanel from './data/components/AIRiskPanel.jsx';
import ExposureGraph from './data/components/ExposureGraph.jsx';
import EventLogPanel from './data/components/EventLogPanel.jsx';
import { StoreProvider } from './state/Store.jsx';
import appLogo from './assets/Blue Abstract Circle Global Tech Logo.mp4';

function App() {
  const [heroStyle, setHeroStyle] = React.useState('neon');

  return (
    <StoreProvider>
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 text-white">
        <div className="mx-auto w-full max-w-[1520px] px-3 sm:px-5 py-4 sm:py-6 space-y-5">
          <header className={`rounded-xl px-4 sm:px-6 py-4 sm:py-5 neon-panel overflow-hidden relative ${heroStyle === 'ops' ? 'hero-variant-ops' : 'hero-variant-neon'}`}>
            <div className="header-scanline" aria-hidden="true" />
            <div className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded border border-slate-600 bg-slate-900/75 p-1 text-[10px]">
              <button
                type="button"
                onClick={() => setHeroStyle('ops')}
                className={`rounded px-2 py-1 transition ${heroStyle === 'ops' ? 'bg-amber-500/25 text-amber-200' : 'text-slate-300 hover:text-white'}`}
              >
                Ops
              </button>
              <button
                type="button"
                onClick={() => setHeroStyle('neon')}
                className={`rounded px-2 py-1 transition ${heroStyle === 'neon' ? 'bg-cyan-500/25 text-cyan-200' : 'text-slate-300 hover:text-white'}`}
              >
                Neon
              </button>
            </div>
            <div className="flex flex-col items-center text-center gap-2 relative z-10">
              <div className={`hero-logo-wrap ${heroStyle === 'ops' ? 'hero-logo-ops' : 'hero-logo-neon'}`}>
                <video
                  src={appLogo}
                  className="hero-logo-image"
                  autoPlay
                  loop
                  muted
                  playsInline
                  aria-label="Cascade Prevention Engine logo"
                />
              </div>
              <p className="mt-6 sm:mt-8 text-xs sm:text-sm text-gray-300 max-w-3xl">
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