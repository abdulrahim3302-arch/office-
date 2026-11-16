import { ClipboardList, BarChart3, Box, Rows3, Minus, RectangleVertical, Square, Rows4, Grid3x3, Layers } from 'lucide-react';

export const BAR_TYPES = ['Y8', 'T10', 'Y12', 'Y16', 'Y20', 'T25', 'T32'];

export const DEFAULT_KG_PER_M = {
  Y8: 0.395,
  T10: 0.618,
  Y12: 0.889,
  Y16: 1.580,
  Y20: 2.469,
  T25: 3.855,
  T32: 6.313,
};

export const BAR_DIAMETER_MM = {
  Y8: 8, T10: 10, Y12: 12, Y16: 16, Y20: 20, T25: 25, T32: 32,
};

export const FOOTING_TYPES = [
  { value: 'isolated', label: 'Isolated' },
  { value: 'combined', label: 'Combined' },
  { value: 'eccentric', label: 'Eccentric' },
  { value: 'lift', label: 'Lift Footing' },
];

export const DEFAULT_SETTINGS = {
  covers: {
    footing: 70,
    beam: 40,
    column: 40,
    slab: 25,
  },
  wastage: {
    main: 0.10,
    stirrup: 0.15,
  },
  lapLength: 0.8,
  barLength: 12,
  hookAllowance: 160,
  kgPerM: { ...DEFAULT_KG_PER_M },
  slabSpec: {
    layer1: { dia: 'T10', spacing: 250 },
    layer2: { dia: 'Y12', spacing: 200, coverage: 0.5 },
  },
};

// All possible column floors — filtered in ColumnSection by project.storeys
export const COLUMN_FLOORS_2 = [
  { id: 'foundation',  label: 'Foundation' },
  { id: 'groundFloor', label: 'GF Cols' },
  { id: 'firstFloor',  label: '1F Cols' },
  { id: 'roofFloor',   label: 'Roof Cols' },
];
export const COLUMN_FLOORS_3 = [
  { id: 'foundation',  label: 'Foundation' },
  { id: 'groundFloor', label: 'GF Cols' },
  { id: 'firstFloor',  label: '1F Cols' },
  { id: 'secondFloor', label: '2F Cols' },
  { id: 'roofFloor',   label: 'Roof Cols' },
];

export const BEAM_FLOORS_2 = [
  { id: 'groundFloor', label: 'Ground Floor' },
  { id: 'firstFloor',  label: 'First Floor' },
  { id: 'roofFloor',   label: 'Roof Floor' },
];
export const BEAM_FLOORS_3 = [
  { id: 'groundFloor', label: 'Ground Floor' },
  { id: 'firstFloor',  label: 'First Floor' },
  { id: 'secondFloor', label: 'Second Floor' },
  { id: 'roofFloor',   label: 'Roof Floor' },
];

// Legacy aliases used by old imports
export const COLUMN_FLOORS = COLUMN_FLOORS_2;
export const BEAM_FLOORS = BEAM_FLOORS_2;

export const SLAB_TYPES = [
  { value: 'grade', label: 'Grade Slab (Concrete only)' },
  { value: 'structural', label: 'Structural Slab (Steel + Concrete)' },
];

export const NAV_SECTIONS = [
  { id: 'project', label: 'Project Setup', icon: ClipboardList },
  { id: 'footingBoxes', label: 'Footing Boxes', icon: Box },
  { id: 'stripFootings', label: 'Strip Footings', icon: Rows3 },
  { id: 'groundBeams', label: 'Ground Beams', icon: Minus },
  { id: 'columns', label: 'Columns', icon: RectangleVertical },
  { id: 'ringBeams', label: 'Ring Beams', icon: Square },
  { id: 'floorBeams', label: 'Floor Beams', icon: Rows4 },
  { id: 'slabs', label: 'Slabs', icon: Grid3x3 },
  { id: 'blinding', label: 'Blinding Concrete', icon: Layers },
  { id: 'summary', label: 'Summary', icon: BarChart3 },
];

export const SAMPLE_FOOTING = {
  id: 'sample-f1',
  name: 'F1',
  length: 1800,
  width: 1600,
  depth: 400,
  type: 'isolated',
  bottomAlongL: { dia: 'Y16', spacing: 200 },
  bottomAlongW: { dia: 'Y16', spacing: 200 },
  topAlongL: null,
  topAlongW: null,
  quantity: 3,
};
