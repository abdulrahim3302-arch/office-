import { DIAMETERS } from "../constants/steel";

export function recalcSummary(result) {
  let totalSteel = 0;
  let totalConcrete = 0;
  const byDia = {};
  const bySection = {};

  DIAMETERS.forEach((diameter) => {
    byDia[diameter] = 0;
  });

  (result.members || []).forEach((member) => {
    totalConcrete += member.concrete_total_m3 || 0;
    totalSteel += member.steel_total_kg || 0;

    const section = getSectionName(member.category);
    if (!bySection[section]) {
      bySection[section] = { concrete_m3: 0, steel_kg: 0 };
      DIAMETERS.forEach((diameter) => {
        bySection[section][`${diameter}mm`] = 0;
      });
    }

    bySection[section].concrete_m3 += member.concrete_total_m3 || 0;
    bySection[section].steel_kg += member.steel_total_kg || 0;

    getAllSteel(member).forEach((steel) => {
      byDia[steel.dia] = (byDia[steel.dia] || 0) + (steel.weight_kg || 0);
      bySection[section][`${steel.dia}mm`] =
        (bySection[section][`${steel.dia}mm`] || 0) + (steel.weight_kg || 0);
    });
  });

  result.summary = {
    total_concrete_m3: totalConcrete,
    total_steel_kg: totalSteel,
    total_steel_ton: totalSteel / 1000,
    steel_by_dia: byDia,
    by_section: bySection,
  };
}

function getAllSteel(member) {
  return [...(member.steel || []), ...(member.floors || []).flatMap((floor) => floor.steel || [])];
}

function getSectionName(category) {
  if (category === "footing") return "Footings";
  if (category === "column") return "Columns";
  return "Beams/Lintels";
}
