import React from 'react';
import { getScenario } from '../data/mockApi.js';
import { useData } from '../hooks/useData.js';

export const ALL_INDUSTRIES = ['Healthcare', 'E-Commerce', 'Financial Services', 'Government', 'Logistics'];
export const ALL_REGIONS = ['us-east-1', 'us-west-2', 'eu-central-1', 'ap-southeast-1'];

const defaultEventId = '';

export const actionTypes = {
  SET_EVENT: 'SET_EVENT',
  TOGGLE_INDUSTRY: 'TOGGLE_INDUSTRY',
  TOGGLE_REGION: 'TOGGLE_REGION',
  RUN_SIMULATION: 'RUN_SIMULATION',
  RESET_FILTERS: 'RESET_FILTERS',
  LOAD_DATA_SUCCESS: 'LOAD_DATA_SUCCESS',
  LOAD_DATA_ERROR: 'LOAD_DATA_ERROR',
  LOAD_SCENARIO_START: 'LOAD_SCENARIO_START',
  LOAD_SCENARIO_SUCCESS: 'LOAD_SCENARIO_SUCCESS',
  LOAD_SCENARIO_ERROR: 'LOAD_SCENARIO_ERROR',
  SET_FAILOVER_ENABLED: 'SET_FAILOVER_ENABLED',
  SET_DEMO_SCENARIO: 'SET_DEMO_SCENARIO',
};

const initialState = {
  eventId: defaultEventId,
  selectedIndustries: ALL_INDUSTRIES,
  selectedRegions: ALL_REGIONS,
  simulationRuns: 0,
  lastSimulationAt: null,
  events: [],
  basePropagation: [],
  scenario: {
    lines: [],
    chain: [],
    mitigations: [],
    nodes: [],
    riskSummary: {
      overallIndex: 0,
      cascadeSeverity: 'Unknown',
      confidence: 0,
    },
  },
  isDataLoading: true,
  isLoadingScenario: false,
  failoverEnabled: false,
  demoCaption: 'Select a scenario and run simulation',
  loadError: null,
  eventLogs: [],
};

function addLog(state, message) {
  const nextLog = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    message,
  };
  return [nextLog, ...state.eventLogs].slice(0, 60);
}

function appReducer(state, action) {
  switch (action.type) {
    case actionTypes.SET_EVENT:
      return {
        ...state,
        eventId: action.payload,
        demoCaption: 'Event changed. Run simulation to refresh propagation.',
        eventLogs: addLog(state, `Event selected: ${action.payload}`),
      };
    case actionTypes.TOGGLE_INDUSTRY: {
      const value = action.payload;
      const exists = state.selectedIndustries.includes(value);
      const selectedIndustries = exists
        ? state.selectedIndustries.filter((item) => item !== value)
        : [...state.selectedIndustries, value];
      return {
        ...state,
        selectedIndustries,
        eventLogs: addLog(state, `Industry filter updated (${selectedIndustries.length} selected)`),
      };
    }
    case actionTypes.TOGGLE_REGION: {
      const value = action.payload;
      const exists = state.selectedRegions.includes(value);
      const selectedRegions = exists
        ? state.selectedRegions.filter((item) => item !== value)
        : [...state.selectedRegions, value];
      return {
        ...state,
        selectedRegions,
        eventLogs: addLog(state, `Region filter updated (${selectedRegions.length} selected)`),
      };
    }
    case actionTypes.RUN_SIMULATION:
      if (!state.eventId) {
        return {
          ...state,
          demoCaption: 'Select an event first, then run simulation.',
          eventLogs: addLog(state, 'Simulation blocked: no event selected'),
        };
      }
      return {
        ...state,
        simulationRuns: state.simulationRuns + 1,
        lastSimulationAt: Date.now(),
        eventLogs: addLog(state, 'Simulation run requested'),
      };
    case actionTypes.SET_FAILOVER_ENABLED:
      return {
        ...state,
        failoverEnabled: action.payload,
        eventLogs: addLog(state, `Cross-region failover ${action.payload ? 'enabled' : 'disabled'}`),
      };
    case actionTypes.SET_DEMO_SCENARIO:
      return {
        ...state,
        eventId: action.payload.eventId,
        selectedIndustries: action.payload.selectedIndustries,
        selectedRegions: action.payload.selectedRegions,
        failoverEnabled: Boolean(action.payload.failoverEnabled),
        demoCaption: action.payload.caption,
        eventLogs: addLog(state, `Demo preset loaded: ${action.payload.label}`),
      };
    case actionTypes.RESET_FILTERS:
      return {
        ...state,
        eventId: '',
        selectedIndustries: [],
        selectedRegions: [],
        simulationRuns: 0,
        lastSimulationAt: null,
        failoverEnabled: false,
        demoCaption: 'Select an event and run simulation',
        scenario: { ...initialState.scenario },
        isLoadingScenario: false,
        loadError: null,
        eventLogs: addLog(state, 'Filters and simulation reset'),
      };
    case actionTypes.LOAD_DATA_SUCCESS:
      return {
        ...state,
        events: action.payload.events,
        basePropagation: action.payload.propagation,
        isDataLoading: false,
        loadError: null,
        eventId: action.payload.events.some((event) => event.id === state.eventId)
          ? state.eventId
          : '',
        eventLogs: addLog(state, `Loaded ${action.payload.events.length} events and propagation dataset`),
      };
    case actionTypes.LOAD_DATA_ERROR:
      return {
        ...state,
        isDataLoading: false,
        loadError: action.payload,
        eventLogs: addLog(state, `Data load error: ${action.payload}`),
      };
    case actionTypes.LOAD_SCENARIO_START:
      return {
        ...state,
        isLoadingScenario: true,
        loadError: null,
      };
    case actionTypes.LOAD_SCENARIO_SUCCESS:
      return {
        ...state,
        scenario: action.payload,
        isLoadingScenario: false,
        loadError: null,
        eventLogs: addLog(state, 'Scenario propagation refreshed'),
      };
    case actionTypes.LOAD_SCENARIO_ERROR:
      return {
        ...state,
        isLoadingScenario: false,
        loadError: action.payload,
        eventLogs: addLog(state, `Scenario load error: ${action.payload}`),
      };
    default:
      return state;
  }
}

const StoreContext = React.createContext(null);
const StoreDispatchContext = React.createContext(null);

export function StoreProvider({ children }) {
  const [state, dispatch] = React.useReducer(appReducer, initialState);
  const { events, propagation, isLoading, error, getPropagationForEvent } = useData();

  React.useEffect(() => {
    if (isLoading) return;
    if (error) {
      dispatch({ type: actionTypes.LOAD_DATA_ERROR, payload: error });
      return;
    }
    dispatch({ type: actionTypes.LOAD_DATA_SUCCESS, payload: { events, propagation } });
  }, [error, events, isLoading, propagation]);

  React.useEffect(() => {
    let mounted = true;

    async function loadScenario() {
      if (state.simulationRuns < 1 || state.isDataLoading || !state.eventId) {
        return;
      }

      dispatch({ type: actionTypes.LOAD_SCENARIO_START });
      try {
        const propagationLines = getPropagationForEvent(state.eventId);
        const scenario = await getScenario(state.eventId, {
          selectedIndustries: state.selectedIndustries,
          selectedRegions: state.selectedRegions,
          simulationRuns: state.simulationRuns,
          failoverEnabled: state.failoverEnabled,
          propagationLines,
        });

        if (!mounted) return;
        dispatch({ type: actionTypes.LOAD_SCENARIO_SUCCESS, payload: scenario });
      } catch (scenarioError) {
        if (!mounted) return;
        dispatch({
          type: actionTypes.LOAD_SCENARIO_ERROR,
          payload: scenarioError instanceof Error ? scenarioError.message : 'Unable to load scenario',
        });
      }
    }

    loadScenario();

    return () => {
      mounted = false;
    };
  }, [
    getPropagationForEvent,
    state.eventId,
    state.failoverEnabled,
    state.isDataLoading,
    state.selectedIndustries,
    state.selectedRegions,
    state.simulationRuns,
  ]);

  return (
    <StoreContext.Provider value={state}>
      <StoreDispatchContext.Provider value={dispatch}>{children}</StoreDispatchContext.Provider>
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = React.useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within StoreProvider');
  }
  return context;
}

export function useStoreDispatch() {
  const context = React.useContext(StoreDispatchContext);
  if (!context) {
    throw new Error('useStoreDispatch must be used within StoreProvider');
  }
  return context;
}

export { appReducer, initialState };
