export function Header() {
  return (
    <div style={{ borderBottom: "1px solid #141414", padding: "16px 20px", background: "#0b0b0b" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", alignItems: "center", gap: "10px" }}>
        <div className="app-logo">QS</div>
        <div>
          <h1 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#eee" }}>Structural QS</h1>
          <p style={{ margin: 0, fontSize: "10px", color: "#444" }}>
            Drop one PDF → AI reads everything → Full BBS output
          </p>
        </div>
      </div>
    </div>
  );
}
