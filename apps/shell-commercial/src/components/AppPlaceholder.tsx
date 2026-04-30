export function AppPlaceholder({
  appName,
  sprintTarget,
}: {
  appName: string;
  sprintTarget?: string;
}) {
  return (
    <div
      className="h-full flex items-center justify-center text-center"
      style={{ background: "var(--bg-base)" }}
    >
      <div>
        <h2
          className="text-[22px] font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {appName}
        </h2>
        <p
          className="text-[14px] mt-2"
          style={{ color: "var(--text-secondary)" }}
        >
          Em breve — {sprintTarget ?? "próximos sprints"}
        </p>
      </div>
    </div>
  );
}
