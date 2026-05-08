import type { FileStatus } from "../../types/git";

interface FileStatusItemProps {
  file: FileStatus;
  selected: boolean;
  mode: "working" | "staged";
  onSelect: (file: FileStatus, mode: "working" | "staged") => void;
  onStage: (file: FileStatus) => void;
  onUnstage: (file: FileStatus) => void;
  onDiscard: (file: FileStatus) => void;
}

export function FileStatusItem({ file, selected, mode, onSelect, onStage, onUnstage, onDiscard }: FileStatusItemProps) {
  return (
    <div className={selected ? "file-item selected-file" : "file-item"} onClick={() => onSelect(file, mode)}>
      <span className={`status-code status-${file.category}`}>{file.indexStatus}{file.workingTreeStatus}</span>
      <span className="file-path" title={file.path}>
        {file.path}
      </span>
      <div className="file-actions">
        {mode === "staged" ? <button onClick={(event) => { event.stopPropagation(); onUnstage(file); }}>Unstage</button> : null}
        {mode === "working" && !file.isConflicted ? (
          <>
            <button onClick={(event) => { event.stopPropagation(); onStage(file); }}>Stage</button>
            {file.category !== "untracked" ? (
              <button className="danger-button" onClick={(event) => { event.stopPropagation(); onDiscard(file); }}>Discard</button>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
