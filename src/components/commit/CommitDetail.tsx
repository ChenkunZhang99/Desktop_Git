import Editor from "@monaco-editor/react";
import type { CommitInfo } from "../../types/git";

interface CommitDetailProps {
  commit: CommitInfo | null;
  detail: string;
}

export function CommitDetail({ commit, detail }: CommitDetailProps) {
  return (
    <section className="inspector-card commit-detail">
      <div className="inspector-header">
        <strong>Commit Detail</strong>
        <span>{commit?.shortHash ?? "No commit selected"}</span>
      </div>
      {commit ? (
        <div className="commit-meta">
          <h3>{commit.message}</h3>
          <p>{commit.authorName} · {new Date(commit.date).toLocaleString()}</p>
        </div>
      ) : null}
      {commit ? (
        <Editor
          height="100%"
          language="diff"
          theme="vs-dark"
          value={detail || "Loading commit detail..."}
          options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12, wordWrap: "on" }}
        />
      ) : (
        <div className="empty-state">
          <strong>Select a commit</strong>
          <span>Click any node in the graph to inspect commit metadata, stats, and patch.</span>
        </div>
      )}
    </section>
  );
}
