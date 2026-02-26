import React from 'react';
import { getScenario, listEvents } from '../data/mockApi.js';

const ALL_INDUSTRIES = ['Healthcare', 'E-Commerce', 'Financial Services', 'Government', 'Logistics'];
const ALL_REGIONS = ['us-east-1', 'us-west-2', 'eu-central-1', 'ap-southeast-1'];

const defaultEventId = 'ev_hurricane_gulf_cat4';

export const actionTypes = {
  SET_EVENT: 'SET_EVENT',
  TOGGLE_INDUSTRY: 'TOGGLE_INDUSTRY',
  TOGGLE_REGION: 'TOGGLE_REGION',
  RUN_SIMULATION: 'RUN_SIMULATION',
  RESET_FILTERS: 'RESET_FILTERS',
  LOAD_EVENTS_SUCCESS: 'LOAD_EVENTS_SUCCESS',
  LOAD_SCENARIO_START: 'LOAD_SCENARIO_START',
  LOAD_SCENARIO_SUCCESS: 'LOAD_SCENARIO_SUCCESS',
  LOAD_SCENARIO_ERROR: 'LOAD_SCENARIO_ERROR',
};

const initialState = {
  eventId: defaultEventId,
  selectedIndustries: ALL_INDUSTRIES,
  selectedRegions: ALL_REGIONS,
  simulationRuns: 0,
  lastSimulationAt: null,
  events: [],
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
  isLoadingScenario: false,
  loadError: null,
};

function appReducer(state, action) {
  switch (action.type) {
    case actionTypes.SET_EVENT:
      return { ...state, eventId: action.payload };
    case actionTypes.TOGGLE_INDUSTRY: {
      const value = action.payload;
      const exists = state.selectedIndustries.includes(value);
      const selectedIndustries = exists
        ? state.selectedIndustries.filter((item) => item !== value)
        : [...state.selectedIndustries, value];
      return { ...state, selectedIndustries };
    }
    case actionTypes.TOGGLE_REGION: {
      const value = action.payload;
      const exists = state.selectedRegions.includes(value);
      const selectedRegions = exists
        ? state.selectedRegions.filter((item) => item !== value)
        : [...state.selectedRegions, value];
      return { ...state, selectedRegions };
    }
    case actionTypes.RUN_SIMULATION:
      return {
        ...state,
        simulationRuns: state.simulationRuns + 1,
        lastSimulationAt: Date.now(),
      };
    case actionTypes.RESET_FILTERS:
      return {
        ...state,
        eventId: defaultEventId,
        selectedIndustries: ALL_INDUSTRIES,
        selectedRegions: ALL_REGIONS,
        simulationRuns: 0,
        lastSimulationAt: null,
        scenario: { ...initialState.scenario },
        isLoadingScenario: false,
        loadError: null,
      };
    case actionTypes.LOAD_EVENTS_SUCCESS:
      return {
        ...state,
        events: action.payload,
        eventId: action.payload.some((event) => event.id === state.eventId)
          ? state.eventId
          : action.payload[0]?.id || defaultEventId,
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
      };
    case actionTypes.LOAD_SCENARIO_ERROR:
      return {
        ...state,
        isLoadingScenario: false,
        loadError: action.payload,
      };
    default:
      return state;
  }
}

const AppStateContext = React.createContext(null);
const AppDispatchContext = React.createContext(null);

export function AppStateProvider({ children }) {
  const [state, dispatch] = React.useReducer(appReducer, initialState);

  React.useEffect(() => {
    let mounted = true;

    async function loadEvents() {
      const result = await listEvents();
      if (!mounted) return;
      dispatch({ type: actionTypes.LOAD_EVENTS_SUCCESS, payload: result });
    }

    loadEvents();

    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    let mounted = true;

    async function loadScenario() {
      if (state.simulationRuns < 1) {
        return;
      }

      dispatch({ type: actionTypes.LOAD_SCENARIO_START });
      try {
        const scenario = await getScenario(state.eventId, {
          selectedIndustries: state.selectedIndustries,
          selectedRegions: state.selectedRegions,
          simulationRuns: state.simulationRuns,
        });

        if (!mounted) return;
        dispatch({ type: actionTypes.LOAD_SCENARIO_SUCCESS, payload: scenario });
      } catch (error) {
        if (!mounted) return;
        dispatch({
          type: actionTypes.LOAD_SCENARIO_ERROR,
          payload: error instanceof Error ? error.message : 'Unable to load scenario',
        });
      }
    }

    loadScenario();

    return () => {
      mounted = false;
    };
  }, [state.eventId, state.selectedIndustries, state.selectedRegions, state.simulationRuns]);

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>{children}</AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = React.useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
}

export function useAppDispatch() {
  const context = React.useContext(AppDispatchContext);
  if (!context) {
    throw new Error('useAppDispatch must be used within AppStateProvider');
  }
  return context;
}

export { ALL_INDUSTRIES, ALL_REGIONS, appReducer, initialState };
