import type { BranchInfo } from "../../src/types/git.js";
import { runGit } from "./gitRunner.js";

function assertSafeBranchName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed.includes("\0") || trimmed.startsWith("-")) {
    throw new Error("Invalid branch name.");
  }
  return trimmed;
}

function assertSafeStartPoint(startPoint: string): string {
  const trimmed = startPoint.trim();
  if (!trimmed || trimmed.includes("\0") || trimmed.startsWith("-")) {
    throw new Error("Invalid start point.");
  }
  return trimmed;
}

export function parseBranches(output: string): BranchInfo[] {
  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [fullRef, shortName, hash, upstream, head] = line.split("\t");
      const isRemote = fullRef.startsWith("refs/remotes/");
      const name = isRemote ? shortName.replace(/^remotes\//, "") : shortName;
      return {
        name,
        hash,
        upstream: upstream || undefined,
        isCurrent: head === "*",
        isRemote
      };
    })
    .filter((branch) => branch.name && !branch.name.endsWith("/HEAD"));
}

export async function getBranches(repoRoot: string): Promise<BranchInfo[]> {
  const result = await runGit(repoRoot, [
    "for-each-ref",
    "--format=%(refname)\t%(refname:short)\t%(objectname)\t%(upstream:short)\t%(HEAD)",
    "refs/heads",
    "refs/remotes"
  ]);
  if (!result.success) {
    throw new Error(result.stderr || "Unable to read branches.");
  }
  return parseBranches(result.stdout);
}

export async function createBranch(repoRoot: string, name: string, startPoint?: string) {
  const safeName = assertSafeBranchName(name);
  // git switch -c <new> [<start-point>] — both are positional refs, no `--` separator.
  return runGit(
    repoRoot,
    startPoint ? ["switch", "-c", safeName, assertSafeStartPoint(startPoint)] : ["switch", "-c", safeName]
  );
}

export async function switchBranch(repoRoot: string, name: string) {
  // git switch <branch>. Do NOT add `--`; switch only takes a single ref argument
  // and a stray separator is parsed as the literal ref "--".
  return runGit(repoRoot, ["switch", assertSafeBranchName(name)]);
}

export async function switchRemoteBranch(repoRoot: string, remoteBranchName: string) {
  const safeRemoteName = assertSafeBranchName(remoteBranchName);
  const localName = safeRemoteName.replace(/^[^/]+\//, "");
  const localBranches = await getBranches(repoRoot);
  const existingLocalBranch = localBranches.find((branch) => !branch.isRemote && branch.name === localName);
  if (existingLocalBranch) {
    return switchBranch(repoRoot, localName);
  }
  return runGit(repoRoot, ["switch", "--track", safeRemoteName]);
}

export async function switchCommit(repoRoot: string, hash: string) {
  const safeHash = hash.trim();
  if (!/^[0-9a-fA-F]{7,40}$/.test(safeHash)) {
    throw new Error("Invalid commit hash.");
  }
  return runGit(repoRoot, ["switch", "--detach", safeHash]);
}

export async function deleteBranch(repoRoot: string, name: string) {
  // -d (lowercase) refuses to delete unmerged branches; the destructive -D form
  // is only reachable through the terminal blocklist.
  return runGit(repoRoot, ["branch", "-d", assertSafeBranchName(name)]);
}
