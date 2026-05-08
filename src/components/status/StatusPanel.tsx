import { useState } from "react";
import type { FileStatus, StatusSummary } from "../../types/git";
import { FileStatusItem } from "./FileStatusItem";
import { CommitForm } from "../commit/CommitForm";

interface StatusPanelProps {
  status: StatusSummary;
  selectedPath?: string;
  onSelect: (file: FileStatus, mode: "working" | "staged") => void;
  onStage: (file: FileStatus) => void;
  onUnstage: (file: FileStatus) => void;
  onDiscard: (file: FileStatus) => void;
  onStageAll: () => void;
  onCommit: (message: string) => void;
  onStageAllAndCommit: (message: string) => void;
}

export function StatusPanel({ status, selectedPath, onSelect, onStage, onUnstage, onDiscard, onStageAll, onCommit, onStageAllAndCommit }: StatusPanelProps) {
  const [tab, setTab] = useState<"changes" | "staged">("changes");
  const workingFiles = [...status.unstaged, ...status.untracked, ...status.conflicted];
  const files = tab === "staged" ? status.staged : workingFiles;

  return (
    <section className="status-panel">
      <div className="status-tabs">
        <button className={tab === "changes" ? "tab-active" : ""} onClick={() => setTab("changes")}>
          Changes ({workingFiles.length})
        </button>
        <button className={tab === "staged" ? "tab-active" : ""} onClick={() => setTab("staged")}>
          Staged ({status.staged.length})
        </button>
      </div>
      <div className="file-list">
        {files.length === 0 ? <p className="muted">Working tree is clean in this section.</p> : null}
        {files.map((file) => (
          <FileStatusItem
            key={`${tab}:${file.path}`}
            file={file}
            selected={selectedPath === file.path}
            mode={tab === "staged" ? "staged" : "working"}
            onSelect={onSelect}
            onStage={onStage}
            onUnstage={onUnstage}
            onDiscard={onDiscard}
          />
        ))}
      </div>
      <CommitForm
        stagedCount={status.staged.length}
        changedCount={workingFiles.length}
        conflictCount={status.conflicted.length}
        onStageAll={onStageAll}
        onCommit={onCommit}
        onStageAllAndCommit={onStageAllAndCommit}
      />
    </section>
  );
}
