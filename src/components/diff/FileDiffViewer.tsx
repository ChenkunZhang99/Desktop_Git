import Editor from "@monaco-editor/react";

export function FileDiffViewer({ diffText }: { diffText: string }) {
  return (
    <Editor
      height="100%"
      language="diff"
      theme="vs-dark"
      value={diffText}
      options={{
        readOnly: true,
        minimap: { enabled: false },
        wordWrap: "on",
        fontSize: 12,
        scrollBeyondLastLine: false
      }}
    />
  );
}
