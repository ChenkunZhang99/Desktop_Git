interface ConflictActionsProps {
  canContinue: boolean;
  operation: string;
  onUseLocal: () => void;
  onUseRemote: () => void;
  onUseBoth: () => void;
  onManualEdit: () => void;
  onSave: () => void;
  onMarkResolved: () => void;
  onContinue: () => void;
  onAbort: () => void;
}

export function ConflictActions({
  canContinue,
  operation,
  onUseLocal,
  onUseRemote,
  onUseBoth,
  onManualEdit,
  onSave,
  onMarkResolved,
  onContinue,
  onAbort
}: ConflictActionsProps) {
  return (
    <div className="conflict-actions">
      <button onClick={onUseLocal}>Use Local</button>
      <button onClick={onUseRemote}>Use Remote</button>
      <button
        className="warning-button"
        onClick={() => {
          if (confirm("Use Both may create duplicate imports, functions, or logic. Continue?")) {
            onUseBoth();
          }
        }}
      >
        Use Both
      </button>
      <button onClick={onManualEdit}>Manual Edit</button>
      <button className="primary-small" onClick={onSave}>Save Result</button>
      <button onClick={onMarkResolved}>Mark Resolved</button>
      <button disabled={!canContinue} onClick={onContinue}>
        Continue {operation === "none" ? "Operation" : operation}
      </button>
      <button
        className="danger-button"
        disabled={operation === "none"}
        onClick={() => {
          if (confirm(`Abort current ${operation}? This is a destructive Git operation.`)) {
            onAbort();
          }
        }}
      >
        Abort
      </button>
    </div>
  );
}
