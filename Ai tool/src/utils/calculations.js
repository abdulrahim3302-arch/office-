import { BAR_DIAMETER_MM, BAR_TYPES } from './constants.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getBarDiaMm(barName) {
  return BAR_DIAMETER_MM[barName] ?? parseInt(barName.replace(/\D/g, ''));
}

export function getKgPerM(barName, kgPerMSettings) {
  if (kgPerMSettings?.[barName]) return kgPerMSettings[barName];
  const d = getBarDiaMm(barName);
  return (d * d) / 162;
}

function addWeight(obj, barName, weight) {
  if (!barName || !weight || weight <= 0) return;
  obj[barName] = (obj[barName] || 0) + weight;
}

function mFromMm(mm) {
  return Math.round(mm / 100) / 10;
}

export function mergeTotals(...objects) {
  const result = {};
  for (const obj of objects) {
    if (!obj) continue;
    for (const [k, v] of Object.entries(obj)) {
      result[k] = (result[k] || 0) + (v || 0);
    }
  }
  return result;
}

export function totalKg(steelObj) {
  return Object.values(steelObj || {}).reduce((s, v) => s + v, 0);
}

// ─── 1. Footing Boxes ────────────────────────────────────────────────────────

export function calcFootingBox(member, settings) {
  const { length: L, width: W, depth: D, type, bottomAlongL, bottomAlongW, topAlongL, topAlongW, quantity: qty } = member;
  if (!qty || qty <= 0) return { steel: {}, concrete: 0, details: {} };

  const cover2 = settings.covers.footing * 2; // 140mm
  const wst = 1 + settings.wastage.main;
  const steel = {};
  const details = {};

  const b1Leg = D - cover2;

  // ── Bottom Along L bars (first/outer layer) ──
  if (bottomAlongL?.dia && bottomAlongL?.spacing) {
    const straight = L - cover2;
    const barLenMm = 2 * b1Leg + straight;
    const barLenM = mFromMm(barLenMm);
    const count = Math.ceil((W - cover2) / bottomAlongL.spacing);
    const kgm = getKgPerM(bottomAlongL.dia, settings.kgPerM);
    const weight = count * barLenM * kgm * qty * wst;
    addWeight(steel, bottomAlongL.dia, weight);
    details.bottomAlongL = { b1Leg, straight, barLenMm, barLenM, count, kgm, weight };
  }

  // ── Bottom Along W bars (second layer, shorter leg) ──
  if (bottomAlongW?.dia && bottomAlongW?.spacing) {
    const diaB1 = bottomAlongL?.dia ? getBarDiaMm(bottomAlongL.dia) : 0;
    const b2Leg = b1Leg - diaB1;
    const straight = W - cover2;
    const barLenMm = 2 * b2Leg + straight;
    const barLenM = mFromMm(barLenMm);
    const count = Math.ceil((L - cover2) / bottomAlongW.spacing);
    const kgm = getKgPerM(bottomAlongW.dia, settings.kgPerM);
    const weight = count * barLenM * kgm * qty * wst;
    addWeight(steel, bottomAlongW.dia, weight);
    details.bottomAlongW = { b2Leg, straight, barLenMm, barLenM, count, kgm, weight };
  }

  // ── Top steel (eccentric / combined / lift, or isolated with optional top) ──
  const hasTop = ['eccentric', 'combined', 'lift'].includes(type) || !!(topAlongL?.dia || topAlongW?.dia);
  if (hasTop && topAlongL?.dia && topAlongL?.spacing) {
    const straight = L - cover2;
    const barLenMm = 2 * b1Leg + straight;
    const barLenM = mFromMm(barLenMm);
    const count = Math.ceil((W - cover2) / topAlongL.spacing);
    const kgm = getKgPerM(topAlongL.dia, settings.kgPerM);
    const weight = count * barLenM * kgm * qty * wst;
    addWeight(steel, topAlongL.dia, weight);
    details.topAlongL = { b1Leg, straight, barLenMm, barLenM, count, kgm, weight };
  }
  if (hasTop && topAlongW?.dia && topAlongW?.spacing) {
    const diaRef = topAlongL?.dia ?? bottomAlongL?.dia;
    const diaB1 = diaRef ? getBarDiaMm(diaRef) : 0;
    const b2Leg = b1Leg - diaB1;
    const straight = W - cover2;
    const barLenMm = 2 * b2Leg + straight;
    const barLenM = mFromMm(barLenMm);
    const count = Math.ceil((L - cover2) / topAlongW.spacing);
    const kgm = getKgPerM(topAlongW.dia, settings.kgPerM);
    const weight = count * barLenM * kgm * qty * wst;
    addWeight(steel, topAlongW.dia, weight);
    details.topAlongW = { b2Leg, straight, barLenMm, barLenM, count, kgm, weight };
  }

  // ── Chair bars (CH1) for non-isolated ──
  if (hasTop) {
    const maxDimM = Math.max(L, W) / 1000;
    const chairQty = maxDimM <= 2 ? 4 : maxDimM <= 3 ? 6 : maxDimM <= 4 ? 8 : 12;
    const chairDia = (type === 'combined' || type === 'lift') ? 'Y16' : 'Y12';
    const chairLen = 1.754;
    const kgm = getKgPerM(chairDia, settings.kgPerM);
    const weight = chairQty * chairLen * kgm * qty * wst;
    addWeight(steel, chairDia, weight);
    details.chairs = { chairDia, chairQty, chairLen, weight };
  }

  // ── FB1 T10 support bars (2 per footing) ──
  const fb1Straight = (Math.max(L, W) - cover2) / 1000;
  const fb1Len = fb1Straight + 2 * (D + 200) / 1000;
  const fb1Kgm = getKgPerM('T10', settings.kgPerM);
  const fb1Weight = 2 * fb1Len * fb1Kgm * qty * wst;
  addWeight(steel, 'T10', fb1Weight);
  details.fb1 = { fb1Len, fb1Kgm, fb1Weight };

  const concrete = (L / 1000) * (W / 1000) * (D / 1000) * qty;
  details.cover2 = cover2;
  details.b1Leg = b1Leg;
  details.qty = qty;

  return { steel, concrete, details };
}

// ─── 2. Strip / Boundary Footings ────────────────────────────────────────────

export function calcStripFooting(member, settings) {
  const { width: W, depth: D, bottomAlongW, bottomAlongL, topAlongW, topAlongL, stirrups, runningMeters: RM } = member;
  if (!RM || RM <= 0) return { steel: {}, concrete: 0, details: {} };

  const cover2 = settings.covers.footing * 2;
  const wst = 1 + settings.wastage.main;
  const wstStir = 1 + settings.wastage.stirrup;
  const steel = {};
  const details = {};

  const b1Leg = D - cover2;

  // Bottom Along W — transverse U-bars across width (count from RM / spacing)
  if (bottomAlongW?.dia && bottomAlongW?.spacing) {
    const straight = W - cover2;
    const barLenMm = 2 * b1Leg + straight;
    const barLenM = mFromMm(barLenMm);
    const count = Math.ceil((RM * 1000) / bottomAlongW.spacing);
    const kgm = getKgPerM(bottomAlongW.dia, settings.kgPerM);
    const weight = count * barLenM * kgm * wst;
    addWeight(steel, bottomAlongW.dia, weight);
    details.bottomAlongW = { b1Leg, straight, barLenMm, barLenM, count, kgm, weight };
  }

  // Bottom Along L — longitudinal bars (count from W / spacing, length = RM)
  if (bottomAlongL?.dia && bottomAlongL?.spacing) {
    const count = Math.ceil((W - cover2) / bottomAlongL.spacing);
    const kgm = getKgPerM(bottomAlongL.dia, settings.kgPerM);
    const weight = count * RM * kgm * wst;
    addWeight(steel, bottomAlongL.dia, weight);
    details.bottomAlongL = { count, RM, kgm, weight };
  }

  const hasTop = topAlongW?.dia || topAlongL?.dia;

  // Top Along W — transverse U-bars (inner layer, shorter leg)
  if (topAlongW?.dia && topAlongW?.spacing) {
    const diaB1mm = bottomAlongW?.dia ? getBarDiaMm(bottomAlongW.dia) : 0;
    const b2Leg = b1Leg - diaB1mm;
    const straight = W - cover2;
    const barLenMm = 2 * b2Leg + straight;
    const barLenM = mFromMm(barLenMm);
    const count = Math.ceil((RM * 1000) / topAlongW.spacing);
    const kgm = getKgPerM(topAlongW.dia, settings.kgPerM);
    const weight = count * barLenM * kgm * wst;
    addWeight(steel, topAlongW.dia, weight);
    details.topAlongW = { b2Leg, straight, barLenMm, barLenM, count, kgm, weight };
  }

  // Top Along L — longitudinal top bars (count from W / spacing, length = RM)
  if (topAlongL?.dia && topAlongL?.spacing) {
    const count = Math.ceil((W - cover2) / topAlongL.spacing);
    const kgm = getKgPerM(topAlongL.dia, settings.kgPerM);
    const weight = count * RM * kgm * wst;
    addWeight(steel, topAlongL.dia, weight);
    details.topAlongL = { count, RM, kgm, weight };
  }

  // FB1: 4 T10 support bars along full length
  const fb1Kgm = getKgPerM('T10', settings.kgPerM);
  const fb1Weight = 4 * RM * fb1Kgm * wst;
  addWeight(steel, 'T10', fb1Weight);
  details.fb1 = { fb1Weight };
  details.b1Leg = b1Leg;

  // Stirrups / links — closed links tying top & bottom mats, full length uniform spacing
  if (stirrups?.dia && stirrups?.spacing > 0) {
    const rings = stirrups.rings || 1;
    const cutLen = (2 * (W - cover2) + 2 * (D - cover2) + settings.hookAllowance) / 1000;
    const kgm = getKgPerM(stirrups.dia, settings.kgPerM);
    const numStir = Math.floor((RM * 1000) / stirrups.spacing) + 1;
    const weight = numStir * rings * cutLen * kgm * wstStir;
    addWeight(steel, stirrups.dia, weight);
    details.stirrups = { spacing: stirrups.spacing, numStir, rings, cutLen, kgm, weight };
  }

  const concrete = RM * (W / 1000) * (D / 1000);
  return { steel, concrete, details };
}

// ─── 3. Beams (Ground Beams, Ring Beams, Floor Beams) ────────────────────────

export function calcBeam(member, settings) {
  const {
    width: W, depth: D,
    topBars, bottomBars,
    hasExtraTop, extraTopSupport, extraTopMidspan,
    hasExtraBottom, extraBottomSupport, extraBottomMidspan,
    hasWebBars, webBars,
    stirrups,
    hasMidspanStirrup,
    stirrupsMidspan,
    extraBarLenOverride,
    runningMeters: RM,
  } = member;

  if (!RM || RM <= 0) return { steel: {}, concrete: 0, details: {} };

  const cover2 = settings.covers.beam * 2;
  const wastMain = 1 + settings.wastage.main;
  const wastStir = 1 + settings.wastage.stirrup;
  const steel = {};
  const details = {};

  // 1. Continuous top bars
  if (topBars?.dia && topBars?.count > 0) {
    const kgm = getKgPerM(topBars.dia, settings.kgPerM);
    const weight = topBars.count * RM * kgm * wastMain;
    addWeight(steel, topBars.dia, weight);
    details.contTop = { count: topBars.count, RM, kgm, weight };
  }

  // 2. Continuous bottom bars
  if (bottomBars?.dia && bottomBars?.count > 0) {
    const kgm = getKgPerM(bottomBars.dia, settings.kgPerM);
    const weight = bottomBars.count * RM * kgm * wastMain;
    addWeight(steel, bottomBars.dia, weight);
    details.contBottom = { count: bottomBars.count, RM, kgm, weight };
  }

  // Extra bar zone length: user override or default RM/3
  const zoneLen = (extraBarLenOverride != null && extraBarLenOverride > 0)
    ? extraBarLenOverride
    : RM / 3;

  // 3. Extra top bars
  if (hasExtraTop) {
    if (extraTopSupport?.dia && extraTopSupport?.count > 0) {
      const kgm = getKgPerM(extraTopSupport.dia, settings.kgPerM);
      const weight = 2 * zoneLen * extraTopSupport.count * kgm * wastMain;
      addWeight(steel, extraTopSupport.dia, weight);
      details.extraTopSupport = { occurrences: 2, zoneLen, count: extraTopSupport.count, kgm, weight };
    }
    if (extraTopMidspan?.dia && extraTopMidspan?.count > 0) {
      const kgm = getKgPerM(extraTopMidspan.dia, settings.kgPerM);
      const weight = 1 * zoneLen * extraTopMidspan.count * kgm * wastMain;
      addWeight(steel, extraTopMidspan.dia, weight);
      details.extraTopMidspan = { occurrences: 1, zoneLen, count: extraTopMidspan.count, kgm, weight };
    }
  }

  // 4. Extra bottom bars
  if (hasExtraBottom) {
    if (extraBottomSupport?.dia && extraBottomSupport?.count > 0) {
      const kgm = getKgPerM(extraBottomSupport.dia, settings.kgPerM);
      const weight = 2 * zoneLen * extraBottomSupport.count * kgm * wastMain;
      addWeight(steel, extraBottomSupport.dia, weight);
      details.extraBottomSupport = { occurrences: 2, zoneLen, count: extraBottomSupport.count, kgm, weight };
    }
    if (extraBottomMidspan?.dia && extraBottomMidspan?.count > 0) {
      const kgm = getKgPerM(extraBottomMidspan.dia, settings.kgPerM);
      const weight = 1 * zoneLen * extraBottomMidspan.count * kgm * wastMain;
      addWeight(steel, extraBottomMidspan.dia, weight);
      details.extraBottomMidspan = { occurrences: 1, zoneLen, count: extraBottomMidspan.count, kgm, weight };
    }
  }

  // 5. Web / side face bars
  if (hasWebBars && webBars?.dia && webBars?.count > 0) {
    const kgm = getKgPerM(webBars.dia, settings.kgPerM);
    const weight = webBars.count * RM * kgm * wastMain;
    addWeight(steel, webBars.dia, weight);
    details.webBars = { count: webBars.count, RM, kgm, weight };
  }

  // 6. Stirrups
  if (stirrups?.dia && stirrups?.spacing > 0) {
    const rings = stirrups.rings || 1;
    const cutLen = (2 * (W - cover2) + 2 * (D - cover2) + settings.hookAllowance) / 1000;
    const kgm = getKgPerM(stirrups.dia, settings.kgPerM);

    if (!hasMidspanStirrup) {
      // Uniform: support stirrup covers full beam
      const numStir = Math.floor((RM * 1000) / stirrups.spacing) + 1;
      const weight = numStir * rings * cutLen * kgm * wastStir;
      addWeight(steel, stirrups.dia, weight);
      details.stirrups = { uniform: true, spacing: stirrups.spacing, numStir, rings, cutLen, kgm, weight };
    } else {
      // Zoned: support × 2 ends + midspan, each = RM/3
      const zoneLen = RM / 3;
      const suppCount = Math.floor((zoneLen * 1000) / stirrups.spacing) + 1;
      const totalSuppCount = suppCount * 2;
      const suppWeight = totalSuppCount * rings * cutLen * kgm * wastStir;
      addWeight(steel, stirrups.dia, suppWeight);

      let midCount = 0, midWeight = 0;
      const midSpacing = stirrupsMidspan?.spacing;
      if (midSpacing > 0) {
        midCount = Math.floor((zoneLen * 1000) / midSpacing) + 1;
        midWeight = midCount * rings * cutLen * kgm * wastStir;
        addWeight(steel, stirrups.dia, midWeight);
      }

      details.stirrups = {
        uniform: false, zoneLen,
        suppCount, totalSuppCount, suppWeight, suppSpacing: stirrups.spacing,
        rings, cutLen, kgm,
        midCount, midWeight, midSpacing,
        weight: suppWeight + midWeight,
      };
    }
  }

  details.zoneLen = zoneLen;
  const concrete = (W / 1000) * (D / 1000) * RM;
  return { steel, concrete, details };
}

// ─── 4–8. Columns ────────────────────────────────────────────────────────────

export function calcColumn(member, floorHeight, lapLength, hasConcrete, settings) {
  const { width: W, depth: D, vertBars, stirrups, quantity: qty } = member;
  if (!qty || qty <= 0) return { steel: {}, concrete: 0, details: {} };

  const cover2 = settings.covers.column * 2;
  const wastMain = 1 + settings.wastage.main;
  const wastStir = 1 + settings.wastage.stirrup;
  const steel = {};
  const details = {};

  const steelHeight = floorHeight + lapLength;

  // Vertical bars
  if (vertBars?.dia && vertBars?.count > 0) {
    const kgm = getKgPerM(vertBars.dia, settings.kgPerM);
    const weight = vertBars.count * steelHeight * qty * kgm * wastMain;
    addWeight(steel, vertBars.dia, weight);
    details.vertBars = { count: vertBars.count, steelHeight, lapLength, kgm, weight };
  }

  // Stirrups
  if (stirrups?.dia && stirrups?.spacing > 0) {
    const rings = stirrups.rings || 1;
    const cutLen = (2 * (W - cover2) + 2 * (D - cover2) + settings.hookAllowance) / 1000;
    const numStir = Math.ceil((floorHeight * 1000) / stirrups.spacing) + 1;
    const kgm = getKgPerM(stirrups.dia, settings.kgPerM);
    const weight = numStir * rings * qty * cutLen * kgm * wastStir;
    addWeight(steel, stirrups.dia, weight);
    details.stirrups = { rings, cutLen, numStir, kgm, weight };
  }

  const concrete = hasConcrete ? (W / 1000) * (D / 1000) * floorHeight * qty : 0;
  details.qty = qty;
  details.floorHeight = floorHeight;
  details.lapLength = lapLength;

  return { steel, concrete, details };
}

// ─── 11. Slabs ───────────────────────────────────────────────────────────────

export function calcSlab(member, settings) {
  const { area, thickness, type } = member;
  if (!area || area <= 0) return { steel: {}, concrete: 0, details: {} };

  const steel = {};
  const details = {};
  const wst = 1 + settings.wastage.main;

  if (type === 'structural') {
    const layer1 = member.layer1 || settings.slabSpec.layer1;
    const layer2 = member.layer2 || settings.slabSpec.layer2;

    // Layer 1: full area, both ways
    const barsPerM1 = 1000 / layer1.spacing;
    const totalRM1 = area * barsPerM1 * 2;
    const kgm1 = getKgPerM(layer1.dia, settings.kgPerM);
    const w1 = totalRM1 * kgm1 * wst;
    addWeight(steel, layer1.dia, w1);
    details.layer1 = { barsPerM: barsPerM1, totalRM: totalRM1, kgm: kgm1, weight: w1 };

    // Layer 2: half area, both ways
    const halfArea = area * (layer2.coverage ?? 0.5);
    const barsPerM2 = 1000 / layer2.spacing;
    const totalRM2 = halfArea * barsPerM2 * 2;
    const kgm2 = getKgPerM(layer2.dia, settings.kgPerM);
    const w2 = totalRM2 * kgm2 * wst;
    addWeight(steel, layer2.dia, w2);
    details.layer2 = { halfArea, barsPerM: barsPerM2, totalRM: totalRM2, kgm: kgm2, weight: w2 };
  }

  const concrete = area * (thickness / 1000);
  details.area = area;
  details.thickness = thickness;

  return { steel, concrete, details };
}

// ─── Summary aggregation ─────────────────────────────────────────────────────

export function calcSectionSteelAndConcrete(members, calcFn, settings, extraArgs = []) {
  const totalSteel = {};
  let totalConcrete = 0;
  const memberResults = [];

  for (const member of members) {
    const result = calcFn(member, ...extraArgs, settings);
    mergeInto(totalSteel, result.steel);
    totalConcrete += result.concrete || 0;
    memberResults.push({ member, result });
  }

  return { totalSteel, totalConcrete, memberResults };
}

function mergeInto(target, source) {
  for (const [k, v] of Object.entries(source || {})) {
    target[k] = (target[k] || 0) + v;
  }
}

export function calcGrandSummary(state, settings) {
  const rows = [];

  // Helper to push a row
  function pushRow(label, members, calcFn, extraArgs = []) {
    if (!members?.length) return;
    const { totalSteel, totalConcrete } = calcSectionSteelAndConcrete(members, calcFn, settings, extraArgs);
    if (totalKg(totalSteel) > 0 || totalConcrete > 0) {
      rows.push({ label, steel: totalSteel, concrete: totalConcrete });
    }
  }

  const s = state.sections;

  pushRow('Footing Boxes', s.footingBoxes.members, (m, st) => calcFootingBox(m, st));
  pushRow('Strip Footings', s.stripFootings.members, (m, st) => calcStripFooting(m, st));
  pushRow('Ground Beams', s.groundBeams.members, (m, st) => calcBeam(m, st));

  for (const floorId of ['foundation', 'groundFloor', 'firstFloor', 'secondFloor', 'roofFloor']) {
    const fd = s.columns.floorData[floorId];
    if (!fd?.members?.length) continue;
    const { totalSteel, totalConcrete } = calcSectionSteelAndConcrete(
      fd.members,
      (m, st) => calcColumn(m, fd.height, fd.lap, fd.hasConcrete, st),
      settings,
    );
    if (totalKg(totalSteel) > 0 || totalConcrete > 0) {
      rows.push({ label: fd.name, steel: totalSteel, concrete: totalConcrete });
    }
  }

  for (const floorId of ['groundFloor', 'firstFloor', 'secondFloor', 'roofFloor']) {
    const fd = s.ringBeams.floorData[floorId];
    if (!fd?.members?.length) continue;
    pushRow(`Ring Beams (${fd.name})`, fd.members, (m, st) => calcBeam(m, st));
  }

  for (const floorId of ['groundFloor', 'firstFloor', 'secondFloor', 'roofFloor']) {
    const fd = s.floorBeams.floorData[floorId];
    if (!fd?.members?.length) continue;
    pushRow(`Floor Beams (${fd.name})`, fd.members, (m, st) => calcBeam(m, st));
  }

  pushRow('Slabs', s.slabs.members, (m, st) => calcSlab(m, st));

  // Blinding
  const blindVol = s.blinding?.volume || 0;
  if (blindVol > 0) {
    rows.push({ label: 'Blinding Concrete', steel: {}, concrete: blindVol });
  }

  // Grand totals
  const grandSteel = {};
  let grandConcrete = 0;
  for (const row of rows) {
    mergeInto(grandSteel, row.steel);
    grandConcrete += row.concrete || 0;
  }

  return { rows, grandSteel, grandConcrete };
}
