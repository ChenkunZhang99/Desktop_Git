import { assertSafeRelativeGitPath } from "../utils/pathSafety.js";
import { runGit } from "./gitRunner.js";

export async function getFileDiff(repoRoot: string, filePath: string, mode: "working" | "staged") {
  const safePath = assertSafeRelativeGitPath(filePath);
  const args = mode === "staged" ? ["diff", "--cached", "--", safePath] : ["diff", "--", safePath];
  const result = await runGit(repoRoot, args);
  if (!result.success) {
    throw new Error(result.stderr || "Unable to read file diff.");
  }
  return {
    path: safePath,
    mode,
    text: result.stdout
  };
}

export async function getCommitDetail(repoRoot: string, hash: string) {
  return runGit(repoRoot, ["show", "--stat", "--patch", hash]);
}
