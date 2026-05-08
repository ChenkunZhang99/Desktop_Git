import { useEffect, useRef, useState } from "react";
import type { editor } from "monaco-editor";
import type { ConflictFileData, ConflictState, GitCommandResult } from "../../types/git";
import { ConflictFileList } from "./ConflictFileList";
import { ConflictEditor } from "./ConflictEditor";
import { buildUseBothResult, ConflictBlockResolver } from "./ConflictBlockResolver";
import { ConflictActions } from "./ConflictActions";

interface ConflictPanelProps {
  repoRoot: string;
  conflictState: ConflictState;
  onStateChange: (state: ConflictState) => void;
  onRefresh: () => void;
  onLog: (entry: { title: string; result?: GitCommandResult; message?: string }) => void;
}

export function ConflictPanel({ repoRoot, conflictState, onStateChange, onLog, onRefresh }: ConflictPanelProps) {
  const [selectedPath, setSelectedPath] = useState(conflictState.files[0]);
  const [file, setFile] = useState<ConflictFileData | null>(null);
  const [result, setResult] = useState("");
  const [error, setError] = useState<string | null>(null);
  const resultEditor = useRef<editor.IStandaloneCodeEditor | null>(null);

  const loadFile = async (path: string) => {
    setSelectedPath(path);
    const response = await window.gitVisualizer.getConflictFile(repoRoot, path);
    if (response.ok && response.data) {
      setFile(response.data);
      setResult(response.data.result);
      setError(null);
    } else {
      setError(response.error ?? "Unable to load conflict file.");
    }
  };

  useEffect(() => {
    if (selectedPath) {
      void loadFile(selectedPath);
    } else {
      setFile(null);
      setResult("");
    }
  }, [selectedPath]);

  useEffect(() => {
    if (!selectedPath || !conflictState.files.includes(selectedPath)) {
      setSelectedPath(conflictState.files[0]);
    }
  }, [conflictState.files, selectedPath]);

  const saveResult = async () => {
    if (!file) return;
    const response = await window.gitVisualizer.saveConflictResult(repoRoot, file.path, result);
    if (response.ok && response.data) {
      onLog({ title: `Resolve ${file.path}`, result: response.data.command });
      onStateChange(response.data.conflictState);
      if (!response.data.isResolved) {
        setError("Git still reports this file as unmerged. Check the result and try Mark Resolved again.");
      }
    } else {
      setError(response.error ?? "Unable to save conflict result.");
    }
  };

  const markResolved = async () => {
    if (!file) return;
    const response = await window.gitVisualizer.markResolved(repoRoot, file.path);
    if (response.ok && response.data) {
      onLog({ title: `git add ${file.path}`, result: response.data.command });
      onStateChange(response.data.conflictState);
    } else {
      setError(response.error ?? "Unable to mark file as resolved.");
    }
  };

  const continueOperation = async () => {
    const response = await window.gitVisualizer.continueOperation(repoRoot);
    if (response.ok && response.data) {
      onLog({ title: `Continue ${conflictState.operation}`, result: response.data });
      await onRefresh();
    } else {
      setError(response.error ?? "Unable to continue operation.");
    }
  };

  const abortOperation = async () => {
    const response = await window.gitVisualizer.abortOperation(repoRoot);
    if (response.ok && response.data) {
      onLog({ title: `Abort ${conflictState.operation}`, result: response.data });
      await onRefresh();
    } else {
      setError(response.error ?? "Unable to abort operation.");
    }
  };

  return (
    <section className="conflict-shell">
      <ConflictFileList files={conflictState.files} selectedPath={selectedPath} onSelect={loadFile} />
      <div className="conflict-main">
        <div className="conflict-header">
          <div>
            <p className="eyebrow">Conflict Resolver</p>
            <h2>{conflictState.operation === "none" ? "Unmerged files" : `${conflictState.operation} in progress`}</h2>
          </div>
          <span className="conflict-badge">{conflictState.files.length} unresolved</span>
        </div>
        <ConflictBlockResolver />
        {error ? <div className="inline-error">{error}</div> : null}
        <ConflictActions
          canContinue={conflictState.files.length === 0 && conflictState.operation !== "none"}
          operation={conflictState.operation}
          onUseLocal={() => setResult(file?.local ?? "")}
          onUseRemote={() => setResult(file?.remote ?? "")}
          onUseBoth={() => file && setResult(buildUseBothResult(file))}
          onManualEdit={() => resultEditor.current?.focus()}
          onSave={saveResult}
          onMarkResolved={markResolved}
          onContinue={continueOperation}
          onAbort={abortOperation}
        />
        <ConflictEditor
          file={file}
          result={result}
          onResultChange={setResult}
          onResultMount={(editorInstance) => {
            resultEditor.current = editorInstance;
          }}
        />
      </div>
    </section>
  );
}
