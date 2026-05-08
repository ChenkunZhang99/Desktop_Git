import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { StatusSummary } from "../../types/git";

interface BottomPanelProps {
  status: StatusSummary;
  logs: Array<{
    id: string;
    title: string;
    result?: {
      args: string[];
      stdout: string;
      stderr: string;
      exitCode: number;
      success: boolean;
    };
    message?: string;
  }>;
  children: ReactNode;
  onRunTerminalCommand: (input: string) => Promise<{
    ok: boolean;
    result?: {
      args: string[];
      stdout: string;
      stderr: string;
      exitCode: number;
      success: boolean;
    };
    error?: string;
  }>;
  onStageAllAndCommit: (message: string) => Promise<{
    ok: boolean;
    lines: string[];
    error?: string;
  }>;
}

const MAX_TERMINAL_LINES = 800;
const MAX_HISTORY = 100;

export function BottomPanel({ status, logs, children, onRunTerminalCommand, onStageAllAndCommit }: BottomPanelProps) {
  const [command, setCommand] = useState("");
  const [commitOpen, setCommitOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [terminalLines, setTerminalLines] = useState<string[]>([
    "Git terminal ready. Credentials are handled by system Git / Git Credential Manager, not stored here.",
    "Tip: ↑/↓ recall history, Ctrl+L clears the buffer."
  ]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyCursor, setHistoryCursor] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const streamRef = useRef<HTMLPreElement | null>(null);
  const hasConflicts = status.conflicted.length > 0;
  const canOneClickCommit = status.files.length > 0 && !hasConflicts;

  // Always scroll the transcript to the latest line when content changes.
  useEffect(() => {
    const el = streamRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [terminalLines, running]);

  const appendLines = useCallback((next: string[]) => {
    setTerminalLines((prev) => {
      const merged = [...prev, ...next];
      return merged.length > MAX_TERMINAL_LINES ? merged.slice(merged.length - MAX_TERMINAL_LINES) : merged;
    });
  }, []);

  const runCommand = useCallback(
    async (input: string) => {
      setRunning(true);
      appendLines([`$ git ${input}`]);
      setHistory((prev) => {
        if (prev[prev.length - 1] === input) return prev;
        const next = [...prev, input];
        return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
      });
      setHistoryCursor(null);
      const response = await onRunTerminalCommand(input);
      setRunning(false);
      if (response.ok && response.result) {
        const output = [
          response.result.stdout.trimEnd(),
          response.result.stderr.trimEnd(),
          `exit ${response.result.exitCode}`
        ].filter(Boolean);
        appendLines([...output, ""]);
        return;
      }
      appendLines([response.error ?? "Command failed.", ""]);
    },
    [appendLines, onRunTerminalCommand]
  );

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "l") {
      event.preventDefault();
      setTerminalLines([]);
      return;
    }
    if (event.key === "ArrowUp") {
      if (history.length === 0) return;
      event.preventDefault();
      const next = historyCursor === null ? history.length - 1 : Math.max(0, historyCursor - 1);
      setHistoryCursor(next);
      setCommand(history[next] ?? "");
      return;
    }
    if (event.key === "ArrowDown") {
      if (historyCursor === null) return;
      event.preventDefault();
      const next = historyCursor + 1;
      if (next >= history.length) {
        setHistoryCursor(null);
        setCommand("");
      } else {
        setHistoryCursor(next);
        setCommand(history[next] ?? "");
      }
    }
  };

  const runOneClickCommit = async () => {
    const message = commitMessage.trim();
    if (!message) return;
    setRunning(true);
    appendLines([`$ git add -A`, `$ git commit -m "${message.replaceAll('"', '\\"')}"`]);
    const response = await onStageAllAndCommit(message);
    setRunning(false);
    appendLines([...(response.lines.length > 0 ? response.lines : [response.error ?? "Commit failed."]), ""]);
    if (response.ok) {
      setCommitMessage("");
      setCommitOpen(false);
    }
  };

  return (
    <footer className="bottom-panel">
      <div className="bottom-left">
        <div className="bottom-status">{children}</div>
        <form
          className="git-terminal"
          onSubmit={(event) => {
            event.preventDefault();
            if (running || !command.trim()) return;
            void runCommand(command.trim());
            setCommand("");
          }}
        >
          <div className="terminal-header">
            <label>Git Terminal</label>
            <div className="terminal-header-actions">
              <button
                type="button"
                onClick={() => void runCommand("ls-remote myfork")}
                disabled={running}
                title="Triggers system Git authentication for the myfork remote without storing tokens in the app."
              >
                Test myfork auth
              </button>
              <button
                type="button"
                onClick={() => setCommitOpen((open) => !open)}
                disabled={running || !canOneClickCommit}
                title={hasConflicts ? "Resolve conflicts before committing." : "Stage every changed file and commit with a message."}
              >
                Commit
              </button>
              <button
                type="button"
                onClick={() => setTerminalLines([])}
                disabled={terminalLines.length === 0}
                title="Clear the terminal transcript (Ctrl+L)."
              >
                Clear
              </button>
            </div>
          </div>
          <pre ref={streamRef} className="terminal-stream">
            {terminalLines.join("\n")}
            {running ? `${terminalLines.length === 0 ? "" : "\n"}Running…` : ""}
          </pre>
          {commitOpen ? (
            <div className="terminal-commit-panel">
              <span>git commit -m</span>
              <input
                disabled={running}
                value={commitMessage}
                onChange={(event) => setCommitMessage(event.target.value)}
                placeholder="Commit message required for -m"
                autoComplete="off"
              />
              <button type="button" disabled={running || !commitMessage.trim()} onClick={() => void runOneClickCommit()}>
                Add All + Commit
              </button>
            </div>
          ) : null}
          <div className="terminal-command-row">
            <span>git</span>
            <input
              disabled={running}
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="status --short"
              autoComplete="off"
              spellCheck={false}
            />
            <button disabled={running || !command.trim()}>Run</button>
          </div>
          <p>Use HTTPS tokens only through the system credential prompt. Shell operators and destructive commands are blocked.</p>
        </form>
      </div>
      <div className="command-log">
        <div className="log-header">
          <strong>Command Output</strong>
          <span>{status.files.length} changed files</span>
        </div>
        <div className="log-list">
          {logs.length === 0 ? <p className="muted">Git command output will appear here.</p> : null}
          {logs.map((entry) => (
            <article key={entry.id} className={entry.result?.success === false ? "log-entry log-failed" : "log-entry"}>
              <strong>{entry.title}</strong>
              {entry.message ? <pre>{entry.message}</pre> : null}
              {entry.result ? (
                <pre>
                  $ git {entry.result.args.join(" ")}
                  {"\n"}exit {entry.result.exitCode}
                  {entry.result.stdout ? `\n${entry.result.stdout}` : ""}
                  {entry.result.stderr ? `\n${entry.result.stderr}` : ""}
                </pre>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </footer>
  );
}
