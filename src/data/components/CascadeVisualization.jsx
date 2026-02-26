import React from 'react';
import { useStore } from '../../state/Store.jsx';
import { geoGraticule10, geoOrthographic, geoPath } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import worldAtlasData from 'world-atlas/countries-110m.json';

const GLOBE_CENTER_X = 500;
const GLOBE_CENTER_Y = 300;
const SOURCE_X = 84;
const SOURCE_Y = 300;

const EVENT_LOCATIONS = {
  ev_hurricane_gulf_cat4: 'Gulf of Mexico',
  ev_wildfire_ca: 'California, US',
  ev_aws_outage: 'US-East-1 (N. Virginia)',
};

const FOCUS_AREAS = [
  { id: 'na', label: 'North America', coordinates: [-100, 40] },
  { id: 'eu', label: 'Europe', coordinates: [12, 51] },
  { id: 'apac', label: 'APAC', coordinates: [120, 22] },
];

export default function CascadeVisualization() {
  const { scenario, simulationRuns, eventId, events, isLoadingScenario, isDataLoading } = useStore();
  const lines = scenario.lines || [];
  const hasSimulation = simulationRuns > 0;
  const [hoveredHotspot, setHoveredHotspot] = React.useState(null);
  const [selectedHotspot, setSelectedHotspot] = React.useState(null);
  const [globeOffset, setGlobeOffset] = React.useState({ x: 0, y: 0 });
  const [rotation, setRotation] = React.useState({ lon: -18, lat: -10 });
  const [zoomScale, setZoomScale] = React.useState(1);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartRef = React.useRef(null);
  const broadcastRings = React.useMemo(() => [198, 224, 250, 278, 308], []);
  const orbitLayers = React.useMemo(
    () => [
      { rx: 174, ry: 92, color: '#67e8f9', opacity: 0.52, width: 1.2, className: 'orbit-drift-a' },
      { rx: 190, ry: 74, color: '#22d3ee', opacity: 0.42, width: 1.1, className: 'orbit-drift-b' },
      { rx: 206, ry: 54, color: '#99f6e4', opacity: 0.35, width: 1.05, className: 'orbit-drift-a' },
      { rx: 214, ry: 112, color: '#67e8f9', opacity: 0.32, width: 1, className: 'orbit-drift-b' },
      { rx: 232, ry: 62, color: '#22d3ee', opacity: 0.28, width: 0.95, className: 'orbit-drift-a' },
      { rx: 246, ry: 128, color: '#5eead4', opacity: 0.2, width: 0.9, className: 'orbit-drift-b' },
    ],
    []
  );
  const sparkPoints = React.useMemo(
    () => [
      { x: 258, y: 162, r: 1.8 },
      { x: 300, y: 104, r: 1.3 },
      { x: 404, y: 88, r: 1.7 },
      { x: 602, y: 112, r: 1.4 },
      { x: 708, y: 172, r: 1.5 },
      { x: 750, y: 262, r: 1.8 },
      { x: 752, y: 362, r: 1.6 },
      { x: 684, y: 438, r: 1.4 },
      { x: 586, y: 490, r: 1.5 },
      { x: 456, y: 516, r: 1.3 },
      { x: 356, y: 484, r: 1.6 },
      { x: 280, y: 420, r: 1.2 },
    ],
    []
  );

  const worldGeometry = React.useMemo(() => {
    const projection = geoOrthographic()
      .translate([GLOBE_CENTER_X, GLOBE_CENTER_Y])
      .scale(186 * zoomScale)
      .clipAngle(90)
      .rotate([rotation.lon, rotation.lat])
      .precision(0.2);

    const projectPath = geoPath(projection);
    const countriesTopology = worldAtlasData.objects.countries;

    const landFeature = feature(worldAtlasData, countriesTopology);
    const countryBoundaries = mesh(worldAtlasData, countriesTopology, (a, b) => a !== b);
    const graticule = geoGraticule10();

    return {
      projection,
      landPath: projectPath(landFeature) || '',
      boundaryPath: projectPath(countryBoundaries) || '',
      graticulePath: projectPath(graticule) || '',
    };
  }, [rotation.lat, rotation.lon, zoomScale]);

  const hotspots = React.useMemo(
    () =>
      FOCUS_AREAS.map((area, index) => {
        const projectedPoint = worldGeometry.projection(area.coordinates);
        return {
          ...area,
          score: scenario.nodes?.[index]?.score || 0,
          cx: projectedPoint ? projectedPoint[0] : GLOBE_CENTER_X,
          cy: projectedPoint ? projectedPoint[1] : GLOBE_CENTER_Y,
          visible: Boolean(projectedPoint),
        };
      }),
    [scenario.nodes, worldGeometry.projection]
  );

  const alignedTracks = React.useMemo(() => {
    const sourceX = SOURCE_X;
    const sourceY = SOURCE_Y;
    const globeCenterX = GLOBE_CENTER_X;
    const globeCenterY = GLOBE_CENTER_Y;
    const visibleHotspots = hotspots.filter((hotspot) => hotspot.visible);

    return lines.map((line, index) => {
      const hotspot = visibleHotspots[index % visibleHotspots.length] || hotspots[index % hotspots.length];
      const targetX = hotspot?.cx ?? GLOBE_CENTER_X - 138;
      const targetY = hotspot?.cy ?? 300;
      const orbitRadius = Math.max(110, Math.hypot(targetX - globeCenterX, targetY - globeCenterY));
      const entryAngle = Math.PI + (-0.34 + index * 0.18);
      const entryX = globeCenterX + orbitRadius * Math.cos(entryAngle);
      const entryY = globeCenterY + orbitRadius * Math.sin(entryAngle);
      const controlX1 = sourceX + 170 + index * 18;
      const controlY1 = sourceY - 86 + index * 26;
      const controlX2 = entryX - 120;
      const controlY2 = entryY - 24 + index * 10;
      const sweepFlag = targetY < globeCenterY ? 1 : 0;

      return {
        ...line,
        path: `M${sourceX},${sourceY} C${controlX1},${controlY1} ${controlX2},${controlY2} ${entryX},${entryY} A${orbitRadius},${orbitRadius} 0 0 ${sweepFlag} ${targetX},${targetY}`,
        endX: targetX,
        endY: targetY,
      };
    });
  }, [hotspots, lines]);

  const activeHotspot = selectedHotspot || hoveredHotspot;
  const activeEvent = React.useMemo(() => events.find((event) => event.id === eventId) || null, [eventId, events]);
  const sourceLocationLabel = EVENT_LOCATIONS[eventId] || 'Unknown origin';
  const sourceEventLabel = activeEvent?.name || 'Selected Event';

  React.useEffect(() => {
    if (hasSimulation) return;
    setHoveredHotspot(null);
    setSelectedHotspot(null);
    setRotation({ lon: -18, lat: -10 });
    setZoomScale(1);
    setGlobeOffset({ x: 0, y: 0 });
    dragStartRef.current = null;
    setIsDragging(false);
  }, [hasSimulation]);

  function handlePointerMove(event) {
    if (isDragging && dragStartRef.current) {
      const deltaX = event.clientX - dragStartRef.current.startX;
      const deltaY = event.clientY - dragStartRef.current.startY;
      const nextLon = dragStartRef.current.baseLon + deltaX * 0.28;
      const nextLat = Math.max(-55, Math.min(55, dragStartRef.current.baseLat - deltaY * 0.2));
      setRotation({ lon: nextLon, lat: nextLat });
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 14;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 10;
    setGlobeOffset({ x, y });
  }

  function startDrag(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const svgX = ((event.clientX - rect.left) / rect.width) * 1000;
    const svgY = ((event.clientY - rect.top) / rect.height) * 600;
    const distanceFromCenter = Math.hypot(svgX - GLOBE_CENTER_X, svgY - GLOBE_CENTER_Y);

    if (distanceFromCenter > 200) return;

    dragStartRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      baseLon: rotation.lon,
      baseLat: rotation.lat,
    };
    setIsDragging(true);
  }

  function endDrag() {
    dragStartRef.current = null;
    setIsDragging(false);
  }

  function resetPointer() {
    endDrag();
    setGlobeOffset({ x: 0, y: 0 });
  }

  function focusOnArea(area) {
    setRotation({ lon: -area.coordinates[0], lat: -area.coordinates[1] * 0.85 });
    setZoomScale(1.25);
    setSelectedHotspot(area);
  }

  function handleHotspotKey(event, hotspot) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      focusOnArea(hotspot);
    }
  }

  function resetView() {
    setRotation({ lon: -18, lat: -10 });
    setZoomScale(1);
  }

  return (
    <section className="bg-black rounded border border-gray-700 p-3 sm:p-4 min-h-[24rem] sm:min-h-[28rem] md:min-h-[32rem] neon-panel flex flex-col">
      <div className="flex-1 overflow-hidden rounded">
        <svg
          viewBox="0 0 1000 600"
          width="100%"
          height="100%"
          role="img"
          aria-label="Interactive global cascade map. Click and drag to rotate, click regions to zoom."
          className={`neon-grid-bg ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={startDrag}
          onMouseUp={endDrag}
          onMouseMove={handlePointerMove}
          onMouseLeave={resetPointer}
          onDoubleClick={resetView}
        >
        <defs>
          <radialGradient id="globeGradient" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.9" />
              <stop offset="55%" stopColor="#0891b2" stopOpacity="0.58" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.98" />
          </radialGradient>
          <radialGradient id="globeHalo" cx="50%" cy="50%" r="56%">
            <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.42" />
            <stop offset="72%" stopColor="#22d3ee" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="scanGradient" cx="50%" cy="50%" r="65%">
            <stop offset="0%" stopColor="#99f6e4" stopOpacity="0.4" />
            <stop offset="55%" stopColor="#22d3ee" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
          </radialGradient>
          <filter id="outerGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="4" result="blurred" />
            <feMerge>
              <feMergeNode in="blurred" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
            <clipPath id="globeClip">
              <circle cx={GLOBE_CENTER_X} cy={GLOBE_CENTER_Y} r="186" />
            </clipPath>
        </defs>

        {!hasSimulation ? (
          <g>
            <text x="500" y="285" textAnchor="middle" fill="#e5e7eb" fontSize="20" fontWeight="600">
              No active simulation
            </text>
            <text x="500" y="314" textAnchor="middle" fill="#94a3b8" fontSize="13">
              Select an event and click Run Cascade Simulation to generate propagation.
            </text>
          </g>
        ) : (
          <>

        {/* origin */}
        <circle cx={SOURCE_X} cy={SOURCE_Y} r={13} fill="none" stroke="#67e8f9" strokeOpacity={0.7} strokeWidth={1.15} className="beacon-pulse" />
        <circle cx={SOURCE_X} cy={SOURCE_Y} r={9} fill="#00e6ff" className="neon-pulse" >
          <title>{`${sourceEventLabel} • ${sourceLocationLabel}`}</title>
        </circle>
        <g transform={`translate(${SOURCE_X + 16}, ${SOURCE_Y - 36})`}>
          <rect x={0} y={0} width={230} height={42} rx={6} fill="#0b1120" fillOpacity={0.8} stroke="#22d3ee" strokeOpacity={0.65} />
          <text x={10} y={15} fill="#a5f3fc" fontSize="10" letterSpacing="0.3">Event Origin</text>
          <text x={10} y={30} fill="#f8fafc" fontSize="11" fontWeight="600">{sourceLocationLabel}</text>
        </g>

        {hasSimulation
          ? alignedTracks.map((ln, idx) => (
              <path
                key={idx}
                d={ln.path}
                stroke="#00e6ff"
                strokeWidth={ln.strokeWidth || 2}
                fill="none"
                opacity={ln.opacity || 0.9}
                className="cascade-line"
                style={{ animationDelay: `${ln.delay || idx * 0.2}s` }}
              >
                <title>{ln.tooltip || 'Propagation flow line'}</title>
              </path>
            ))
          : null}

        {hasSimulation
          ? alignedTracks.map((ln, idx) => (
              <g key={`flow-${idx}`} className="pointer-events-none">
                <circle r="3.2" fill="#67e8f9" opacity="0.9">
                  <animateMotion
                    dur={`${2.8 + idx * 0.6}s`}
                    repeatCount="indefinite"
                    rotate="auto"
                    begin={`${idx * 0.25}s`}
                    path={ln.path}
                  />
                  <animate attributeName="opacity" values="0.2;1;0.2" dur="1.4s" repeatCount="indefinite" />
                </circle>
                <circle r="2" fill="#fde68a" opacity="0.8">
                  <animateMotion
                    dur={`${3.4 + idx * 0.8}s`}
                    repeatCount="indefinite"
                    rotate="auto"
                    begin={`${0.45 + idx * 0.25}s`}
                    path={ln.path}
                  />
                  <animate attributeName="opacity" values="0.1;0.8;0.1" dur="1.8s" repeatCount="indefinite" />
                </circle>
              </g>
            ))
          : null}

        {hasSimulation
          ? alignedTracks.map((ln, idx) => (
              <circle key={`p${idx}`} cx={ln.endX} cy={ln.endY} r={5} fill="#ffd166" className="neon-pulse">
                <title>{`Endpoint risk ${(ln.impact * 100).toFixed(0)}%`}</title>
              </circle>
            ))
          : null}

        <g transform={`translate(${globeOffset.x}, ${globeOffset.y})`}>
          <circle cx={GLOBE_CENTER_X} cy={GLOBE_CENTER_Y} r={300} fill="url(#globeHalo)" opacity="0.92" />
          {sparkPoints.map((spark, index) => (
            <circle key={`spark-${index}`} cx={spark.x} cy={spark.y} r={spark.r} fill="#67e8f9" className="beacon-pulse" style={{ animationDelay: `${index * 0.2}s` }} />
          ))}

          {hasSimulation
            ? broadcastRings.map((radius, index) => (
                <circle
                  key={`broadcast-ring-${radius}`}
                  cx={GLOBE_CENTER_X}
                  cy={GLOBE_CENTER_Y}
                  r={radius}
                  fill="none"
                  stroke="#67e8f9"
                  strokeOpacity={0.42 - index * 0.09}
                  strokeWidth={1.35}
                  className="broadcast-ring"
                  style={{ animationDelay: `${index * 0.55}s` }}
                />
              ))
            : null}

          <circle cx={GLOBE_CENTER_X} cy={GLOBE_CENTER_Y} r={186} fill="url(#globeGradient)" stroke="#67e8f9" strokeWidth={2.6} />
          <circle cx={GLOBE_CENTER_X} cy={GLOBE_CENTER_Y} r={194} fill="none" stroke="#a5f3fc" strokeOpacity={0.65} strokeWidth={1.25} filter="url(#outerGlow)" />
          <ellipse cx={GLOBE_CENTER_X} cy={GLOBE_CENTER_Y} rx={158} ry={186} fill="none" stroke="#67e8f9" strokeOpacity={0.42} />
          <ellipse cx={GLOBE_CENTER_X} cy={GLOBE_CENTER_Y} rx={100} ry={186} fill="none" stroke="#67e8f9" strokeOpacity={0.32} />
          <ellipse cx={GLOBE_CENTER_X} cy={GLOBE_CENTER_Y} rx={186} ry={36} fill="none" stroke="#67e8f9" strokeOpacity={0.3} />
          <ellipse cx={GLOBE_CENTER_X} cy={GLOBE_CENTER_Y} rx={186} ry={80} fill="none" stroke="#67e8f9" strokeOpacity={0.25} />
          <ellipse cx={GLOBE_CENTER_X} cy={GLOBE_CENTER_Y} rx={186} ry={124} fill="none" stroke="#67e8f9" strokeOpacity={0.22} />

          {hasSimulation ? (
            <g className="scan-sweep">
              <path d="M500,300 L500,140 A160,160 0 0 1 640,240 Z" fill="url(#scanGradient)" opacity="0.55" />
            </g>
          ) : null}

          <g clipPath="url(#globeClip)" opacity="0.98">
            <path d={worldGeometry.landPath} fill="#16a34a" fillOpacity="0.92" stroke="#86efac" strokeOpacity="0.28" strokeWidth="0.7" />
            <path d={worldGeometry.graticulePath} fill="none" stroke="#99f6e4" strokeOpacity="0.22" strokeWidth="0.55" />
            <path d={worldGeometry.boundaryPath} fill="none" stroke="#ecfeff" strokeOpacity="0.56" strokeWidth="0.65" />
          </g>

          {hasSimulation ? (
            <>
              <circle cx={GLOBE_CENTER_X} cy={GLOBE_CENTER_Y} r={160} fill="none" stroke="#67e8f9" strokeOpacity={0.58} className="globe-spin" />
              {orbitLayers.map((orbit, index) => (
                <ellipse
                  key={`orbit-${index}`}
                  cx={GLOBE_CENTER_X}
                  cy={GLOBE_CENTER_Y}
                  rx={orbit.rx}
                  ry={orbit.ry}
                  fill="none"
                  stroke={orbit.color}
                  strokeOpacity={orbit.opacity}
                  strokeWidth={orbit.width}
                  className={orbit.className}
                  style={{ animationDelay: `${index * 0.35}s` }}
                />
              ))}
            </>
          ) : null}

          {hotspots
            .filter((hotspot) => hotspot.visible)
            .map((hotspot) => {
                const isActive = activeHotspot?.id === hotspot.id;
                return (
                  <g key={hotspot.id}>
                    <circle
                      cx={hotspot.cx}
                      cy={hotspot.cy}
                      r={isActive ? 18 : 14}
                      fill="none"
                      stroke="#67e8f9"
                      strokeOpacity={isActive ? 0.85 : 0.58}
                      strokeWidth={1.1}
                      className="beacon-pulse"
                    />
                    <circle
                      cx={hotspot.cx}
                      cy={hotspot.cy}
                      r={isActive ? 8 : 6}
                      fill="#ffd166"
                      stroke="#0f172a"
                      strokeWidth={2}
                      className="cursor-pointer neon-pulse"
                      role="button"
                      tabIndex={0}
                      aria-label={`${hotspot.label} hotspot. Click to zoom.`}
                      onMouseEnter={() => setHoveredHotspot(hotspot)}
                      onMouseLeave={() => setHoveredHotspot(null)}
                      onClick={() => focusOnArea(hotspot)}
                      onKeyDown={(event) => handleHotspotKey(event, hotspot)}
                    >
                      <title>{`${hotspot.label} • Click to zoom • Risk ${hotspot.score}`}</title>
                    </circle>
                    {isActive ? (
                      <text x={hotspot.cx + 10} y={hotspot.cy - 10} fill="#e5e7eb" fontSize="11">
                        {`${hotspot.label}${hasSimulation ? ` • Risk ${hotspot.score}` : ''}`}
                      </text>
                    ) : null}
                  </g>
                );
              })}

          {hasSimulation && hotspots.length > 2 ? (
            <path
              d={`M${hotspots[0].cx},${hotspots[0].cy} L${hotspots[1].cx},${hotspots[1].cy} L${hotspots[2].cx},${hotspots[2].cy} Z`}
              fill="none"
              stroke="#5eead4"
              strokeOpacity={0.62}
              strokeWidth={1.1}
              className="triangulate-line"
            />
          ) : null}
        </g>
          </>
        )}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-300">
        <span>{isDataLoading ? 'Loading data…' : isLoadingScenario ? 'Refreshing scenario…' : 'Drag globe to rotate • click hotspots to zoom • double-click to reset view'}</span>
        <span className="text-cyan-300">{hasSimulation ? `${lines.length} active propagation paths` : 'Run simulation to activate propagation'}</span>
      </div>
    </section>
  );
}