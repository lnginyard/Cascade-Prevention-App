import React from 'react';
import { useStore } from '../../state/Store.jsx';
import { geoGraticule10, geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import worldAtlasData from 'world-atlas/countries-110m.json';
import GlobeView from './GlobeView.jsx';

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 600;

const EVENT_LOCATIONS = {
  ev_hurricane_gulf_cat4: 'Gulf of Mexico',
  ev_wildfire_ca: 'California, US',
  ev_aws_outage: 'US-East-1 (N. Virginia)',
};

const SOURCE_COORDS = {
  ev_hurricane_gulf_cat4: { lat: 25, lng: -90 },
  ev_wildfire_ca: { lat: 36, lng: -119 },
  ev_aws_outage: { lat: 39, lng: -77.5 },
};

const WATER_LABELS = [
  { id: 'atlantic', name: 'Atlantic Ocean', lng: -30, lat: 8, level: 'major' },
  { id: 'pacific', name: 'Pacific Ocean', lng: -150, lat: 0, level: 'major' },
  { id: 'indian', name: 'Indian Ocean', lng: 82, lat: -22, level: 'major' },
  { id: 'arctic', name: 'Arctic Ocean', lng: 22, lat: 75, level: 'major' },
  { id: 'med', name: 'Mediterranean Sea', lng: 18, lat: 37, level: 'regional' },
  { id: 'gulf', name: 'Gulf of Mexico', lng: -90, lat: 24, level: 'regional' },
  { id: 'nile', name: 'Nile River', lng: 31, lat: 24, level: 'detail' },
  { id: 'amazon', name: 'Amazon River', lng: -60, lat: -4, level: 'detail' },
  { id: 'yangtze', name: 'Yangtze River', lng: 112, lat: 31, level: 'detail' },
];

const FOCUS_AREAS = [
  { id: 'na', label: 'North America', coordinates: [-100, 40] },
  { id: 'eu', label: 'Europe', coordinates: [12, 51] },
  { id: 'apac', label: 'APAC', coordinates: [120, 22] },
];

export default function CascadeVisualization() {
  const { scenario, simulationRuns, eventId, events, isLoadingScenario, isDataLoading } = useStore();
  const lines = scenario.lines || [];
  const hasSimulation = simulationRuns > 0;
  const [viewMode, setViewMode] = React.useState('globe');
  const [hoveredHotspot, setHoveredHotspot] = React.useState(null);
  const [selectedHotspot, setSelectedHotspot] = React.useState(null);
  const [flatZoom, setFlatZoom] = React.useState(1);

  const mapGeometry = React.useMemo(() => {
    const countriesTopology = worldAtlasData.objects.countries;
    const landFeature = feature(worldAtlasData, countriesTopology);

    const projection = geoNaturalEarth1()
      .fitExtent([[24, 24], [MAP_WIDTH - 24, MAP_HEIGHT - 24]], landFeature)
      .scale(170 * flatZoom + 60);

    const projectPath = geoPath(projection);
    const countryBoundaries = mesh(worldAtlasData, countriesTopology, (a, b) => a !== b);
    const graticule = geoGraticule10();

    return {
      projection,
      landPath: projectPath(landFeature) || '',
      boundaryPath: projectPath(countryBoundaries) || '',
      graticulePath: projectPath(graticule) || '',
    };
  }, [flatZoom]);

  const hotspots = React.useMemo(
    () =>
      FOCUS_AREAS.map((area, index) => {
        const projectedPoint = mapGeometry.projection(area.coordinates);
        return {
          ...area,
          score: scenario.nodes?.[index]?.score || 0,
          cx: projectedPoint ? projectedPoint[0] : MAP_WIDTH / 2,
          cy: projectedPoint ? projectedPoint[1] : MAP_HEIGHT / 2,
          visible: Boolean(projectedPoint),
        };
      }),
    [mapGeometry.projection, scenario.nodes]
  );

  const activeHotspots = React.useMemo(() => {
    if (!lines.length) return [];
    return lines.map((_, index) => hotspots[index % hotspots.length]).filter(Boolean);
  }, [hotspots, lines]);

  const activeHotspot = selectedHotspot || hoveredHotspot;
  const activeEvent = React.useMemo(() => events.find((event) => event.id === eventId) || null, [eventId, events]);
  const sourceLocationLabel = EVENT_LOCATIONS[eventId] || 'Unknown origin';
  const sourceEventLabel = activeEvent?.name || 'Selected Event';
  const sourceCoords = SOURCE_COORDS[eventId] || { lat: 20, lng: 0 };

  const sourcePoint = React.useMemo(() => {
    const projected = mapGeometry.projection([sourceCoords.lng, sourceCoords.lat]);
    return {
      x: projected ? projected[0] : MAP_WIDTH * 0.3,
      y: projected ? projected[1] : MAP_HEIGHT * 0.5,
    };
  }, [mapGeometry.projection, sourceCoords.lat, sourceCoords.lng]);

  const alignedTracks = React.useMemo(() => {
    return activeHotspots.map((hotspot, index) => {
      const impact = lines[index]?.impact || 0.6;
      const controlX = (sourcePoint.x + hotspot.cx) / 2;
      const controlY = Math.min(sourcePoint.y, hotspot.cy) - (90 + index * 16);
      return {
        id: `track-${hotspot.id}`,
        impact,
        startX: sourcePoint.x,
        startY: sourcePoint.y,
        endX: hotspot.cx,
        endY: hotspot.cy,
        path: `M${sourcePoint.x},${sourcePoint.y} Q${controlX},${controlY} ${hotspot.cx},${hotspot.cy}`,
      };
    });
  }, [activeHotspots, lines, sourcePoint.x, sourcePoint.y]);

  const waterLabels = React.useMemo(() => {
    const showDetail = flatZoom > 1.08;
    return WATER_LABELS
      .filter((item) => showDetail || item.level !== 'detail')
      .map((item) => {
        const projected = mapGeometry.projection([item.lng, item.lat]);
        return {
          ...item,
          x: projected ? projected[0] : null,
          y: projected ? projected[1] : null,
          fontSize: item.level === 'major' ? 9 : item.level === 'regional' ? 8 : 7,
        };
      })
      .filter((label) => label.x !== null && label.y !== null);
  }, [flatZoom, mapGeometry.projection]);

  React.useEffect(() => {
    if (hasSimulation) return;
    setHoveredHotspot(null);
    setSelectedHotspot(null);
    setFlatZoom(1);
  }, [hasSimulation]);

  return (
    <section className="bg-black rounded border border-gray-700 p-3 sm:p-4 min-h-[24rem] sm:min-h-[28rem] md:min-h-[32rem] neon-panel flex flex-col">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] text-slate-300">View Mode</div>
        <div className="flex items-center gap-1 rounded border border-slate-700 bg-slate-900/80 p-1 text-xs">
          <button
            type="button"
            onClick={() => setViewMode('globe')}
            className={`rounded px-2 py-1 transition ${viewMode === 'globe' ? 'bg-cyan-500/25 text-cyan-200' : 'text-slate-300 hover:text-white'}`}
          >
            Globe
          </button>
          <button
            type="button"
            onClick={() => setViewMode('flat')}
            className={`rounded px-2 py-1 transition ${viewMode === 'flat' ? 'bg-cyan-500/25 text-cyan-200' : 'text-slate-300 hover:text-white'}`}
          >
            Flat Map
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden rounded" style={{ position: 'relative' }}>
        {hasSimulation ? (
          viewMode === 'globe' ? (
            <div style={{ width: '100%', height: '100%' }}>
              <GlobeView
                focusAreas={FOCUS_AREAS}
                eventId={eventId}
                activeEvent={activeEvent}
                lines={lines}
              />
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
              width="100%"
              height="100%"
              role="img"
              aria-label="Interactive flat map with event origin and impact propagation tracks"
              className="neon-grid-bg"
            >
              <defs>
                <linearGradient id="flatOceanGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(29, 78, 216, 0.44)" />
                  <stop offset="45%" stopColor="rgba(37, 99, 235, 0.34)" />
                  <stop offset="100%" stopColor="rgba(15, 23, 42, 0.42)" />
                </linearGradient>
                {alignedTracks.map((track) => (
                  <linearGradient
                    key={`gradient-${track.id}`}
                    id={`track-gradient-${track.id}`}
                    gradientUnits="userSpaceOnUse"
                    x1={track.startX}
                    y1={track.startY}
                    x2={track.endX}
                    y2={track.endY}
                  >
                    <stop offset="0%" stopColor={`rgba(236, 72, 153, ${0.72 + track.impact * 0.14})`} />
                    <stop offset="100%" stopColor={`rgba(250, 204, 21, ${0.82 + track.impact * 0.14})`} />
                  </linearGradient>
                ))}
              </defs>

              <rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#flatOceanGradient)" />
              <path d={mapGeometry.graticulePath} fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="0.8" />
              <path d={mapGeometry.landPath} fill="rgba(63,129,81,0.62)" stroke="rgba(255,255,255,0.16)" strokeWidth="0.8" />
              <path d={mapGeometry.boundaryPath} fill="none" stroke="rgba(255,255,255,0.82)" strokeWidth="0.9" />

              {waterLabels.map((label) => (
                <text
                  key={label.id}
                  x={label.x}
                  y={label.y}
                  fill="rgba(219, 234, 254, 0.68)"
                  fontSize={label.fontSize}
                  textAnchor="middle"
                  letterSpacing="0.3"
                >
                  {label.name}
                </text>
              ))}

              {alignedTracks.map((track) => (
                <g key={track.id}>
                  <path d={track.path} fill="none" stroke={`url(#track-gradient-${track.id})`} strokeOpacity="0.36" strokeWidth="7" />
                  <path d={track.path} fill="none" stroke={`url(#track-gradient-${track.id})`} strokeWidth="2.3" className="cascade-line" />
                </g>
              ))}

              <circle cx={sourcePoint.x} cy={sourcePoint.y} r="6" fill="#ffd166" stroke="rgba(255,255,255,0.92)" strokeWidth="1.3" className="beacon-pulse" />
              <text x={sourcePoint.x + 8} y={sourcePoint.y - 8} fill="rgba(255, 224, 154, 0.96)" fontSize="10">
                {sourceEventLabel}
              </text>
              <text x={sourcePoint.x + 8} y={sourcePoint.y + 5} fill="rgba(255, 224, 154, 0.78)" fontSize="9">
                {sourceLocationLabel}
              </text>

              {activeHotspots.map((hotspot) => (
                <g key={hotspot.id} onMouseEnter={() => setHoveredHotspot(hotspot)} onMouseLeave={() => setHoveredHotspot(null)} onClick={() => setSelectedHotspot(hotspot)}>
                  <circle cx={hotspot.cx} cy={hotspot.cy} r={5.5} fill="rgba(255,255,255,0.9)" stroke="rgba(255,255,255,1)" strokeWidth="1" />
                  <text x={hotspot.cx + 8} y={hotspot.cy - 5} fill="rgba(255,255,255,0.86)" fontSize="9">
                    {hotspot.label}
                  </text>
                </g>
              ))}
            </svg>
          )
        ) : (
          <svg
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            width="100%"
            height="100%"
            role="img"
            aria-label="Interactive global cascade map"
            className="neon-grid-bg"
          >
            <g>
              <text x={MAP_WIDTH / 2} y={285} textAnchor="middle" fill="#e5e7eb" fontSize="20" fontWeight="600">
                No active simulation
              </text>
              <text x={MAP_WIDTH / 2} y={314} textAnchor="middle" fill="#94a3b8" fontSize="13">
                Select an event and click Run Cascade Simulation to generate propagation.
              </text>
            </g>
          </svg>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-300">
        <span>
          {isDataLoading
            ? 'Loading data…'
            : isLoadingScenario
              ? 'Refreshing scenario…'
              : viewMode === 'globe'
                ? 'Globe mode: drag to rotate and zoom for detailed water labels'
                : 'Flat map mode: click locations to inspect impact destinations'}
        </span>
        {viewMode === 'flat' && hasSimulation ? (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setFlatZoom((prev) => Math.max(0.9, +(prev - 0.1).toFixed(2)))} className="rounded border border-slate-600 px-2 py-0.5 text-slate-200 hover:border-slate-400">−</button>
            <span className="text-slate-300">Map Zoom {flatZoom.toFixed(1)}x</span>
            <button type="button" onClick={() => setFlatZoom((prev) => Math.min(1.6, +(prev + 0.1).toFixed(2)))} className="rounded border border-slate-600 px-2 py-0.5 text-slate-200 hover:border-slate-400">+</button>
          </div>
        ) : null}
        <span className="text-cyan-300">{hasSimulation ? `${lines.length} active propagation paths` : 'Run simulation to activate propagation'}</span>
      </div>
      {hasSimulation && activeHotspot ? (
        <div className="mt-1 text-[11px] text-slate-300">
          <span className="text-slate-100">{activeHotspot.label}</span> • Impact score <span className="text-cyan-200">{activeHotspot.score}</span>
        </div>
      ) : null}
    </section>
  );
}