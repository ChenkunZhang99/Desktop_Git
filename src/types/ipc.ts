import type {
  BranchInfo,
  CommitInfo,
  ConflictFileData,
  ConflictState,
  GitCommandResult,
  RemoteInfo,
  RepoSnapshot,
  RepositoryInfo,
  StatusSummary
} from "./git.js";

export interface IpcResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface DiffResult {
  path: string;
  mode: "working" | "staged" | "commit";
  text: string;
}

export interface FileContentResult {
  path: string;
  content: string;
}

export interface GitVisualizerApi {
  openRepositoryDialog(): Promise<IpcResult<RepoSnapshot>>;
  openRepositoryPath(path: string): Promise<IpcResult<RepoSnapshot>>;
  refresh(repoRoot: string): Promise<IpcResult<RepoSnapshot>>;
  getStatus(repoRoot: string): Promise<IpcResult<StatusSummary>>;
  getBranches(repoRoot: string): Promise<IpcResult<BranchInfo[]>>;
  getRemotes(repoRoot: string): Promise<IpcResult<RemoteInfo[]>>;
  getCommits(repoRoot: string): Promise<IpcResult<CommitInfo[]>>;
  getRepositoryFiles(repoRoot: string): Promise<IpcResult<string[]>>;
  getFileContent(repoRoot: string, path: string): Promise<IpcResult<FileContentResult>>;
  getDiff(repoRoot: string, path: string, mode: "working" | "staged"): Promise<IpcResult<DiffResult>>;
  getCommitDetail(repoRoot: string, hash: string): Promise<IpcResult<GitCommandResult>>;
  stageFile(repoRoot: string, path: string): Promise<IpcResult<GitCommandResult>>;
  stageAll(repoRoot: string): Promise<IpcResult<GitCommandResult>>;
  unstageFile(repoRoot: string, path: string): Promise<IpcResult<GitCommandResult>>;
  discardFile(repoRoot: string, path: string): Promise<IpcResult<GitCommandResult>>;
  commit(repoRoot: string, message: string): Promise<IpcResult<GitCommandResult>>;
  merge(repoRoot: string, target: string): Promise<IpcResult<{ result: GitCommandResult; conflictState: ConflictState }>>;
  createBranch(repoRoot: string, name: string, startPoint?: string): Promise<IpcResult<GitCommandResult>>;
  switchBranch(repoRoot: string, name: string): Promise<IpcResult<GitCommandResult>>;
  switchRemoteBranch(repoRoot: string, remoteBranchName: string): Promise<IpcResult<GitCommandResult>>;
  switchCommit(repoRoot: string, hash: string): Promise<IpcResult<GitCommandResult>>;
  deleteBranch(repoRoot: string, name: string): Promise<IpcResult<GitCommandResult>>;
  addRemote(repoRoot: string, name: string, url: string): Promise<IpcResult<GitCommandResult>>;
  forkSetup(repoRoot: string, originUrl: string, pushCurrentBranch: boolean, currentBranch: string): Promise<IpcResult<GitCommandResult[]>>;
  fetch(repoRoot: string): Promise<IpcResult<GitCommandResult>>;
  pull(repoRoot: string): Promise<IpcResult<{ result: GitCommandResult; conflictState: ConflictState }>>;
  push(repoRoot: string, branchName?: string): Promise<IpcResult<GitCommandResult>>;
  runGitTerminalCommand(repoRoot: string, input: string): Promise<IpcResult<GitCommandResult>>;
  getConflictState(repoRoot: string): Promise<IpcResult<ConflictState>>;
  getConflictFile(repoRoot: string, path: string): Promise<IpcResult<ConflictFileData>>;
  saveConflictResult(repoRoot: string, path: string, content: string): Promise<IpcResult<{ command: GitCommandResult; isResolved: boolean; conflictState: ConflictState }>>;
  markResolved(repoRoot: string, path: string): Promise<IpcResult<{ command: GitCommandResult; isResolved: boolean; conflictState: ConflictState }>>;
  continueOperation(repoRoot: string): Promise<IpcResult<GitCommandResult>>;
  abortOperation(repoRoot: string): Promise<IpcResult<GitCommandResult>>;
}

declare global {
  interface Window {
    gitVisualizer: GitVisualizerApi;
  }
}
