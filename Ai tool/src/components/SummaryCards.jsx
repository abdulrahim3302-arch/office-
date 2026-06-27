export function SummaryCards({ summary, members }) {
  const cards = [
    {
      label: "Total Concrete",
      value: (summary.total_concrete_m3 || 0).toFixed(1),
      unit: "m³",
      color: "#C4873A",
      background: "#110f06",
      border: "#2a2208",
    },
    {
      label: "Total Steel",
      value: (summary.total_steel_ton || (summary.total_steel_kg || 0) / 1000).toFixed(2),
      unit: `tons (${(summary.total_steel_kg || 0).toFixed(0)} kg)`,
      color: "#5BA4C9",
      background: "#060d12",
      border: "#0a2030",
    },
    {
      label: "Members Found",
      value: members.length,
      unit: "types",
      color: "#5aaa5a",
      background: "#060d08",
      border: "#0a300a",
    },
  ];

  return (
    <div className="summary-grid">
      {cards.map((card) => (
        <div key={card.label} style={{ background: card.background, border: `1px solid ${card.border}` }} className="summary-card">
          <div className="summary-card__label">{card.label}</div>
          <div style={{ color: card.color }} className="summary-card__value">{card.value}</div>
          <div className="summary-card__unit">{card.unit}</div>
        </div>
      ))}
    </div>
  );
}
