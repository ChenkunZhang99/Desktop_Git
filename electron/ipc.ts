import { ipcMain } from "electron";
import type { IpcResult } from "../src/types/ipc.js";
import { openRepositoryDialog, getRepoSnapshot, validateRepository } from "./git/repoService.js";
import { getStatus } from "./git/statusService.js";
import { getBranches, createBranch, deleteBranch, switchBranch, switchCommit, switchRemoteBranch } from "./git/branchService.js";
import { getCommits } from "./git/logService.js";
import { getFileDiff, getCommitDetail } from "./git/diffService.js";
import { getFileContent, getRepositoryFiles } from "./git/fileService.js";
import { addRemote, forkSetup, getRemotes } from "./git/remoteService.js";
import { runGitTerminalCommand } from "./git/terminalService.js";
import { commit, discardFile, fetch, mergeTarget, pull, push, stageAll, stageFile, unstageFile } from "./git/operationService.js";
import {
  abortOperation,
  continueOperation,
  getConflictFile,
  getConflictState,
  markResolved,
  saveConflictResult
} from "./git/conflictService.js";

function ok<T>(data: T): IpcResult<T> {
  return { ok: true, data };
}

function fail(error: unknown): IpcResult<never> {
  return {
    ok: false,
    error: error instanceof Error ? error.message : String(error)
  };
}

function handle<TArgs extends unknown[], TResult>(
  channel: string,
  handler: (...args: TArgs) => Promise<TResult> | TResult
) {
  ipcMain.handle(channel, async (_event, ...args: TArgs) => {
    try {
      return ok(await handler(...args));
    } catch (error) {
      return fail(error);
    }
  });
}

export function registerIpcHandlers() {
  handle("repo:openDialog", async () => {
    const selected = await openRepositoryDialog();
    if (!selected) {
      throw new Error("Repository open canceled.");
    }
    return getRepoSnapshot(selected);
  });
  handle("repo:openPath", (repoPath: string) => getRepoSnapshot(repoPath));
  handle("repo:refresh", (repoRoot: string) => getRepoSnapshot(repoRoot));
  handle("repo:validate", (repoRoot: string) => validateRepository(repoRoot));

  handle("status:get", (repoRoot: string) => getStatus(repoRoot));
  handle("branches:get", (repoRoot: string) => getBranches(repoRoot));
  handle("remotes:get", (repoRoot: string) => getRemotes(repoRoot));
  handle("commits:get", (repoRoot: string) => getCommits(repoRoot));
  handle("files:get", (repoRoot: string) => getRepositoryFiles(repoRoot));
  handle("file:content", (repoRoot: string, filePath: string) => getFileContent(repoRoot, filePath));

  handle("diff:get", (repoRoot: string, filePath: string, mode: "working" | "staged") =>
    getFileDiff(repoRoot, filePath, mode)
  );
  handle("commit:detail", (repoRoot: string, hash: string) => getCommitDetail(repoRoot, hash));

  handle("op:stage", (repoRoot: string, filePath: string) => stageFile(repoRoot, filePath));
  handle("op:stageAll", (repoRoot: string) => stageAll(repoRoot));
  handle("op:unstage", (repoRoot: string, filePath: string) => unstageFile(repoRoot, filePath));
  handle("op:discard", (repoRoot: string, filePath: string) => discardFile(repoRoot, filePath));
  handle("op:commit", (repoRoot: string, message: string) => commit(repoRoot, message));
  handle("op:merge", (repoRoot: string, target: string) => mergeTarget(repoRoot, target));
  handle("op:fetch", (repoRoot: string) => fetch(repoRoot));
  handle("op:pull", (repoRoot: string) => pull(repoRoot));
  handle("op:push", (repoRoot: string, branchName?: string) => push(repoRoot, branchName));
  handle("terminal:git", (repoRoot: string, input: string) => runGitTerminalCommand(repoRoot, input));

  handle("branch:create", (repoRoot: string, name: string, startPoint?: string) => createBranch(repoRoot, name, startPoint));
  handle("branch:switch", (repoRoot: string, name: string) => switchBranch(repoRoot, name));
  handle("branch:switchRemote", (repoRoot: string, name: string) => switchRemoteBranch(repoRoot, name));
  handle("commit:switch", (repoRoot: string, hash: string) => switchCommit(repoRoot, hash));
  handle("branch:delete", (repoRoot: string, name: string) => deleteBranch(repoRoot, name));
  handle("remote:add", (repoRoot: string, name: string, url: string) => addRemote(repoRoot, name, url));
  handle("remote:forkSetup", (repoRoot: string, originUrl: string, pushCurrentBranch: boolean, currentBranch: string) =>
    forkSetup(repoRoot, originUrl, pushCurrentBranch, currentBranch)
  );

  handle("conflict:state", (repoRoot: string) => getConflictState(repoRoot));
  handle("conflict:file", (repoRoot: string, filePath: string) => getConflictFile(repoRoot, filePath));
  handle("conflict:save", (repoRoot: string, filePath: string, content: string) =>
    saveConflictResult(repoRoot, filePath, content)
  );
  handle("conflict:markResolved", (repoRoot: string, filePath: string) => markResolved(repoRoot, filePath));
  handle("conflict:continue", (repoRoot: string) => continueOperation(repoRoot));
  handle("conflict:abort", (repoRoot: string) => abortOperation(repoRoot));
}
