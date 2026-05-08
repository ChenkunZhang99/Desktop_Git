interface ConflictFileListProps {
  files: string[];
  selectedPath?: string;
  onSelect: (path: string) => void;
}

export function ConflictFileList({ files, selectedPath, onSelect }: ConflictFileListProps) {
  return (
    <aside className="conflict-files">
      <h3>Conflicted Files</h3>
      {files.length === 0 ? <p className="muted">No unmerged files remain.</p> : null}
      {files.map((file) => (
        <button key={file} className={selectedPath === file ? "selected-conflict" : ""} onClick={() => onSelect(file)}>
          {file}
        </button>
      ))}
    </aside>
  );
}
