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
        {files.slice(0, 80).map((file) => {
          const parts = file.split("/");
          const name = parts.pop() ?? file;
          const directory = parts.join("/");
          return (
            <button
              key={file}
              className={selectedPath === file ? "repo-file selected-repo-file" : "repo-file"}
              onClick={() => onSelect(file)}
              title={file}
            >
              <span className="repo-file-name">{name}</span>
              {directory ? <span className="repo-file-dir">{directory}/</span> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
