import { useEffect, useState } from "react";
import type { CommitInfo, ConflictState, FileStatus, GitCommandResult, RepoSnapshot } from "./types/git";
import { AppShell } from "./components/layout/AppShell";
import { OpenRepoPanel } from "./components/repo/OpenRepoPanel";
import { StatusPanel } from "./components/status/StatusPanel";
import { CommitGraph } from "./components/graph/CommitGraph";
import { DiffPanel } from "./components/diff/DiffPanel";
import { CommitDetail } from "./components/commit/CommitDetail";
import { ConflictPanel } from "./components/conflict/ConflictPanel";

type MainView = "graph" | "conflicts";
type DiffMode = "working" | "staged";

interface LogEntry {
  id: string;
  title: string;
  result?: GitCommandResult;
  message?: string;
}

export function App() {
  const [snapshot, setSnapshot] = useState<RepoSnapshot | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileStatus | null>(null);
  const [selectedRepositoryFile, setSelectedRepositoryFile] = useState<string | undefined>();
  const [repositoryFileContent, setRepositoryFileContent] = useState("");
  const [selectedCommit, setSelectedCommit] = useState<CommitInfo | null>(null);
  const [diffMode, setDiffMode] = useState<DiffMode>("working");
  const [mainView, setMainView] = useState<MainView>("graph");
  const [diffText, setDiffText] = useState("");
  const [commitDetail, setCommitDetail] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appendLog = (entry: Omit<LogEntry, "id">) => {
    setLogs((current) => [{ ...entry, id: crypto.randomUUID() }, ...current].slice(0, 60));
  };

  const applySnapshot = (next: RepoSnapshot) => {
    setSnapshot(next);
    if (next.conflictState.files.length > 0) {
      setMainView("conflicts");
    }
  };

  const refresh = async () => {
    if (!snapshot) return;
    setBusy(true);
    const response = await window.gitVisualizer.refresh(snapshot.repo.root);
    setBusy(false);
    if (response.ok && response.data) {
      applySnapshot(response.data);
      return;
    }
    setError(response.error ?? "Refresh failed.");
  };

  const openRepository = async () => {
    setBusy(true);
    setError(null);
    const response = await window.gitVisualizer.openRepositoryDialog();
    setBusy(false);
    if (response.ok && response.data) {
      applySnapshot(response.data);
      appendLog({ title: "Opened repository", message: response.data.repo.root });
      return;
    }
    setError(response.error ?? "Unable to open repository.");
  };

  const runOperation = async (title: string, operation: () => Promise<{ ok: boolean; data?: GitCommandResult; error?: string }>) => {
    if (!snapshot) return;
    setBusy(true);
    setError(null);
    const response = await operation();
    setBusy(false);
    if (response.ok && response.data) {
      appendLog({ title, result: response.data });
      // The IPC envelope is "ok", but the underlying git command may still
      // have exited non-zero (e.g. checkout refused because of local
      // changes). Surface stderr so the user does not see a silent no-op.
      if (!response.data.success) {
        const message = response.data.stderr.trim() || response.data.stdout.trim() || `${title} failed (exit ${response.data.exitCode}).`;
        setError(message);
      }
      await refresh();
      return;
    }
    setError(response.error ?? `${title} failed.`);
  };

  const stageAllAndCommit = async (message: string) => {
    if (!snapshot) return;
    setBusy(true);
    setError(null);

    const stageResponse = await window.gitVisualizer.stageAll(snapshot.repo.root);
    if (stageResponse.ok && stageResponse.data) {
      appendLog({ title: "git add -A", result: stageResponse.data });
      if (!stageResponse.data.success) {
        setBusy(false);
        setError(stageResponse.data.stderr.trim() || stageResponse.data.stdout.trim() || "Stage all failed.");
        await refresh();
        return;
      }
    } else {
      setBusy(false);
      setError(stageResponse.error ?? "Stage all failed.");
      return;
    }

    const commitResponse = await window.gitVisualizer.commit(snapshot.repo.root, message);
    setBusy(false);
    if (commitResponse.ok && commitResponse.data) {
      appendLog({ title: "git commit", result: commitResponse.data });
      if (!commitResponse.data.success) {
        setError(commitResponse.data.stderr.trim() || commitResponse.data.stdout.trim() || "Commit failed.");
      }
      await refresh();
      return;
    }
    setError(commitResponse.error ?? "Commit failed.");
  };

  const stageAllAndCommitForTerminal = async (message: string) => {
    if (!snapshot) {
      return { ok: false, lines: ["No repository is open."], error: "No repository is open." };
    }
    setBusy(true);
    setError(null);
    const lines: string[] = [];

    const stageResponse = await window.gitVisualizer.stageAll(snapshot.repo.root);
    if (stageResponse.ok && stageResponse.data) {
      appendLog({ title: "git add -A", result: stageResponse.data });
      lines.push(formatCommandResult(stageResponse.data));
      if (!stageResponse.data.success) {
        setBusy(false);
        const error = stageResponse.data.stderr.trim() || stageResponse.data.stdout.trim() || "Stage all failed.";
        setError(error);
        await refresh();
        return { ok: false, lines, error };
      }
    } else {
      setBusy(false);
      const error = stageResponse.error ?? "Stage all failed.";
      setError(error);
      return { ok: false, lines: [error], error };
    }

    const commitResponse = await window.gitVisualizer.commit(snapshot.repo.root, message);
    setBusy(false);
    if (commitResponse.ok && commitResponse.data) {
      appendLog({ title: "git commit", result: commitResponse.data });
      lines.push(formatCommandResult(commitResponse.data));
      if (!commitResponse.data.success) {
        const error = commitResponse.data.stderr.trim() || commitResponse.data.stdout.trim() || "Commit failed.";
        setError(error);
        await refresh();
        return { ok: false, lines, error };
      }
      await refresh();
      return { ok: true, lines };
    }

    const error = commitResponse.error ?? "Commit failed.";
    setError(error);
    return { ok: false, lines: [...lines, error], error };
  };

  const formatCommandResult = (result: GitCommandResult) =>
    [result.stdout.trimEnd(), result.stderr.trimEnd(), `exit ${result.exitCode}`].filter(Boolean).join("\n");

  const selectFile = async (file: FileStatus, mode: DiffMode) => {
    if (!snapshot) return;
    setSelectedFile(file);
    setSelectedRepositoryFile(undefined);
    setDiffMode(mode);
    const response = await window.gitVisualizer.getDiff(snapshot.repo.root, file.path, mode);
    if (response.ok && response.data) {
      setDiffText(response.data.text || "No diff output for this file.");
    } else {
      setDiffText(response.error ?? "Unable to load diff.");
    }
  };

  const selectRepositoryFile = async (path: string) => {
    if (!snapshot) return;
    setSelectedFile(null);
    setSelectedRepositoryFile(path);
    const response = await window.gitVisualizer.getFileContent(snapshot.repo.root, path);
    setRepositoryFileContent(response.ok && response.data ? response.data.content : response.error ?? "Unable to read file.");
  };

  const clearRepositoryFile = () => {
    setSelectedRepositoryFile(undefined);
    setRepositoryFileContent("");
  };

  const selectCommit = async (commit: CommitInfo) => {
    if (!snapshot) return;
    setSelectedCommit(commit);
    const response = await window.gitVisualizer.getCommitDetail(snapshot.repo.root, commit.hash);
    setCommitDetail(response.ok && response.data ? response.data.stdout : response.error ?? "Unable to load commit.");
  };

  const updateConflictState = (state: ConflictState) => {
    if (!snapshot) return;
    setSnapshot({ ...snapshot, conflictState: state });
    if (state.files.length === 0) {
      setMainView("graph");
      void refresh();
    }
  };

  const mergeTarget = async (target: string) => {
    if (!snapshot) return;
    if (snapshot.status.files.length > 0) {
      setError("Commit or stash changes before merging.");
      return;
    }
    if (snapshot.conflictState.files.length > 0) {
      setMainView("conflicts");
      setError("Resolve existing conflicts before starting another merge.");
      return;
    }

    setBusy(true);
    setError(null);
    const response = await window.gitVisualizer.merge(snapshot.repo.root, target);
    setBusy(false);
    if (response.ok && response.data) {
      appendLog({ title: `git merge ${target}`, result: response.data.result });
      updateConflictState(response.data.conflictState);
      if (!response.data.result.success && response.data.conflictState.files.length === 0) {
        setError(response.data.result.stderr.trim() || response.data.result.stdout.trim() || "Merge failed.");
      }
      await refresh();
      return;
    }
    setError(response.error ?? "Merge failed.");
  };

  useEffect(() => {
    if (!snapshot || !selectedFile) return;
    const stillExists = snapshot.status.files.find((file) => file.path === selectedFile.path);
    if (!stillExists) {
      setSelectedFile(null);
      setDiffText("");
    }
  }, [snapshot, selectedFile]);

  if (!snapshot) {
    return <OpenRepoPanel busy={busy} error={error} onOpen={openRepository} />;
  }

  const hasConflicts = snapshot.conflictState.files.length > 0;

  return (
    <AppShell
      repo={snapshot.repo}
      status={snapshot.status}
      branches={snapshot.branches}
      remotes={snapshot.remotes}
      conflictState={snapshot.conflictState}
      busy={busy}
      logs={logs}
      mainView={mainView}
      onMainViewChange={setMainView}
      onOpenRepository={openRepository}
      onRefresh={refresh}
      onFetch={() => runOperation("git fetch", () => window.gitVisualizer.fetch(snapshot.repo.root))}
      onPull={async () => {
        setBusy(true);
        setError(null);
        const response = await window.gitVisualizer.pull(snapshot.repo.root);
        setBusy(false);
        if (response.ok && response.data) {
          appendLog({ title: "git pull", result: response.data.result });
          updateConflictState(response.data.conflictState);
          if (!response.data.result.success && response.data.conflictState.files.length === 0) {
            setError(response.data.result.stderr.trim() || response.data.result.stdout.trim() || "Pull failed.");
          }
          await refresh();
        } else {
          setError(response.error ?? "Pull failed.");
        }
      }}
      onPush={() => runOperation("git push", () => window.gitVisualizer.push(snapshot.repo.root))}
      onAddRemote={(name, url) => runOperation(`git remote add ${name}`, () => window.gitVisualizer.addRemote(snapshot.repo.root, name, url))}
      onForkSetup={(originUrl, pushCurrentBranch) => {
        setBusy(true);
        setError(null);
        void window.gitVisualizer.forkSetup(snapshot.repo.root, originUrl, pushCurrentBranch, snapshot.repo.currentBranch).then(async (response) => {
          setBusy(false);
          if (response.ok && response.data) {
            for (const result of response.data) {
              appendLog({ title: `git ${result.args.join(" ")}`, result });
            }
            const failed = response.data.find((result) => !result.success);
            if (failed) {
              setError(failed.stderr.trim() || failed.stdout.trim() || "Fork setup partially failed.");
            }
            await refresh();
          } else {
            setError(response.error ?? "Fork setup failed.");
          }
        });
      }}
      onRunTerminalCommand={async (input) => {
        setError(null);
        const response = await window.gitVisualizer.runGitTerminalCommand(snapshot.repo.root, input);
        if (response.ok && response.data) {
          appendLog({ title: `git ${input}`, result: response.data });
          await refresh();
          return { ok: true, result: response.data };
        }
        setError(response.error ?? "Git terminal command failed.");
        return { ok: false, error: response.error };
      }}
      onStageAllAndCommit={stageAllAndCommitForTerminal}
      onSwitchBranch={(name) => {
        if (snapshot.status.files.length > 0 && !confirm("The working tree has changes. Git may refuse this switch if files would be overwritten. Continue?")) {
          return;
        }
        void runOperation(`git switch ${name}`, () => window.gitVisualizer.switchBranch(snapshot.repo.root, name));
      }}
      onSwitchRemoteBranch={(name) => {
        if (snapshot.status.files.length > 0 && !confirm("The working tree has changes. Git may refuse this switch if files would be overwritten. Continue?")) {
          return;
        }
        void runOperation(`git switch --track ${name}`, () => window.gitVisualizer.switchRemoteBranch(snapshot.repo.root, name));
      }}
      onMergeBranch={(name) => void mergeTarget(name)}
      onDeleteBranch={(name) => {
        if (confirm(`Delete local branch ${name}? Git will refuse if it is not fully merged.`)) {
          void runOperation(`git branch -d ${name}`, () => window.gitVisualizer.deleteBranch(snapshot.repo.root, name));
        }
      }}
      onCreateBranch={(name, startPoint) =>
        runOperation(`git switch -c ${name}`, () => window.gitVisualizer.createBranch(snapshot.repo.root, name, startPoint))
      }
      bottom={
        <StatusPanel
          status={snapshot.status}
          selectedPath={selectedFile?.path}
          onSelect={selectFile}
          onStage={(file) => runOperation(`git add ${file.path}`, () => window.gitVisualizer.stageFile(snapshot.repo.root, file.path))}
          onStageAll={() => runOperation("git add -A", () => window.gitVisualizer.stageAll(snapshot.repo.root))}
          onUnstage={(file) =>
            runOperation(`git restore --staged ${file.path}`, () => window.gitVisualizer.unstageFile(snapshot.repo.root, file.path))
          }
          onDiscard={(file) => {
            if (confirm(`Discard local changes in ${file.path}? This cannot be undone by Git Visualizer.`)) {
              void runOperation(`git restore ${file.path}`, () => window.gitVisualizer.discardFile(snapshot.repo.root, file.path));
            }
          }}
          onCommit={(message) => runOperation("git commit", () => window.gitVisualizer.commit(snapshot.repo.root, message))}
          onStageAllAndCommit={stageAllAndCommit}
        />
      }
      right={
        <>
          <DiffPanel
            selectedFile={selectedFile}
            repositoryFiles={snapshot.files}
            selectedRepositoryFile={selectedRepositoryFile}
            fileContent={repositoryFileContent}
            diffMode={diffMode}
            diffText={diffText}
            onSelectRepositoryFile={selectRepositoryFile}
            onClearRepositoryFile={clearRepositoryFile}
          />
          <CommitDetail commit={selectedCommit} detail={commitDetail} />
        </>
      }
      error={error}
    >
      {mainView === "conflicts" || hasConflicts ? (
        <ConflictPanel
          repoRoot={snapshot.repo.root}
          conflictState={snapshot.conflictState}
          onStateChange={updateConflictState}
          onLog={appendLog}
          onRefresh={refresh}
        />
      ) : (
        <CommitGraph
          commits={snapshot.commits}
          branches={snapshot.branches}
          repo={snapshot.repo}
          hasDirtyWorktree={snapshot.status.files.length > 0}
          selectedHash={selectedCommit?.hash}
          onSelectCommit={selectCommit}
          onCreateBranch={(name, startPoint) =>
            runOperation(`git switch -c ${name}`, () => window.gitVisualizer.createBranch(snapshot.repo.root, name, startPoint))
          }
          onSwitchCommit={(hash) => {
            if (confirm("Switching to a commit will detach HEAD. Continue?")) {
              void runOperation(`git switch --detach ${hash.slice(0, 8)}`, () => window.gitVisualizer.switchCommit(snapshot.repo.root, hash));
            }
          }}
          onSwitchBranch={(name) => {
            if (snapshot.status.files.length > 0 && !confirm("The working tree has changes. Git may refuse this switch if files would be overwritten. Continue?")) {
              return;
            }
            void runOperation(`git switch ${name}`, () => window.gitVisualizer.switchBranch(snapshot.repo.root, name));
          }}
          onMergeTarget={(target) => void mergeTarget(target)}
        />
      )}
    </AppShell>
  );
}
