export interface GitCommandResult {
  success: boolean;
  command: "git";
  args: string[];
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface RepositoryInfo {
  root: string;
  gitDir: string;
  currentBranch: string;
  headHash: string;
  isInsideWorkTree: boolean;
}

export type FileStatusCategory =
  | "staged"
  | "unstaged"
  | "untracked"
  | "conflicted"
  | "renamed"
  | "deleted";

export interface FileStatus {
  path: string;
  originalPath?: string;
  indexStatus: string;
  workingTreeStatus: string;
  category: FileStatusCategory;
  isConflicted: boolean;
}

export interface StatusSummary {
  files: FileStatus[];
  staged: FileStatus[];
  unstaged: FileStatus[];
  untracked: FileStatus[];
  conflicted: FileStatus[];
}

export interface CommitInfo {
  hash: string;
  shortHash: string;
  parents: string[];
  authorName: string;
  authorEmail: string;
  date: string;
  message: string;
  refs: string[];
}

export interface BranchInfo {
  name: string;
  hash: string;
  upstream?: string;
  isCurrent: boolean;
  isRemote: boolean;
}

export interface RemoteInfo {
  name: string;
  fetchUrl?: string;
  pushUrl?: string;
}

export type GitOperationKind = "none" | "merge" | "rebase" | "cherry-pick";

export interface ConflictState {
  operation: GitOperationKind;
  isMergeInProgress: boolean;
  isRebaseInProgress: boolean;
  isCherryPickInProgress: boolean;
  files: string[];
}

export interface ConflictFileData {
  path: string;
  current: string;
  base?: string;
  local?: string;
  remote?: string;
  result: string;
}

export interface RepoSnapshot {
  repo: RepositoryInfo;
  status: StatusSummary;
  branches: BranchInfo[];
  remotes: RemoteInfo[];
  files: string[];
  commits: CommitInfo[];
  conflictState: ConflictState;
}
