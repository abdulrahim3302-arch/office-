export function LogPanel({ log }) {
  if (!log.length) return null;

  return (
    <div className="log-panel">
      {log.map((entry, index) => (
        <div key={index} style={{ fontSize: "10px", color: getLogColor(entry.msg), fontFamily: "monospace", padding: "1px 0" }}>
          <span style={{ color: "#333", marginRight: "6px" }}>{entry.t}</span>
          {entry.msg}
        </div>
      ))}
    </div>
  );
}

function getLogColor(message) {
  if (message.startsWith("✓")) return "#5aaa5a";
  if (message.startsWith("✗")) return "#c44";
  return "#555";
}
