import React from 'react';
import { geoOrthographic, geoPath, geoGraticule10, geoDistance, geoInterpolate } from 'd3-geo';
import { feature } from 'topojson-client';
import countriesData from 'world-atlas/countries-110m.json';

const SOURCE_COORDS = {
  ev_hurricane_gulf_cat4: { lat: 25, lng: -90 },
  ev_wildfire_ca: { lat: 36, lng: -119 },
  ev_aws_outage: { lat: 39, lng: -77.5 },
};
const COUNTRY_FEATURES = feature(countriesData, countriesData.objects.countries).features;
const WATER_LABELS = [
  { id: 'atlantic-ocean', name: 'Atlantic Ocean', lat: 8, lng: -32, level: 'major' },
  { id: 'pacific-ocean', name: 'Pacific Ocean', lat: 0, lng: -150, level: 'major' },
  { id: 'indian-ocean', name: 'Indian Ocean', lat: -20, lng: 80, level: 'major' },
  { id: 'arctic-ocean', name: 'Arctic Ocean', lat: 76, lng: 20, level: 'major' },
  { id: 'southern-ocean', name: 'Southern Ocean', lat: -58, lng: 20, level: 'major' },
  { id: 'mediterranean', name: 'Mediterranean Sea', lat: 36, lng: 18, level: 'regional' },
  { id: 'gulf-of-mexico', name: 'Gulf of Mexico', lat: 24, lng: -90, level: 'regional' },
];

const rad = degrees => degrees * Math.PI / 180;

export default function GlobeView({ focusAreas = [], eventId, activeEvent, lines = [] }) {
  const hostRef = React.useRef(null);
  const [size, setSize] = React.useState({ width: 760, height: 520 });
  const [rotation, setRotation] = React.useState(0);
  const source = SOURCE_COORDS[eventId] || { lat: 20, lng: 0 };
  const sourceLabel = activeEvent?.name || 'Event Origin';

  React.useEffect(() => {
    if (!hostRef.current || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect;
      if (rect?.width) setSize({ width: Math.max(320, rect.width), height: Math.max(300, Math.min(560, rect.width * 0.68)) });
    });
    observer.observe(hostRef.current);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    const timer = window.setInterval(() => setRotation(value => (value + 0.22) % 360), 90);
    return () => window.clearInterval(timer);
  }, []);

  const { width, height } = size;
  const projection = React.useMemo(() => geoOrthographic()
    .translate([width / 2, height / 2])
    .scale(Math.min(width * 0.43, height * 0.43))
    .rotate([-rotation - source.lng, -source.lat, 0])
    .clipAngle(90), [width, height, rotation, source.lat, source.lng]);
  const path = React.useMemo(() => geoPath(projection), [projection]);
  const spherePath = path({ type: 'Sphere' });
  const graticulePath = path(geoGraticule10());
  const countryPaths = COUNTRY_FEATURES.map(country => ({ id: country.id, d: path(country) })).filter(country => country.d);
  const center = [-source.lng - rotation, -source.lat];
  const visible = (lat, lng) => geoDistance([lng, lat], [-center[0], -center[1]]) <= Math.PI / 2;

  const impactAreas = lines.length
    ? lines.map((line, idx) => ({ area: focusAreas[idx % Math.max(1, focusAreas.length)], line, idx })).filter(item => item.area)
    : [];
  const arcPoints = (start, end, count = 44) => {
    const interpolate = geoInterpolate([start.lng, start.lat], [end.lng, end.lat]);
    return { type: 'LineString', coordinates: Array.from({ length: count + 1 }, (_, i) => interpolate(i / count)) };
  };
  const impacts = impactAreas.map(({ area, line, idx }) => {
    const end = { lat: (area.coordinates && area.coordinates[1]) || 0, lng: (area.coordinates && area.coordinates[0]) || 0 };
    return { id: area.id || idx, area, end, line, d: path(arcPoints(source, end)), point: projection([end.lng, end.lat]) };
  }).filter(item => item.d);
  const origin = projection([source.lng, source.lat]);

  return (
    <div ref={hostRef} className="globe-view" style={{ width: '100%', height: '100%', minHeight: 320, position: 'relative', overflow: 'hidden' }}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Simulated globe showing the selected disruption origin and affected regions" style={{ display: 'block', width: '100%', height: '100%' }}>
        <defs>
          <radialGradient id="aicpe-globe-water" cx="35%" cy="28%" r="80%">
            <stop offset="0%" stopColor="#1d5575" />
            <stop offset="65%" stopColor="#10324d" />
            <stop offset="100%" stopColor="#07121f" />
          </radialGradient>
          <radialGradient id="aicpe-globe-glow">
            <stop offset="0%" stopColor="#00e6ff" stopOpacity=".22" />
            <stop offset="100%" stopColor="#00e6ff" stopOpacity="0" />
          </radialGradient>
          <clipPath id="aicpe-globe-clip"><path d={spherePath || ''} /></clipPath>
        </defs>
        <circle cx={width / 2} cy={height / 2} r={Math.min(width * .43, height * .43) + 24} fill="url(#aicpe-globe-glow)" />
        <path d={spherePath || ''} fill="url(#aicpe-globe-water)" stroke="#4bcbe4" strokeOpacity=".75" strokeWidth="1.2" />
        <g clipPath="url(#aicpe-globe-clip)">
          <path d={graticulePath || ''} fill="none" stroke="#7ac7df" strokeOpacity=".18" strokeWidth=".55" />
          {countryPaths.map(country => <path key={country.id} d={country.d} fill="#397a56" fillOpacity=".85" stroke="#c4f3e7" strokeOpacity=".55" strokeWidth=".45" />)}
          {impacts.map(item => <path key={item.id} d={item.d} fill="none" stroke="#facc15" strokeOpacity=".9" strokeWidth={1.4 + ((item.line && item.line.impact) || .5) * 1.4} strokeDasharray="5 5" />)}
          {impacts.map(item => item.point && <g key={`point-${item.id}`} transform={`translate(${item.point[0]},${item.point[1]})`}><circle r="7" fill="#facc15" fillOpacity=".15"><animate attributeName="r" values="5;12;5" dur="2.4s" repeatCount="indefinite" /></circle><circle r="3.1" fill="#fff" stroke="#facc15" strokeWidth="1.5" /></g>)}
          {origin && <g transform={`translate(${origin[0]},${origin[1]})`}><circle r="12" fill="#ffd166" fillOpacity=".13"><animate attributeName="r" values="7;15;7" dur="1.8s" repeatCount="indefinite" /></circle><circle r="4.5" fill="#ffd166" stroke="#fff5cc" strokeWidth="1.5" /></g>}
        </g>
        {origin && <text x={origin[0] + 9} y={origin[1] - 10} fill="#fde68a" fontSize="10" fontWeight="700" stroke="#07121f" strokeWidth="2.5" paintOrder="stroke">{sourceLabel}</text>}
        {impacts.map(item => item.point && <text key={`label-${item.id}`} x={item.point[0] + 7} y={item.point[1] + 15} fill="#fff" fontSize="9" stroke="#07121f" strokeWidth="2.5" paintOrder="stroke">{item.area.label || 'Affected region'}</text>)}
        {WATER_LABELS.filter(label => label.level === 'major' && visible(label.lat, label.lng)).map(label => {
          const point = projection([label.lng, label.lat]);
          return point ? <text key={label.id} x={point[0]} y={point[1]} textAnchor="middle" fill="#d7f3ff" fillOpacity=".7" fontSize="9" fontStyle="italic">{label.name}</text> : null;
        })}
      </svg>
      <div style={{ position: 'absolute', left: 12, bottom: 12, fontSize: 9, letterSpacing: '.12em', color: '#8ba9bd', fontFamily: 'ui-monospace, monospace' }}>SIMULATED PROPAGATION · LOCAL SCENARIO DATA</div>
    </div>
  );
}
