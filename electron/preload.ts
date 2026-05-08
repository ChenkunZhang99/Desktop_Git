import { contextBridge, ipcRenderer } from "electron";
import type { GitVisualizerApi } from "../src/types/ipc.js";

const invoke = <T>(channel: string, ...args: unknown[]): Promise<T> => ipcRenderer.invoke(channel, ...args);

const api: GitVisualizerApi = {
  openRepositoryDialog: () => invoke("repo:openDialog"),
  openRepositoryPath: (path) => invoke("repo:openPath", path),
  refresh: (repoRoot) => invoke("repo:refresh", repoRoot),
  getStatus: (repoRoot) => invoke("status:get", repoRoot),
  getBranches: (repoRoot) => invoke("branches:get", repoRoot),
  getRemotes: (repoRoot) => invoke("remotes:get", repoRoot),
  getCommits: (repoRoot) => invoke("commits:get", repoRoot),
  getRepositoryFiles: (repoRoot) => invoke("files:get", repoRoot),
  getFileContent: (repoRoot, path) => invoke("file:content", repoRoot, path),
  getDiff: (repoRoot, path, mode) => invoke("diff:get", repoRoot, path, mode),
  getCommitDetail: (repoRoot, hash) => invoke("commit:detail", repoRoot, hash),
  stageFile: (repoRoot, path) => invoke("op:stage", repoRoot, path),
  stageAll: (repoRoot) => invoke("op:stageAll", repoRoot),
  unstageFile: (repoRoot, path) => invoke("op:unstage", repoRoot, path),
  discardFile: (repoRoot, path) => invoke("op:discard", repoRoot, path),
  commit: (repoRoot, message) => invoke("op:commit", repoRoot, message),
  merge: (repoRoot, target) => invoke("op:merge", repoRoot, target),
  createBranch: (repoRoot, name, startPoint) => invoke("branch:create", repoRoot, name, startPoint),
  switchBranch: (repoRoot, name) => invoke("branch:switch", repoRoot, name),
  switchRemoteBranch: (repoRoot, name) => invoke("branch:switchRemote", repoRoot, name),
  switchCommit: (repoRoot, hash) => invoke("commit:switch", repoRoot, hash),
  deleteBranch: (repoRoot, name) => invoke("branch:delete", repoRoot, name),
  addRemote: (repoRoot, name, url) => invoke("remote:add", repoRoot, name, url),
  forkSetup: (repoRoot, originUrl, pushCurrentBranch, currentBranch) =>
    invoke("remote:forkSetup", repoRoot, originUrl, pushCurrentBranch, currentBranch),
  fetch: (repoRoot) => invoke("op:fetch", repoRoot),
  pull: (repoRoot) => invoke("op:pull", repoRoot),
  push: (repoRoot, branchName) => invoke("op:push", repoRoot, branchName),
  runGitTerminalCommand: (repoRoot, input) => invoke("terminal:git", repoRoot, input),
  getConflictState: (repoRoot) => invoke("conflict:state", repoRoot),
  getConflictFile: (repoRoot, path) => invoke("conflict:file", repoRoot, path),
  saveConflictResult: (repoRoot, path, content) => invoke("conflict:save", repoRoot, path, content),
  markResolved: (repoRoot, path) => invoke("conflict:markResolved", repoRoot, path),
  continueOperation: (repoRoot) => invoke("conflict:continue", repoRoot),
  abortOperation: (repoRoot) => invoke("conflict:abort", repoRoot)
};

contextBridge.exposeInMainWorld("gitVisualizer", api);
