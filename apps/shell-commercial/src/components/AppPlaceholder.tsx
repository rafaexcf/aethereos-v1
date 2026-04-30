export function AppPlaceholder({
  appName,
  sprintTarget,
}: {
  appName: string;
  sprintTarget?: string;
}) {
  return (
    <div
      className="h-full flex items-center justify-center"
      style={{ background: "var(--bg-base)" }}
    >
      <div className="flex flex-col items-center gap-3 text-center max-w-xs">
        <div
          className="flex items-center justify-center mb-2"
          style={{
            width: 64,
            height: 64,
            borderRadius: "var(--radius-xl)",
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
            boxShadow: "var(--glass-specular)",
          }}
        >
          <span style={{ fontSize: 28 }}>🚧</span>
        </div>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.03em",
          }}
        >
          {appName}
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-tertiary)",
            letterSpacing: "-0.01em",
          }}
        >
          Em breve — {sprintTarget ?? "próximos sprints"}
        </p>
      </div>
    </div>
  );
}
