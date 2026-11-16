import { createContext, useContext, useReducer, useEffect } from 'react';
import { DEFAULT_SETTINGS, SAMPLE_FOOTING } from '../utils/constants.js';
import { saveProject, loadProjects, getActiveProjectId, setActiveProjectId } from '../utils/storage.js';

// ─── Initial State ────────────────────────────────────────────────────────────

function makeFloorData(id, name, height, lap, hasConcrete) {
  return { id, name, height, lap, hasConcrete, members: [] };
}

function makeBeamFloorData(id, name) {
  return { id, name, members: [] };
}

const INITIAL_SECTIONS = {
  footingBoxes: { members: [SAMPLE_FOOTING] },
  stripFootings: { members: [] },
  groundBeams: { members: [] },
  columns: {
    floorData: {
      foundation:  makeFloorData('foundation',  'Foundation Cols',  0,   0,   false),
      groundFloor: makeFloorData('groundFloor', 'GF Columns',       3.0, 0.8, true),
      firstFloor:  makeFloorData('firstFloor',  '1F Columns',       3.0, 0.8, true),
      secondFloor: makeFloorData('secondFloor', '2F Columns',       3.0, 0.8, true),
      roofFloor:   makeFloorData('roofFloor',   'Roof Columns',     3.0, 0.8, true),
    },
  },
  ringBeams: {
    floorData: {
      groundFloor: makeBeamFloorData('groundFloor', 'Ground Floor'),
      firstFloor:  makeBeamFloorData('firstFloor',  'First Floor'),
      secondFloor: makeBeamFloorData('secondFloor', 'Second Floor'),
      roofFloor:   makeBeamFloorData('roofFloor',   'Roof Floor'),
    },
  },
  floorBeams: {
    floorData: {
      groundFloor: makeBeamFloorData('groundFloor', 'Ground Floor'),
      firstFloor:  makeBeamFloorData('firstFloor',  'First Floor'),
      secondFloor: makeBeamFloorData('secondFloor', 'Second Floor'),
      roofFloor:   makeBeamFloorData('roofFloor',   'Roof Floor'),
    },
  },
  slabs: { members: [] },
  blinding: { volume: 30 },
};

const INITIAL_STATE = {
  project: {
    id: null, name: '', client: '', location: '',
    date: new Date().toISOString().split('T')[0],
    storeys: 2,
  },
  settings: DEFAULT_SETTINGS,
  sections: INITIAL_SECTIONS,
  // Flat lookup table built from Ring Beams schedule extraction.
  // Keys are normalised beam marks (uppercase, no hyphens/spaces).
  // Floor tab population happens separately via REPLACE_RING_BEAM_FLOOR.
  extractedBeamSchedule: {},
  activeSection: 'footingBoxes',
  activeFloor: 'foundation',
  appView: 'dashboard', // 'dashboard' | 'setup' | 'tool'
};

function mergeSections(sec) {
  if (!sec) return INITIAL_SECTIONS;
  return {
    ...INITIAL_SECTIONS,
    ...sec,
    footingBoxes: sec.footingBoxes || INITIAL_SECTIONS.footingBoxes,
    stripFootings: sec.stripFootings || INITIAL_SECTIONS.stripFootings,
    groundBeams: sec.groundBeams || INITIAL_SECTIONS.groundBeams,
    slabs: sec.slabs || INITIAL_SECTIONS.slabs,
    blinding: sec.blinding || INITIAL_SECTIONS.blinding,
    columns: {
      ...INITIAL_SECTIONS.columns,
      ...(sec.columns || {}),
      floorData: { ...INITIAL_SECTIONS.columns.floorData, ...(sec.columns?.floorData || {}) },
    },
    ringBeams: {
      ...INITIAL_SECTIONS.ringBeams,
      ...(sec.ringBeams || {}),
      floorData: { ...INITIAL_SECTIONS.ringBeams.floorData, ...(sec.ringBeams?.floorData || {}) },
    },
    floorBeams: {
      ...INITIAL_SECTIONS.floorBeams,
      ...(sec.floorBeams || {}),
      floorData: { ...INITIAL_SECTIONS.floorBeams.floorData, ...(sec.floorBeams?.floorData || {}) },
    },
  };
}

// Always start at dashboard — appView is never persisted
function getInitialState() {
  return INITIAL_STATE;
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

function reducer(state, action) {
  switch (action.type) {
    // Open an existing project from the dashboard
    case 'OPEN_PROJECT': {
      const saved = action.payload; // { project, settings, sections, id }
      return {
        ...INITIAL_STATE,
        project: { storeys: 2, ...saved.project, id: saved.id },
        settings: saved.settings || DEFAULT_SETTINGS,
        sections: mergeSections(saved.sections),
        activeSection: 'footingBoxes',
        activeFloor: 'foundation',
        appView: 'tool',
      };
    }

    // Create a brand-new project (from setup page)
    case 'NEW_PROJECT': {
      const id = `proj-${Date.now()}`;
      return {
        ...INITIAL_STATE,
        project: { ...action.payload, id },
        settings: state.settings,
        sections: INITIAL_SECTIONS,
        activeSection: 'footingBoxes',
        activeFloor: 'foundation',
        appView: 'tool',
      };
    }

    case 'SET_APP_VIEW':
      return { ...state, appView: action.payload };

    case 'LOAD_STATE':
      return {
        ...action.payload,
        activeSection: state.activeSection,
        activeFloor: state.activeFloor,
        appView: 'tool',
        sections: mergeSections(action.payload.sections),
      };

    case 'SET_PROJECT':
      return { ...state, project: { ...state.project, ...action.payload } };

    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };

    case 'SET_ACTIVE_SECTION':
      return { ...state, activeSection: action.payload };

    case 'SET_ACTIVE_FLOOR':
      return { ...state, activeFloor: action.payload };

    // ── AI Schedule Import ──
    case 'IMPORT_SCHEDULE': {
      const p = action.payload;
      const withId = (arr, defaults = {}) =>
        (arr || []).map(m => ({ ...defaults, ...m, id: uid() }));

      const colMembers = withId(p.columns, { quantity: 0 });
      const storeys = state.project?.storeys || 2;
      const colFloors = storeys >= 3
        ? ['foundation', 'groundFloor', 'firstFloor', 'secondFloor', 'roofFloor']
        : ['foundation', 'groundFloor', 'firstFloor', 'roofFloor'];

      const newColFloorData = { ...state.sections.columns.floorData };
      colFloors.forEach(fid => {
        newColFloorData[fid] = {
          ...newColFloorData[fid],
          members: [...newColFloorData[fid].members, ...colMembers.map(m => ({ ...m, id: uid() }))],
        };
      });

      const addToBeamFloor = (section, floorId, items) => ({
        ...section,
        floorData: {
          ...section.floorData,
          [floorId]: {
            ...section.floorData[floorId],
            members: [...section.floorData[floorId].members, ...withId(items, { runningMeters: 0 })],
          },
        },
      });

      return {
        ...state,
        sections: {
          ...state.sections,
          footingBoxes: { members: [...state.sections.footingBoxes.members, ...withId(p.footingBoxes, { quantity: 0 })] },
          stripFootings: { members: [...state.sections.stripFootings.members, ...withId(p.stripFootings, { runningMeters: 0 })] },
          groundBeams: { members: [...state.sections.groundBeams.members, ...withId(p.groundBeams, { runningMeters: 0 })] },
          columns: { ...state.sections.columns, floorData: newColFloorData },
          ringBeams: addToBeamFloor(state.sections.ringBeams, 'groundFloor', p.ringBeams),
          floorBeams: addToBeamFloor(state.sections.floorBeams, 'groundFloor', p.floorBeams),
          slabs: { members: [...state.sections.slabs.members, ...withId(p.slabs, { area: 0 })] },
        },
      };
    }

    // Apply AI-counted quantities (from foundation layout plan) onto matching
    // footing marks by name — leaves non-matching members untouched.
    case 'SET_FOOTING_QUANTITIES': {
      const counts = action.payload; // { "F1": 5, ... } — keys are raw mark names
      const normCounts = {};
      for (const [mark, qty] of Object.entries(counts)) {
        normCounts[mark.toUpperCase().replace(/[-\s]/g, '')] = qty;
      }
      return updateSection(state, 'footingBoxes', (s) => ({
        ...s,
        members: s.members.map((m) => {
          const key = String(m.name || '').toUpperCase().replace(/[-\s]/g, '');
          return key in normCounts ? { ...m, quantity: normCounts[key] } : m;
        }),
      }));
    }

    // ── Footing Boxes ──
    case 'ADD_FOOTING':
      return updateSection(state, 'footingBoxes', (s) => ({ ...s, members: [...s.members, action.payload] }));
    case 'UPDATE_FOOTING':
      return updateSection(state, 'footingBoxes', (s) => ({ ...s, members: s.members.map((m) => m.id === action.payload.id ? action.payload : m) }));
    case 'DELETE_FOOTING':
      return updateSection(state, 'footingBoxes', (s) => ({ ...s, members: s.members.filter((m) => m.id !== action.payload) }));

    // ── Strip Footings ──
    case 'ADD_STRIP':
      return updateSection(state, 'stripFootings', (s) => ({ ...s, members: [...s.members, action.payload] }));
    case 'UPDATE_STRIP':
      return updateSection(state, 'stripFootings', (s) => ({ ...s, members: s.members.map((m) => m.id === action.payload.id ? action.payload : m) }));
    case 'DELETE_STRIP':
      return updateSection(state, 'stripFootings', (s) => ({ ...s, members: s.members.filter((m) => m.id !== action.payload) }));

    // ── Ground Beams ──
    case 'ADD_GROUND_BEAM':
      return updateSection(state, 'groundBeams', (s) => ({ ...s, members: [...s.members, action.payload] }));
    case 'UPDATE_GROUND_BEAM':
      return updateSection(state, 'groundBeams', (s) => ({ ...s, members: s.members.map((m) => m.id === action.payload.id ? action.payload : m) }));
    case 'DELETE_GROUND_BEAM':
      return updateSection(state, 'groundBeams', (s) => ({ ...s, members: s.members.filter((m) => m.id !== action.payload) }));

    // ── Columns ──
    case 'ADD_COLUMN': {
      const { floorId, member } = action.payload;
      return updateColumnFloor(state, floorId, (fd) => ({ ...fd, members: [...fd.members, member] }));
    }
    case 'UPDATE_COLUMN': {
      const { floorId, member } = action.payload;
      return updateColumnFloor(state, floorId, (fd) => ({ ...fd, members: fd.members.map((m) => m.id === member.id ? member : m) }));
    }
    case 'DELETE_COLUMN': {
      const { floorId, memberId } = action.payload;
      return updateColumnFloor(state, floorId, (fd) => ({ ...fd, members: fd.members.filter((m) => m.id !== memberId) }));
    }
    case 'UPDATE_COLUMN_FLOOR': {
      const { floorId, data } = action.payload;
      return updateColumnFloor(state, floorId, (fd) => ({ ...fd, ...data }));
    }

    // Store beam schedule lookup table (mark → properties) without touching floor tabs
    case 'SET_EXTRACTED_BEAM_SCHEDULE':
      return { ...state, extractedBeamSchedule: action.payload };

    // Replace all members of one ring beam floor tab (used by floor plan import)
    case 'REPLACE_RING_BEAM_FLOOR': {
      const { floorId, members } = action.payload;
      return updateBeamFloor(state, 'ringBeams', floorId, fd => ({ ...fd, members }));
    }

    // ── Ring Beams ──
    case 'ADD_RING_BEAM': {
      const { floorId, member } = action.payload;
      return updateBeamFloor(state, 'ringBeams', floorId, (fd) => ({ ...fd, members: [...fd.members, member] }));
    }
    case 'UPDATE_RING_BEAM': {
      const { floorId, member } = action.payload;
      return updateBeamFloor(state, 'ringBeams', floorId, (fd) => ({ ...fd, members: fd.members.map((m) => m.id === member.id ? member : m) }));
    }
    case 'DELETE_RING_BEAM': {
      const { floorId, memberId } = action.payload;
      return updateBeamFloor(state, 'ringBeams', floorId, (fd) => ({ ...fd, members: fd.members.filter((m) => m.id !== memberId) }));
    }

    // ── Floor Beams ──
    case 'ADD_FLOOR_BEAM': {
      const { floorId, member } = action.payload;
      return updateBeamFloor(state, 'floorBeams', floorId, (fd) => ({ ...fd, members: [...fd.members, member] }));
    }
    case 'UPDATE_FLOOR_BEAM': {
      const { floorId, member } = action.payload;
      return updateBeamFloor(state, 'floorBeams', floorId, (fd) => ({ ...fd, members: fd.members.map((m) => m.id === member.id ? member : m) }));
    }
    case 'DELETE_FLOOR_BEAM': {
      const { floorId, memberId } = action.payload;
      return updateBeamFloor(state, 'floorBeams', floorId, (fd) => ({ ...fd, members: fd.members.filter((m) => m.id !== memberId) }));
    }

    // ── Slabs ──
    case 'ADD_SLAB':
      return updateSection(state, 'slabs', (s) => ({ ...s, members: [...s.members, action.payload] }));
    case 'UPDATE_SLAB':
      return updateSection(state, 'slabs', (s) => ({ ...s, members: s.members.map((m) => m.id === action.payload.id ? action.payload : m) }));
    case 'DELETE_SLAB':
      return updateSection(state, 'slabs', (s) => ({ ...s, members: s.members.filter((m) => m.id !== action.payload) }));

    // ── Blinding ──
    case 'SET_BLINDING':
      return updateSection(state, 'blinding', (s) => ({ ...s, volume: action.payload }));

    default:
      return state;
  }
}

function updateSection(state, sectionKey, updater) {
  return { ...state, sections: { ...state.sections, [sectionKey]: updater(state.sections[sectionKey]) } };
}

function updateColumnFloor(state, floorId, updater) {
  return {
    ...state,
    sections: {
      ...state.sections,
      columns: {
        ...state.sections.columns,
        floorData: { ...state.sections.columns.floorData, [floorId]: updater(state.sections.columns.floorData[floorId]) },
      },
    },
  };
}

function updateBeamFloor(state, sectionKey, floorId, updater) {
  return {
    ...state,
    sections: {
      ...state.sections,
      [sectionKey]: {
        ...state.sections[sectionKey],
        floorData: { ...state.sections[sectionKey].floorData, [floorId]: updater(state.sections[sectionKey].floorData[floorId]) },
      },
    },
  };
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, getInitialState);

  // Auto-save whenever project data changes (only if a project ID exists)
  useEffect(() => {
    if (!state.project.id || state.appView !== 'tool') return;
    saveProject(state.project.id, {
      project: state.project,
      settings: state.settings,
      sections: state.sections,
    });
    setActiveProjectId(state.project.id);
  }, [state.project, state.settings, state.sections, state.appView]);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}
