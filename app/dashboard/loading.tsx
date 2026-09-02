export default function Loading() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
      <div
        style={{
          width: 34, height: 34, borderRadius: "50%",
          border: "3px solid var(--border)", borderTopColor: "var(--blue)",
          animation: "spin 0.7s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
