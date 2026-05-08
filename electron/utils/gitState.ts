import fs from "node:fs/promises";
import path from "node:path";
import type { ConflictState, GitOperationKind } from "../../src/types/git.js";

async function exists(candidate: string): Promise<boolean> {
  try {
    await fs.access(candidate);
    return true;
  } catch {
    return false;
  }
}

export async function detectGitOperation(gitDir: string, unmergedFiles: string[]): Promise<ConflictState> {
  const isMergeInProgress = await exists(path.join(gitDir, "MERGE_HEAD"));
  const isRebaseInProgress =
    (await exists(path.join(gitDir, "rebase-merge"))) || (await exists(path.join(gitDir, "rebase-apply")));
  const isCherryPickInProgress = await exists(path.join(gitDir, "CHERRY_PICK_HEAD"));

  let operation: GitOperationKind = "none";
  if (isRebaseInProgress) {
    operation = "rebase";
  } else if (isMergeInProgress) {
    operation = "merge";
  } else if (isCherryPickInProgress) {
    operation = "cherry-pick";
  }

  return {
    operation,
    isMergeInProgress,
    isRebaseInProgress,
    isCherryPickInProgress,
    files: unmergedFiles
  };
}
