import fs from "node:fs/promises";
import { resolveGitDir, resolveInsideRepo, assertSafeRelativeGitPath } from "../utils/pathSafety.js";
import { detectGitOperation } from "../utils/gitState.js";
import { runGit } from "./gitRunner.js";
import { getUnmergedFiles } from "./statusService.js";
import type { ConflictFileData } from "../../src/types/git.js";

async function getRealGitDir(repoRoot: string): Promise<string> {
  const result = await runGit(repoRoot, ["rev-parse", "--git-dir"]);
  if (!result.success) {
    throw new Error(result.stderr || "Unable to resolve Git directory.");
  }
  return resolveGitDir(repoRoot, result.stdout.trim());
}

async function gitShowStage(repoRoot: string, stage: 1 | 2 | 3, filePath: string): Promise<string | undefined> {
  const result = await runGit(repoRoot, ["show", `:${stage}:${filePath}`]);
  return result.success ? result.stdout : undefined;
}

export async function getConflictState(repoRoot: string) {
  const [gitDir, unmergedFiles] = await Promise.all([getRealGitDir(repoRoot), getUnmergedFiles(repoRoot)]);
  return detectGitOperation(gitDir, unmergedFiles);
}

export async function getConflictFile(repoRoot: string, filePath: string): Promise<ConflictFileData> {
  const safePath = assertSafeRelativeGitPath(filePath);
  const absolutePath = resolveInsideRepo(repoRoot, safePath);
  const [current, base, local, remote] = await Promise.all([
    fs.readFile(absolutePath, "utf8").catch(() => ""),
    gitShowStage(repoRoot, 1, safePath),
    gitShowStage(repoRoot, 2, safePath),
    gitShowStage(repoRoot, 3, safePath)
  ]);

  return {
    path: safePath,
    current,
    base,
    local,
    remote,
    result: current
  };
}

export async function saveConflictResult(repoRoot: string, filePath: string, content: string) {
  const safePath = assertSafeRelativeGitPath(filePath);
  const absolutePath = resolveInsideRepo(repoRoot, safePath);
  await fs.writeFile(absolutePath, content, "utf8");
  return markResolved(repoRoot, safePath);
}

export async function markResolved(repoRoot: string, filePath: string) {
  const safePath = assertSafeRelativeGitPath(filePath);
  const command = await runGit(repoRoot, ["add", "--", safePath]);
  const conflictState = await getConflictState(repoRoot);
  return {
    command,
    isResolved: !conflictState.files.includes(safePath),
    conflictState
  };
}

export async function continueOperation(repoRoot: string) {
  const state = await getConflictState(repoRoot);
  if (state.operation === "merge") {
    return runGit(repoRoot, ["merge", "--continue"]);
  }
  if (state.operation === "rebase") {
    return runGit(repoRoot, ["rebase", "--continue"]);
  }
  if (state.operation === "cherry-pick") {
    return runGit(repoRoot, ["cherry-pick", "--continue"]);
  }
  throw new Error("No merge, rebase, or cherry-pick operation is in progress.");
}

export async function abortOperation(repoRoot: string) {
  const state = await getConflictState(repoRoot);
  if (state.operation === "merge") {
    return runGit(repoRoot, ["merge", "--abort"]);
  }
  if (state.operation === "rebase") {
    return runGit(repoRoot, ["rebase", "--abort"]);
  }
  if (state.operation === "cherry-pick") {
    return runGit(repoRoot, ["cherry-pick", "--abort"]);
  }
  throw new Error("No merge, rebase, or cherry-pick operation is in progress.");
}
