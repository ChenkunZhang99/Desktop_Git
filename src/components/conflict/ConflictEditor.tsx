import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import type { ConflictFileData } from "../../types/git";

interface ConflictEditorProps {
  file: ConflictFileData | null;
  result: string;
  onResultChange: (value: string) => void;
  onResultMount: OnMount;
}

function ReadOnlyPane({ title, value }: { title: string; value?: string }) {
  return (
    <div className="conflict-pane">
      <div className="pane-title">{title}</div>
      <Editor
        height="100%"
        language="typescript"
        theme="vs-dark"
        value={value ?? "Not available for this conflict stage."}
        options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12, wordWrap: "on" }}
      />
    </div>
  );
}

export function ConflictEditor({ file, result, onResultChange, onResultMount }: ConflictEditorProps) {
  if (!file) {
    return <div className="empty-conflict">Select a conflicted file to start resolving.</div>;
  }

  return (
    <div className="conflict-editor-grid">
      <ReadOnlyPane title="Base" value={file.base} />
      <ReadOnlyPane title="Local / Current Branch" value={file.local} />
      <ReadOnlyPane title="Remote / Incoming" value={file.remote} />
      <div className="conflict-pane result-pane">
        <div className="pane-title">Result</div>
        <Editor
          height="100%"
          language="typescript"
          theme="vs-dark"
          value={result}
          onChange={(value) => onResultChange(value ?? "")}
          onMount={onResultMount}
          options={{ minimap: { enabled: false }, fontSize: 12, wordWrap: "on" } satisfies editor.IStandaloneEditorConstructionOptions}
        />
      </div>
    </div>
  );
}
