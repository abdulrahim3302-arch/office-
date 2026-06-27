import { useState } from "react";
import { chipLabel, chipValue, makeChipBox } from "../styles/ui";

export function ResultCard({ member }) {
  const [open, setOpen] = useState(false);
  const hasBarDetails = member.steel?.length > 0 || member.floors?.length > 0;

  return (
    <div className="result-card">
      <div className="result-card__header">
        <MemberTitle member={member} />
        <MemberTotals member={member} />
      </div>

      {hasBarDetails && (
        <div style={{ marginTop: "6px" }}>
          <button onClick={() => setOpen(!open)} className="details-toggle">
            {open ? "▾ Hide" : "▸ Show"} bar details
          </button>
          {open && <BarDetailsTable member={member} />}
        </div>
      )}
    </div>
  );
}

function MemberTitle({ member }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
        <span style={{ fontSize: "16px", fontWeight: 800, color: "#fff" }}>{member.name}</span>
        <span className="member-pill">
          {member.type} × {member.quantity}
        </span>
      </div>
      <div style={{ fontSize: "11px", color: "#555", marginTop: "2px", fontFamily: "monospace" }}>
        {formatDimensions(member.dimensions)}
        {member.notes && ` · ${member.notes}`}
      </div>
    </div>
  );
}

function MemberTotals({ member }) {
  return (
    <div style={{ display: "flex", gap: "8px" }}>
      <div style={makeChipBox("#110f06", "#2a2208")}>
        <div style={chipLabel}>Concrete</div>
        <div style={{ ...chipValue, color: "#C4873A" }}>{(member.concrete_total_m3 || 0).toFixed(2)} m³</div>
      </div>
      <div style={makeChipBox("#060d12", "#0a2030")}>
        <div style={chipLabel}>Steel</div>
        <div style={{ ...chipValue, color: "#5BA4C9" }}>{(member.steel_total_kg || 0).toFixed(1)} kg</div>
      </div>
    </div>
  );
}

function BarDetailsTable({ member }) {
  const rows = [
    ...(member.steel || []),
    ...(member.floors || []).flatMap((floor) => floor.steel || []),
  ];

  return (
    <table className="bar-table">
      <thead>
        <tr>
          {["Description", "Ø", "Shape", "Bar Len", "Bars", "Weight"].map((heading) => (
            <th key={heading}>{heading}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((steel, index) => (
          <tr key={index}>
            <td>{steel.description}</td>
            <td className="mono blue">{steel.dia}mm</td>
            <td>{steel.shape}</td>
            <td className="mono">{steel.bar_length_m}m</td>
            <td className="mono strong">{steel.total_bars}</td>
            <td className="mono blue strong">{(steel.weight_kg || 0).toFixed(1)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function formatDimensions(dimensions) {
  if (!dimensions) return "";
  return Object.entries(dimensions)
    .map(([key, value]) => `${key}: ${value}`)
    .join(" · ");
}
