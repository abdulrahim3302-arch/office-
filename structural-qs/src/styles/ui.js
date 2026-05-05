export const chipLabel = {
  fontSize: "8px",
  color: "#555",
  fontWeight: 700,
  textTransform: "uppercase",
};

export const chipValue = {
  fontSize: "13px",
  fontFamily: "monospace",
  fontWeight: 700,
  marginTop: "1px",
};

export const makeChipBox = (background, borderColor) => ({
  background,
  border: `1px solid ${borderColor}`,
  borderRadius: "6px",
  padding: "5px 10px",
  textAlign: "center",
});
