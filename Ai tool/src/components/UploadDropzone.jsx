import { Loader2, CheckCircle2, Ruler } from 'lucide-react';

export function UploadDropzone({ data, fileName, loading, inputRef, onFiles }) {
  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onFiles(Array.from(event.dataTransfer.files));
      }}
      onClick={() => !loading && inputRef.current?.click()}
      style={{
        border: `2px dashed ${data ? "#2a5a2a" : "#222"}`,
        borderRadius: "14px",
        padding: loading ? "30px" : "40px 20px",
        textAlign: "center",
        cursor: loading ? "wait" : "pointer",
        background: data ? "rgba(42,90,42,0.03)" : "rgba(255,255,255,0.01)",
        marginBottom: "18px",
        transition: "all 0.2s",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,image/*"
        onChange={(event) => onFiles(Array.from(event.target.files))}
        style={{ display: "none" }}
      />
      {loading ? <LoadingState /> : data ? <CompleteState fileName={fileName} /> : <EmptyState />}
    </div>
  );
}

function LoadingState() {
  return (
    <div>
      <div className="spinner" style={{ display: "flex", justifyContent: "center", marginBottom: "8px", color: "#C4873A" }}>
        <Loader2 className="animate-spin" size={28} />
      </div>
      <div style={{ color: "#C4873A", fontSize: "14px", fontWeight: 700 }}>Analyzing your drawings...</div>
      <div style={{ color: "#555", fontSize: "11px", marginTop: "4px" }}>
        This takes 30-60 seconds depending on page count
      </div>
    </div>
  );
}

function CompleteState({ fileName }) {
  return (
    <div>
      <div style={{ color: "#5aaa5a", fontSize: "14px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
        <CheckCircle2 size={16} /> {fileName}
      </div>
      <div style={{ color: "#444", fontSize: "11px", marginTop: "4px" }}>Drop a new file to re-analyze</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px", opacity: 0.5 }}>
        <Ruler size={32} />
      </div>
      <div style={{ color: "#bbb", fontSize: "15px", fontWeight: 700 }}>Drop your structural PDF or drawing here</div>
      <div style={{ color: "#555", fontSize: "12px", marginTop: "6px" }}>
        One file — the AI will find schedules, count members, and calculate everything
      </div>
      <div style={{ color: "#3a3a3a", fontSize: "11px", marginTop: "4px" }}>PDF, JPG, PNG</div>
    </div>
  );
}
