import Editor from "@monaco-editor/react";
import type { FileStatus } from "../../types/git";
import { FileDiffViewer } from "./FileDiffViewer";
import { RepositoryFiles } from "../repo/RepositoryFiles";

interface DiffPanelProps {
  selectedFile: FileStatus | null;
  repositoryFiles: string[];
  selectedRepositoryFile?: string;
  fileContent?: string;
  diffMode: "working" | "staged";
  diffText: string;
  onSelectRepositoryFile: (path: string) => void;
}

export function DiffPanel({
  selectedFile,
  repositoryFiles,
  selectedRepositoryFile,
  fileContent,
  diffMode,
  diffText,
  onSelectRepositoryFile
}: DiffPanelProps) {
  const title = selectedFile ? `${diffMode}: ${selectedFile.path}` : selectedRepositoryFile ? `HEAD file: ${selectedRepositoryFile}` : "No file selected";

  return (
    <section className="inspector-card diff-card">
      <div className="inspector-header">
        <strong>{selectedFile ? "Diff" : "File"}</strong>
        <span>{title}</span>
      </div>
      {selectedFile ? (
        <FileDiffViewer diffText={diffText} />
      ) : selectedRepositoryFile ? (
        <Editor
          height="100%"
          language="plaintext"
          theme="vs-dark"
          value={fileContent ?? "Loading file..."}
          options={{ readOnly: true, minimap: { enabled: false }, wordWrap: "on", fontSize: 12, scrollBeyondLastLine: false }}
        />
      ) : repositoryFiles.length === 0 ? (
        <div className="empty-state">
          <strong>No files at HEAD</strong>
          <span>Open a repository or switch to a branch with tracked files.</span>
        </div>
      ) : (
        <RepositoryFiles files={repositoryFiles} selectedPath={selectedRepositoryFile} onSelect={onSelectRepositoryFile} />
      )}
    </section>
  );
}
