export function SectionTable({ activeDias, getDia, summary }) {
  if (!summary.by_section || !Object.keys(summary.by_section).length) return null;

  return (
    <div className="panel table-panel">
      <div className="panel-title">Steel × Section (kg)</div>
      <table className="section-table">
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>Section</th>
            {activeDias.map((diameter) => (
              <th key={diameter} style={{ color: "#5BA4C9", textAlign: "right" }}>{diameter}mm</th>
            ))}
            <th>Total</th>
            <th>Ton</th>
            <th>m³</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(summary.by_section)
            .filter(([, value]) => value.steel_kg > 0)
            .map(([section, value]) => (
              <tr key={section}>
                <td style={{ color: "#999", fontWeight: 600 }}>{section}</td>
                {activeDias.map((diameter) => {
                  const steel = value[`${diameter}mm`] || 0;
                  return (
                    <td key={diameter} style={{ color: steel > 0 ? "#777" : "#222", textAlign: "right", fontFamily: "monospace" }}>
                      {steel > 0 ? steel.toFixed(0) : "—"}
                    </td>
                  );
                })}
                <td className="gold strong">{value.steel_kg.toFixed(0)}</td>
                <td className="gold">{(value.steel_kg / 1000).toFixed(2)}</td>
                <td className="gold">{(value.concrete_m3 || 0).toFixed(1)}</td>
              </tr>
            ))}
          <tr className="total-row">
            <td style={{ color: "#fff", fontWeight: 800 }}>TOTAL</td>
            {activeDias.map((diameter) => (
              <td key={diameter} style={{ color: "#5BA4C9", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>
                {getDia(diameter).toFixed(0)}
              </td>
            ))}
            <td className="gold strong">{(summary.total_steel_kg || 0).toFixed(0)}</td>
            <td className="gold strong">{((summary.total_steel_kg || 0) / 1000).toFixed(2)}</td>
            <td className="gold strong">{(summary.total_concrete_m3 || 0).toFixed(1)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
