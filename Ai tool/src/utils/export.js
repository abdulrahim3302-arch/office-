import * as XLSX from 'xlsx';
import { BAR_TYPES } from './constants.js';
import {
  calcFootingBox, calcStripFooting, calcBeam, calcColumn, calcSlab,
  totalKg,
} from './calculations.js';

function n2(v) { return v ? +v.toFixed(2) : 0; }
function n3(v) { return v ? +v.toFixed(3) : 0; }

function steelRow(label, steel, concrete) {
  const row = { 'Description': label };
  for (const dia of BAR_TYPES) {
    row[dia] = n2(steel[dia] || 0);
  }
  row['Total (kg)'] = n2(Object.values(steel).reduce((s, v) => s + v, 0));
  row['Total (ton)'] = n3(Object.values(steel).reduce((s, v) => s + v, 0) / 1000);
  row['Concrete (m³)'] = n3(concrete || 0);
  return row;
}

function applyHeaderStyle(ws, headerRow) {
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let C = range.s.c; C <= range.e.c; C++) {
    const addr = XLSX.utils.encode_cell({ r: headerRow, c: C });
    if (!ws[addr]) continue;
    ws[addr].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1a3a5c' } },
      alignment: { horizontal: 'center' },
    };
  }
}

export function exportToExcel(state, settings, summaryData) {
  const wb = XLSX.utils.book_new();
  const s = state.sections;

  // ─ Footing Boxes sheet ─
  if (s.footingBoxes.members.length > 0) {
    const rows = s.footingBoxes.members.map((m) => {
      const { steel, concrete } = calcFootingBox(m, settings);
      return steelRow(`${m.name} (${m.type}) ${m.length}×${m.width}×${m.depth}mm ×${m.quantity}`, steel, concrete);
    });
    const totRow = aggregateRows(rows, 'TOTAL');
    const ws = XLSX.utils.json_to_sheet([...rows, totRow]);
    applyHeaderStyle(ws, 0);
    XLSX.utils.book_append_sheet(wb, ws, 'Footing Boxes');
  }

  // ─ Strip Footings sheet ─
  if (s.stripFootings.members.length > 0) {
    const rows = s.stripFootings.members.map((m) => {
      const { steel, concrete } = calcStripFooting(m, settings);
      return steelRow(`${m.name} ${m.width}×${m.depth}mm @ ${m.runningMeters}m`, steel, concrete);
    });
    const ws = XLSX.utils.json_to_sheet([...rows, aggregateRows(rows, 'TOTAL')]);
    applyHeaderStyle(ws, 0);
    XLSX.utils.book_append_sheet(wb, ws, 'Strip Footings');
  }

  // ─ Ground Beams sheet ─
  if (s.groundBeams.members.length > 0) {
    const rows = s.groundBeams.members.map((m) => {
      const { steel, concrete } = calcBeam(m, settings);
      return steelRow(`${m.name} ${m.width}×${m.depth}mm @ ${m.runningMeters}m`, steel, concrete);
    });
    const ws = XLSX.utils.json_to_sheet([...rows, aggregateRows(rows, 'TOTAL')]);
    applyHeaderStyle(ws, 0);
    XLSX.utils.book_append_sheet(wb, ws, 'Ground Beams');
  }

  // ─ Columns sheets ─
  for (const floorId of ['foundation', 'groundFloor', 'firstFloor', 'roofFloor', 'upperRoof']) {
    const fd = s.columns.floorData[floorId];
    if (!fd?.members?.length) continue;
    const rows = fd.members.map((m) => {
      const { steel, concrete } = calcColumn(m, fd.height, fd.lap, fd.hasConcrete, settings);
      return steelRow(`${m.name} ${m.width}×${m.depth}mm ×${m.quantity}`, steel, concrete);
    });
    const ws = XLSX.utils.json_to_sheet([...rows, aggregateRows(rows, 'TOTAL')]);
    applyHeaderStyle(ws, 0);
    XLSX.utils.book_append_sheet(wb, ws, fd.name.slice(0, 31));
  }

  // ─ Ring Beams + Floor Beams sheets ─
  for (const [sectionKey, sheetPrefix] of [['ringBeams', 'Ring'], ['floorBeams', 'Beams']]) {
    for (const floorId of ['groundFloor', 'firstFloor', 'roofFloor']) {
      const fd = s[sectionKey].floorData[floorId];
      if (!fd?.members?.length) continue;
      const rows = fd.members.map((m) => {
        const { steel, concrete } = calcBeam(m, settings);
        return steelRow(`${m.name} ${m.width}×${m.depth}mm @ ${m.runningMeters}m`, steel, concrete);
      });
      const ws = XLSX.utils.json_to_sheet([...rows, aggregateRows(rows, 'TOTAL')]);
      applyHeaderStyle(ws, 0);
      XLSX.utils.book_append_sheet(wb, ws, `${sheetPrefix} ${fd.name}`.slice(0, 31));
    }
  }

  // ─ Slabs sheet ─
  if (s.slabs.members.length > 0) {
    const rows = s.slabs.members.map((m) => {
      const { steel, concrete } = calcSlab(m, settings);
      return steelRow(`${m.name} (${m.type}) ${m.area}m² t=${m.thickness}mm`, steel, concrete);
    });
    const ws = XLSX.utils.json_to_sheet([...rows, aggregateRows(rows, 'TOTAL')]);
    applyHeaderStyle(ws, 0);
    XLSX.utils.book_append_sheet(wb, ws, 'Slabs');
  }

  // ─ Grand Summary sheet ─
  const sumRows = summaryData.rows.map((r) => steelRow(r.label, r.steel, r.concrete));
  const grandRow = steelRow('GRAND TOTAL', summaryData.grandSteel, summaryData.grandConcrete);
  grandRow['Description'] = '★ GRAND TOTAL';

  const wsSummary = XLSX.utils.json_to_sheet([...sumRows, grandRow]);
  applyHeaderStyle(wsSummary, 0);

  // Style grand total row
  const lastRow = sumRows.length + 1;
  const cols = ['Description', ...BAR_TYPES, 'Total (kg)', 'Total (ton)', 'Concrete (m³)'];
  cols.forEach((_, ci) => {
    const addr = XLSX.utils.encode_cell({ r: lastRow, c: ci });
    if (!wsSummary[addr]) return;
    wsSummary[addr].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: '0d3d1a' } },
    };
  });

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Grand Summary');

  // Column widths
  [wsSummary].forEach((ws) => {
    ws['!cols'] = [{ wch: 40 }, ...BAR_TYPES.map(() => ({ wch: 9 })), { wch: 12 }, { wch: 11 }, { wch: 14 }];
  });

  const projectName = state.project.name || 'QS-Report';
  XLSX.writeFile(wb, `${projectName}-QS-Report.xlsx`);
}

function aggregateRows(rows, label) {
  const tot = { Description: label };
  for (const dia of BAR_TYPES) {
    tot[dia] = n2(rows.reduce((s, r) => s + (r[dia] || 0), 0));
  }
  tot['Total (kg)'] = n2(rows.reduce((s, r) => s + (r['Total (kg)'] || 0), 0));
  tot['Total (ton)'] = n3(rows.reduce((s, r) => s + (r['Total (ton)'] || 0), 0));
  tot['Concrete (m³)'] = n3(rows.reduce((s, r) => s + (r['Concrete (m³)'] || 0), 0));
  return tot;
}
