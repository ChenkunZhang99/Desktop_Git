import type { FileStatus, FileStatusCategory, StatusSummary } from "../../src/types/git.js";
import { runGit } from "./gitRunner.js";

const unmergedPairs = new Set(["DD", "AU", "UD", "UA", "DU", "AA", "UU"]);

function categorize(indexStatus: string, workingTreeStatus: string): {
  category: FileStatusCategory;
  isConflicted: boolean;
} {
  const pair = `${indexStatus}${workingTreeStatus}`;
  const isConflicted = unmergedPairs.has(pair);
  if (isConflicted) {
    return { category: "conflicted", isConflicted };
  }
  if (indexStatus === "?" && workingTreeStatus === "?") {
    return { category: "untracked", isConflicted: false };
  }
  if (indexStatus === "R" || workingTreeStatus === "R") {
    return { category: "renamed", isConflicted: false };
  }
  if (workingTreeStatus === "D" && indexStatus === " ") {
    return { category: "deleted", isConflicted: false };
  }
  if (indexStatus !== " " && indexStatus !== "?") {
    return { category: "staged", isConflicted: false };
  }
  return { category: "unstaged", isConflicted: false };
}

/**
 * Parse `git status --porcelain=v1 -z` output. Records are NUL-terminated;
 * rename/copy entries (R/C) are followed by an additional NUL-terminated
 * record holding the original path. This is robust against filenames with
 * spaces, newlines, or non-ASCII characters.
 */
export function parsePorcelainStatusZ(output: string): StatusSummary {
  const files: FileStatus[] = [];
  const tokens = output.split("\0");
  // The trailing NUL produces an empty element; drop it.
  if (tokens.length && tokens[tokens.length - 1] === "") {
    tokens.pop();
  }

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token.length < 3) continue;
    const indexStatus = token[0] ?? " ";
    const workingTreeStatus = token[1] ?? " ";
    // Format: "XY <path>" — exactly one space between status and path.
    const path = token.slice(3);
    let originalPath: string | undefined;
    if (indexStatus === "R" || indexStatus === "C" || workingTreeStatus === "R" || workingTreeStatus === "C") {
      originalPath = tokens[i + 1];
      i += 1;
    }
    const { category, isConflicted } = categorize(indexStatus, workingTreeStatus);
    files.push({ path, originalPath, indexStatus, workingTreeStatus, category, isConflicted });
  }

  return {
    files,
    staged: files.filter((file) => file.category === "staged" || file.category === "renamed"),
    unstaged: files.filter((file) => file.category === "unstaged" || file.category === "deleted"),
    untracked: files.filter((file) => file.category === "untracked"),
    conflicted: files.filter((file) => file.isConflicted)
  };
}

/**
 * Legacy newline-based parser kept for the existing unit test corpus. New code
 * paths should use the -z parser above.
 */
export function parsePorcelainStatus(output: string): StatusSummary {
  const files: FileStatus[] = output
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const indexStatus = line[0] ?? " ";
      const workingTreeStatus = line[1] ?? " ";
      const rawPath = line.slice(3);
      const [originalPath, nextPath] = rawPath.includes(" -> ") ? rawPath.split(" -> ") : [undefined, rawPath];
      const { category, isConflicted } = categorize(indexStatus, workingTreeStatus);
      return {
        path: nextPath,
        originalPath,
        indexStatus,
        workingTreeStatus,
        category,
        isConflicted
      };
    });

  return {
    files,
    staged: files.filter((file) => file.category === "staged" || file.category === "renamed"),
    unstaged: files.filter((file) => file.category === "unstaged" || file.category === "deleted"),
    untracked: files.filter((file) => file.category === "untracked"),
    conflicted: files.filter((file) => file.isConflicted)
  };
}

export async function getStatus(repoRoot: string): Promise<StatusSummary> {
  const result = await runGit(repoRoot, ["status", "--porcelain=v1", "-z"]);
  if (!result.success) {
    throw new Error(result.stderr || "Unable to read repository status.");
  }
  return parsePorcelainStatusZ(result.stdout);
}

export async function getUnmergedFiles(repoRoot: string): Promise<string[]> {
  const result = await runGit(repoRoot, ["diff", "--name-only", "--diff-filter=U", "-z"]);
  if (!result.success) {
    throw new Error(result.stderr || "Unable to read unmerged files.");
  }
  return result.stdout.split("\0").filter(Boolean);
}
