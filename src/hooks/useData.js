import React from 'react';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function eventPropagationIndexes(eventId) {
  if (eventId === 'ev_wildfire_ca') return [1];
  if (eventId === 'ev_aws_outage') return [0, 1, 0];
  return [0, 1];
}

function buildPathVariant(path, xShift, yShift) {
  return path.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, x, y) => {
    const nx = Number(x) + xShift;
    const ny = Number(y) + yShift;
    return `${nx},${ny}`;
  });
}

export function useData() {
  const [data, setData] = React.useState({
    events: [],
    propagation: [],
    isLoading: true,
    error: null,
  });

  React.useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        await wait(180);
        const [eventsModule, propagationModule] = await Promise.all([
          import('../data/events.json'),
          import('../data/propagation.json'),
        ]);

        if (!mounted) return;

        setData({
          events: eventsModule.default || [],
          propagation: propagationModule.default?.lines || [],
          isLoading: false,
          error: null,
        });
      } catch (error) {
        if (!mounted) return;
        setData((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load local data',
        }));
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  const getPropagationForEvent = React.useCallback((eventId) => {
    const indexes = eventPropagationIndexes(eventId);
    if (!data.propagation.length) return [];

    return indexes.map((sourceIndex, index) => {
      const source = data.propagation[sourceIndex % data.propagation.length];
      const xShift = eventId === 'ev_aws_outage' ? index * 20 : index * 14;
      const yShift = eventId === 'ev_wildfire_ca' ? 26 + index * 8 : index * 10;

      return {
        ...source,
        path: buildPathVariant(source.path, xShift, yShift),
        eventId,
      };
    });
  }, [data.propagation]);

  return {
    ...data,
    getPropagationForEvent,
  };
}
