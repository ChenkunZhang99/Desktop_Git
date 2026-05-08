import type { ReactNode } from "react";
import type { BranchInfo, ConflictState, RemoteInfo, RepositoryInfo, StatusSummary } from "../../types/git";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { BottomPanel } from "./BottomPanel";

interface LogEntry {
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
}

interface AppShellProps {
  repo: RepositoryInfo;
  status: StatusSummary;
  branches: BranchInfo[];
  remotes: RemoteInfo[];
  conflictState: ConflictState;
  busy: boolean;
  logs: LogEntry[];
  mainView: "graph" | "conflicts";
  children: ReactNode;
  right: ReactNode;
  bottom: ReactNode;
  error: string | null;
  onMainViewChange: (view: "graph" | "conflicts") => void;
  onOpenRepository: () => void;
  onRefresh: () => void;
  onFetch: () => void;
  onPull: () => void;
  onPush: () => void;
  onAddRemote: (name: string, url: string) => void;
  onForkSetup: (originUrl: string, pushCurrentBranch: boolean) => void;
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
  onSwitchBranch: (name: string) => void;
  onSwitchRemoteBranch: (name: string) => void;
  onMergeBranch: (name: string) => void;
  onDeleteBranch: (name: string) => void;
  onCreateBranch: (name: string, startPoint?: string) => void;
}

export function AppShell(props: AppShellProps) {
  return (
    <div className="app-shell">
      <TopBar
        repo={props.repo}
        remotes={props.remotes}
        busy={props.busy}
        onOpenRepository={props.onOpenRepository}
        onRefresh={props.onRefresh}
        onFetch={props.onFetch}
        onPull={props.onPull}
        onPush={props.onPush}
        onAddRemote={props.onAddRemote}
        onForkSetup={props.onForkSetup}
      />
      <div className="workspace">
        <Sidebar
          repo={props.repo}
          branches={props.branches}
          conflictState={props.conflictState}
          activeView={props.mainView}
          hasDirtyWorktree={props.status.files.length > 0}
          onViewChange={props.onMainViewChange}
          onSwitchBranch={props.onSwitchBranch}
          onSwitchRemoteBranch={props.onSwitchRemoteBranch}
          onMergeBranch={props.onMergeBranch}
          onDeleteBranch={props.onDeleteBranch}
          onCreateBranch={props.onCreateBranch}
        />
        <main className="main-panel">
          {props.error ? <div className="inline-error">{props.error}</div> : null}
          {props.children}
        </main>
        <aside className="right-panel">{props.right}</aside>
      </div>
      <BottomPanel
        status={props.status}
        logs={props.logs}
        onRunTerminalCommand={props.onRunTerminalCommand}
        onStageAllAndCommit={props.onStageAllAndCommit}
      >
        {props.bottom}
      </BottomPanel>
    </div>
  );
}
