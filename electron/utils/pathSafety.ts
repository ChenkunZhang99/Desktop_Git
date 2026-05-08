import fs from "node:fs/promises";
import path from "node:path";

export async function assertDirectory(candidate: string): Promise<string> {
  const resolved = path.resolve(candidate);
  const stat = await fs.stat(resolved);
  if (!stat.isDirectory()) {
    throw new Error(`Path is not a directory: ${candidate}`);
  }
  return resolved;
}

export function assertRepoPath(repoRoot: string): string {
  if (!repoRoot || typeof repoRoot !== "string") {
    throw new Error("Repository path is required.");
  }
  return path.resolve(repoRoot);
}

export function assertSafeRelativeGitPath(filePath: string): string {
  if (!filePath || typeof filePath !== "string") {
    throw new Error("File path is required.");
  }
  if (path.isAbsolute(filePath)) {
    throw new Error("Git file paths must be repository-relative.");
  }
  const normalized = filePath.replaceAll("\\", "/");
  if (normalized.includes("\0")) {
    throw new Error("File path contains invalid characters.");
  }
  if (normalized.split("/").some((part) => part === "..")) {
    throw new Error("File path cannot traverse outside the repository.");
  }
  return normalized;
}

export function resolveInsideRepo(repoRoot: string, filePath: string): string {
  const root = assertRepoPath(repoRoot);
  const safeRelativePath = assertSafeRelativeGitPath(filePath);
  const resolved = path.resolve(root, safeRelativePath);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Resolved path escapes the repository root.");
  }
  return resolved;
}

export function resolveGitDir(repoRoot: string, gitDir: string): string {
  return path.isAbsolute(gitDir) ? path.normalize(gitDir) : path.resolve(repoRoot, gitDir);
}
