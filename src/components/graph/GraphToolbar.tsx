export function GraphToolbar({ count, onGoHead, onGoLatest }: { count: number; onGoHead: () => void; onGoLatest: () => void }) {
  return (
    <div className="graph-toolbar">
      <strong>Commit Graph</strong>
      <span>{count} commits</span>
      <button onClick={onGoHead}>Go HEAD</button>
      <button onClick={onGoLatest}>Go Latest</button>
      <span className="graph-help" title="Time flows top to bottom. Branch lanes run vertically; dashed amber lines are merge edges.">
        ?
      </span>
    </div>
  );
}
