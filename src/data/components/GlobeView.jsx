import React from 'react';
import Globe from 'globe.gl';
import * as THREE from 'three';
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
  { id: 'amazon-river', name: 'Amazon River', lat: -3, lng: -58, level: 'detail' },
  { id: 'nile-river', name: 'Nile River', lat: 24, lng: 32, level: 'detail' },
  { id: 'yangtze-river', name: 'Yangtze River', lat: 31, lng: 112, level: 'detail' },
  { id: 'mississippi-river', name: 'Mississippi River', lat: 35, lng: -91, level: 'detail' },
];

function getSunSubsolarPoint(date = new Date()) {
  const startOfYearUtc = Date.UTC(date.getUTCFullYear(), 0, 0);
  const nowUtc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
  const dayOfYear = Math.floor((nowUtc - startOfYearUtc) / 86400000);
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const gamma = (2 * Math.PI / 365) * (dayOfYear - 1 + (utcHours - 12) / 24);

  const declination = 0.006918
    - 0.399912 * Math.cos(gamma)
    + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma)
    + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma)
    + 0.00148 * Math.sin(3 * gamma);

  const equationOfTimeMinutes = 229.18 * (
    0.000075
    + 0.001868 * Math.cos(gamma)
    - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma)
    - 0.040849 * Math.sin(2 * gamma)
  );

  const subsolarLng = -15 * (utcHours + equationOfTimeMinutes / 60 - 12);
  const subsolarLat = declination * (180 / Math.PI);

  return {
    lat: Math.max(-89.9, Math.min(89.9, subsolarLat)),
    lng: ((subsolarLng + 540) % 360) - 180,
  };
}

export default function GlobeView({ focusAreas = [], eventId, activeEvent, lines = [] }) {
  const ref = React.useRef(null);
  const globeRef = React.useRef(null);
  const sunLightRef = React.useRef(null);
  const sunUpdateTimerRef = React.useRef(null);
  const altitudeRef = React.useRef(2.2);
  const labelsUpdaterRef = React.useRef(() => {});
  const controlsChangeHandlerRef = React.useRef(null);

  const sourceLabel = activeEvent?.name || 'Event Origin';

  React.useEffect(() => {
    if (!ref.current) return;

    // create globe instance
    const GlobeConstructor = Globe; // default export
    const globe = GlobeConstructor()(ref.current)
      .backgroundColor('#000000')
      .showGlobe(true)
      .polygonsData(COUNTRY_FEATURES)
      .polygonCapColor(() => '#3f8151')
      .polygonSideColor(() => 'rgba(255, 255, 255, 0.22)')
      .polygonStrokeColor(() => 'rgba(255, 255, 255, 0.96)')
      .polygonAltitude(0.005)
      .showAtmosphere(true)
      .atmosphereColor('#00e6ff')
      .atmosphereAltitude(0.25)
      .pointOfView({ lat: 10, lng: -20, altitude: 2.2 }, 0);

    const globeMaterial = globe.globeMaterial();
    globeMaterial.color.set('#3b82f6');
    globeMaterial.transparent = true;
    globeMaterial.opacity = 0.64;
    globeMaterial.shininess = 44;
    globeMaterial.specular = new THREE.Color('#d9f7ff');
    globeMaterial.emissive = new THREE.Color('#07253c');
    globeMaterial.emissiveIntensity = 0.22;

    const ambientLight = new THREE.AmbientLight('#203047', 0.34);
    const sunLight = new THREE.DirectionalLight('#fff5cc', 1.2);
    const fillLight = new THREE.DirectionalLight('#93c5fd', 0.22);
    fillLight.position.set(-130, -40, -160);
    globe.scene().add(ambientLight);
    globe.scene().add(sunLight);
    globe.scene().add(fillLight);
    sunLightRef.current = sunLight;

    const updateSunLighting = (at = new Date()) => {
      const { lat, lng } = getSunSubsolarPoint(at);
      const lightVector = globe.getCoords(lat, lng, 1.9);
      sunLight.position.set(lightVector.x, lightVector.y, lightVector.z);
      sunLight.lookAt(0, 0, 0);
      const shimmer = 0.62 + Math.sin(at.getTime() / 2500) * 0.06;
      globeMaterial.opacity = Math.max(0.54, Math.min(0.74, shimmer));
      globeMaterial.needsUpdate = true;
    };

    updateSunLighting(new Date());
    sunUpdateTimerRef.current = setInterval(() => {
      updateSunLighting(new Date());
    }, 30000);

    const controls = globe.controls();
    controlsChangeHandlerRef.current = () => {
      try {
        altitudeRef.current = globe.pointOfView().altitude || 2.2;
        labelsUpdaterRef.current();
      } catch (error) {
        // ignore control sync errors
      }
    };
    controls.addEventListener('change', controlsChangeHandlerRef.current);

    globeRef.current = globe;

    return () => {
      try {
        if (sunUpdateTimerRef.current) {
          clearInterval(sunUpdateTimerRef.current);
          sunUpdateTimerRef.current = null;
        }
        if (sunLightRef.current) {
          globe.scene().remove(sunLightRef.current);
          sunLightRef.current = null;
        }
        if (controlsChangeHandlerRef.current && globeRef.current) {
          globeRef.current.controls().removeEventListener('change', controlsChangeHandlerRef.current);
        }
        // unmount three renderer
        if (ref.current) ref.current.innerHTML = '';
      } catch (e) {
        // ignore
      }
    };
  }, []);

  React.useEffect(() => {
    if (!globeRef.current) return;

    const src = SOURCE_COORDS[eventId] || { lat: 20, lng: 0 };
    const activeImpactAreas = lines.length
      ? lines.map((_, idx) => focusAreas[idx % focusAreas.length]).filter(Boolean)
      : [];

    const arcs = activeImpactAreas.map((area, idx) => {
      const endLat = (area.coordinates && area.coordinates[1]) || 0;
      const endLng = (area.coordinates && area.coordinates[0]) || 0;
      const impact = (lines[idx] && lines[idx].impact) || 0.6;
      return {
        id: area.id,
        startLat: src.lat,
        startLng: src.lng,
        endLat,
        endLng,
        color: [
          `rgba(236,72,153,${0.52 + impact * 0.2})`,
          `rgba(250,204,21,${0.78 + impact * 0.18})`,
        ],
        value: Math.max(0.02, Math.min(0.9, impact)),
      };
    });

    globeRef.current
      .arcsData(arcs)
      .arcColor('color')
      .arcStroke(2.2)
      .arcAltitude('value')
      .arcDashLength(0.56)
      .arcDashGap(0.14)
      .arcDashInitialGap(() => Math.random())
      .arcDashAnimateTime(2600);

    const connectorPaths = arcs.map((arc, idx) => ({
      id: `connector-${arc.id}-${idx}`,
      coords: [
        { lat: src.lat, lng: src.lng },
        { lat: arc.endLat, lng: arc.endLng },
      ],
      color: `rgba(250, 204, 21, ${0.5 + ((lines[idx] && lines[idx].impact) || 0.6) * 0.35})`,
      width: 0.42 + ((lines[idx] && lines[idx].impact) || 0.6) * 0.22,
    }));

    globeRef.current
      .pathsData(connectorPaths)
      .pathPoints('coords')
      .pathPointLat('lat')
      .pathPointLng('lng')
      .pathColor('color')
      .pathStroke('width')
      .pathResolution(2)
      .pathTransitionDuration(350);

    const affectedPoints = activeImpactAreas.map((area, idx) => ({
      id: area.id,
      lat: (area.coordinates && area.coordinates[1]) || 0,
      lng: (area.coordinates && area.coordinates[0]) || 0,
      size: 0.42 + ((lines[idx] && lines[idx].impact) || 0) * 1.06,
      color: 'rgba(255,255,255,0.96)',
      label: `${area.label} (affected)`,
    }));

    const originPoint = {
      id: `origin-${eventId || 'default'}`,
      lat: src.lat,
      lng: src.lng,
      size: 0.82,
      color: '#ffd166',
      label: 'Event Origin',
    };

    const points = [originPoint, ...affectedPoints];

    globeRef.current.pointsData(points).pointAltitude('size').pointColor('color').pointRadius(0.4).pointsMerge(true);

    globeRef.current
      .ringsData(points)
      .ringColor(() => (t) => `rgba(255,255,255,${1 - t})`)
      .ringMaxRadius((point) => (point.id.startsWith('origin-') ? 7.2 : 4.4))
      .ringPropagationSpeed((point) => (point.id.startsWith('origin-') ? 1.9 : 1.22))
      .ringRepeatPeriod((point) => (point.id.startsWith('origin-') ? 760 : 1120));

    const placeTags = [
      {
        id: `origin-tag-${eventId || 'default'}`,
        lat: src.lat,
        lng: src.lng,
        text: `Origin: ${sourceLabel}`,
        kind: 'origin',
      },
      ...activeImpactAreas.map((area) => ({
        id: `impact-tag-${area.id}`,
        lat: (area.coordinates && area.coordinates[1]) || 0,
        lng: (area.coordinates && area.coordinates[0]) || 0,
        text: `Impact: ${area.label}`,
        kind: 'impact',
      })),
    ];

    globeRef.current
      .htmlElementsData(placeTags)
      .htmlLat('lat')
      .htmlLng('lng')
      .htmlAltitude((item) => (item.kind === 'origin' ? 0.16 : 0.12))
      .htmlElement((item) => {
        const el = document.createElement('div');
        el.textContent = item.text;
        el.style.pointerEvents = 'none';
        el.style.whiteSpace = 'nowrap';
        el.style.fontFamily = 'Inter, system-ui, -apple-system, Segoe UI, sans-serif';
        el.style.fontSize = item.kind === 'origin' ? '11px' : '10px';
        el.style.fontWeight = item.kind === 'origin' ? '700' : '600';
        el.style.color = item.kind === 'origin' ? '#fde68a' : '#ffffff';
        el.style.textShadow = '0 0 8px rgba(0,0,0,0.95), 0 0 12px rgba(15,23,42,0.9)';
        el.style.padding = item.kind === 'origin' ? '2px 6px' : '1px 5px';
        el.style.borderRadius = '999px';
        el.style.background = item.kind === 'origin' ? 'rgba(120,53,15,0.36)' : 'rgba(15,23,42,0.42)';
        el.style.border = item.kind === 'origin' ? '1px solid rgba(253, 230, 138, 0.7)' : '1px solid rgba(255,255,255,0.3)';
        return el;
      });

    labelsUpdaterRef.current = () => {
      const altitude = altitudeRef.current;
      const zoomFactor = Math.max(0.6, Math.min(2.2, 2.8 - altitude));
      const includeDetailHydrology = altitude < 1.5;
      const dynamicWaterLabels = WATER_LABELS.filter((item) => includeDetailHydrology || item.level !== 'detail').map((item) => ({
        id: item.id,
        lat: item.lat,
        lng: item.lng,
        text: item.name,
        color: item.level === 'major' ? 'rgba(242, 250, 255, 0.95)' : 'rgba(220, 242, 255, 0.78)',
        size: item.level === 'major' ? 0.62 * zoomFactor : item.level === 'regional' ? 0.38 * zoomFactor : 0.22 * zoomFactor,
        altitude: 0.002,
        dot: 0.03,
      }));

      const placeLabels = [
        {
          id: `origin-label-${eventId || 'default'}`,
          lat: src.lat,
          lng: src.lng,
          text: sourceLabel,
          color: 'rgba(255, 224, 154, 0.95)',
          size: 0.64,
          altitude: 0.03,
          dot: 0.12,
        },
        ...activeImpactAreas.map((area, idx) => ({
          id: `impact-label-${area.id}`,
          lat: (area.coordinates && area.coordinates[1]) || 0,
          lng: (area.coordinates && area.coordinates[0]) || 0,
          text: `${area.label} impact`,
          color: 'rgba(255,255,255,0.9)',
          size: 0.35 + (((lines[idx] && lines[idx].impact) || 0) * 0.2),
          altitude: 0.02,
          dot: 0.08,
        })),
      ];

      const labels = [...dynamicWaterLabels, ...placeLabels];
      globeRef.current
        .labelsData(labels)
        .labelLat('lat')
        .labelLng('lng')
        .labelText('text')
        .labelColor('color')
        .labelSize('size')
        .labelAltitude('altitude')
        .labelDotRadius('dot');
    };
    labelsUpdaterRef.current();

    // animate rotation slightly
    try {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.34;
    } catch (e) {}
  }, [focusAreas, eventId, lines, activeEvent]);

  return <div ref={ref} style={{ width: '100%', height: '100%' }} />;
}
