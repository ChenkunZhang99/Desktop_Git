interface RepositoryFilesProps {
  files: string[];
  selectedPath?: string;
  onSelect: (path: string) => void;
}

export function RepositoryFiles({ files, selectedPath, onSelect }: RepositoryFilesProps) {
  return (
    <section className="panel-section repo-files">
      <p className="section-title">Files In Current Branch</p>
      <div className="repo-file-list">
        {files.length === 0 ? <p className="muted">No files found at HEAD.</p> : null}
        {files.slice(0, 80).map((file) => (
          <button
            key={file}
            className={selectedPath === file ? "repo-file selected-repo-file" : "repo-file"}
            onClick={() => onSelect(file)}
            title={file}
          >
            {file}
          </button>
        ))}
      </div>
    </section>
  );
}
