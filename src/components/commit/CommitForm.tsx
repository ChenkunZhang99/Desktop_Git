import { useState } from "react";

interface CommitFormProps {
  stagedCount: number;
  changedCount: number;
  conflictCount: number;
  onStageAll: () => void;
  onCommit: (message: string) => void;
  onStageAllAndCommit: (message: string) => void;
}

export function CommitForm({ stagedCount, changedCount, conflictCount, onStageAll, onCommit, onStageAllAndCommit }: CommitFormProps) {
  const [message, setMessage] = useState("");
  const hasMessage = message.trim().length > 0;
  const hasConflicts = conflictCount > 0;

  return (
    <section className="commit-box">
      <div className="commit-summary">
        <strong>Commit</strong>
        <span>{stagedCount} staged · {changedCount} unstaged</span>
      </div>
      <form
        className="commit-form"
        onSubmit={(event) => {
          event.preventDefault();
          onCommit(message);
          setMessage("");
        }}
      >
        <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Commit message" />
        <button disabled={stagedCount === 0 || !hasMessage || hasConflicts}>Commit Staged</button>
      </form>
      <div className="commit-actions">
        <button disabled={changedCount === 0 || hasConflicts} onClick={onStageAll}>
          Stage All
        </button>
        <button
          disabled={(changedCount === 0 && stagedCount === 0) || !hasMessage || hasConflicts}
          onClick={() => {
            onStageAllAndCommit(message);
            setMessage("");
          }}
        >
          Stage All + Commit
        </button>
        {hasConflicts ? <span className="form-hint form-hint-error">Resolve conflicts before committing.</span> : null}
      </div>
    </section>
  );
}
