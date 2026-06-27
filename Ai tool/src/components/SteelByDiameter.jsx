export function SteelByDiameter({ activeDias, getDia }) {
  if (!activeDias.length) return null;

  return (
    <div className="panel">
      <div className="panel-title">Steel by Diameter</div>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {activeDias.map((diameter) => (
          <div key={diameter} className="dia-chip">
            <div style={{ fontSize: "13px", color: "#ddd", fontWeight: 700 }}>Ø{diameter}</div>
            <div style={{ fontSize: "12px", color: "#5BA4C9", fontFamily: "monospace", fontWeight: 700, marginTop: "2px" }}>
              {getDia(diameter).toFixed(0)} kg
            </div>
            <div style={{ fontSize: "9px", color: "#3a3a3a" }}>{(getDia(diameter) / 1000).toFixed(2)} ton</div>
          </div>
        ))}
      </div>
    </div>
  );
}
