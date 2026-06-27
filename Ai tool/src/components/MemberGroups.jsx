import { ResultCard } from "./ResultCard";

const CATEGORIES = ["footing", "column", "beam", "lintel", "ground_beam", "coping", "boundary"];

export function MemberGroups({ members }) {
  return CATEGORIES.map((category) => {
    const items = members.filter((member) => (member.category || "").toLowerCase().includes(category));
    if (!items.length) return null;

    return (
      <div key={category} style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "12px", fontWeight: 800, color: "#888", marginBottom: "8px" }}>
          {getCategoryLabel(category)} <span style={{ fontWeight: 500, color: "#444" }}>({items.length})</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {items.map((member) => (
            <ResultCard key={member.name} member={member} />
          ))}
        </div>
      </div>
    );
  });
}

function getCategoryLabel(category) {
  return category.charAt(0).toUpperCase() + category.slice(1) + "s";
}
