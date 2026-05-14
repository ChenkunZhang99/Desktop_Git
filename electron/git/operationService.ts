import { assertSafeRelativeGitPath } from "../utils/pathSafety.js";
import { getConflictState } from "./conflictService.js";
import { runGit } from "./gitRunner.js";

export async function stageFile(repoRoot: string, filePath: string) {
  return runGit(repoRoot, ["add", "--", assertSafeRelativeGitPath(filePath)]);
}

export async function stageAll(repoRoot: string) {
  return runGit(repoRoot, ["add", "-A"]);
}

export async function unstageFile(repoRoot: string, filePath: string) {
  return runGit(repoRoot, ["restore", "--staged", "--", assertSafeRelativeGitPath(filePath)]);
}

export async function discardFile(repoRoot: string, filePath: string) {
  return runGit(repoRoot, ["restore", "--", assertSafeRelativeGitPath(filePath)]);
}

export async function commit(repoRoot: string, message: string) {
  const trimmed = message.trim();
  if (!trimmed) {
    throw new Error("Commit message is required.");
  }
  return runGit(repoRoot, ["commit", "-m", trimmed]);
}

function assertSafeMergeTarget(target: string): string {
  const trimmed = target.trim();
  if (!trimmed || trimmed.includes("\0") || trimmed.startsWith("-")) {
    throw new Error("Invalid merge target.");
  }
  return trimmed;
}

function assertSafeBranchName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed.includes("\0") || trimmed.startsWith("-")) {
    throw new Error("Invalid branch name.");
  }
  return trimmed;
}

export async function mergeTarget(repoRoot: string, target: string) {
  // --no-edit keeps the desktop merge non-interactive while preserving Git's
  // generated merge message when a merge commit is required.
  const result = await runGit(repoRoot, ["merge", "--no-edit", assertSafeMergeTarget(target)]);
  return {
    result,
    conflictState: await getConflictState(repoRoot)
  };
}

export async function fetch(repoRoot: string) {
  return runGit(repoRoot, ["fetch"]);
}

export async function pull(repoRoot: string) {
  const fastForward = await runGit(repoRoot, ["pull", "--ff-only"]);
  if (fastForward.success) {
    return {
      result: fastForward,
      conflictState: await getConflictState(repoRoot)
    };
  }

  const regularPull = await runGit(repoRoot, ["pull"]);
  return {
    result: regularPull,
    conflictState: await getConflictState(repoRoot)
  };
}

export async function push(repoRoot: string, branchName?: string) {
  return branchName ? runGit(repoRoot, ["push", "-u", "origin", assertSafeBranchName(branchName)]) : runGit(repoRoot, ["push"]);
}
