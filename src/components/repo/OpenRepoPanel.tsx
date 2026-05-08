interface OpenRepoPanelProps {
  busy: boolean;
  error: string | null;
  onOpen: () => void;
}

export function OpenRepoPanel({ busy, error, onOpen }: OpenRepoPanelProps) {
  return (
    <main className="launch">
      <section className="launch-card">
        <p className="eyebrow">Local Git Cockpit</p>
        <h1>Visualize branches. Resolve conflicts. Stay in flow.</h1>
        <p>
          Open a local repository to inspect history, stage changes, view diffs, and handle merge conflicts without leaving the
          desktop app.
        </p>
        <button className="primary-action" disabled={busy} onClick={onOpen}>
          {busy ? "Opening..." : "Open Repository"}
        </button>
        {error ? <div className="error-card">{error}</div> : null}
      </section>
    </main>
  );
}
