export function PagesIdentified({ pages }) {
  if (!pages?.length) return null;

  return (
    <div className="pages-panel">
      <div style={{ fontSize: "10px", color: "#444", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>
        Pages Analyzed
      </div>
      {pages.map((page, index) => (
        <div key={index} style={{ fontSize: "10px", color: "#555", fontFamily: "monospace", padding: "1px 0" }}>
          Page {page.page}: {page.content}
        </div>
      ))}
    </div>
  );
}
