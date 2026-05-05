import { DIAMETERS } from "../constants/steel";
import { MemberGroups } from "./MemberGroups";
import { PagesIdentified } from "./PagesIdentified";
import { SectionTable } from "./SectionTable";
import { SteelByDiameter } from "./SteelByDiameter";
import { SummaryCards } from "./SummaryCards";

export function Results({ data }) {
  const summary = data?.summary;
  const members = data?.members || [];
  if (!summary) return null;

  const getDia = (diameter) => summary.steel_by_dia?.[diameter] || summary.steel_by_dia?.[String(diameter)] || 0;
  const activeDias = DIAMETERS.filter((diameter) => getDia(diameter) > 0);

  return (
    <div>
      <SummaryCards summary={summary} members={members} />
      <SteelByDiameter activeDias={activeDias} getDia={getDia} />
      <SectionTable activeDias={activeDias} getDia={getDia} summary={summary} />
      <MemberGroups members={members} />
      <PagesIdentified pages={data.pages_identified} />
    </div>
  );
}
