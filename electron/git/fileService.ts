import fs from "node:fs/promises";
import { assertSafeRelativeGitPath, resolveInsideRepo } from "../utils/pathSafety.js";
import { runGit } from "./gitRunner.js";

const MAX_REPO_FILES = 5_000;

export async function getRepositoryFiles(repoRoot: string): Promise<string[]> {
  // -z produces NUL-terminated names so paths with whitespace or unusual
  // characters are not C-quoted.
  const result = await runGit(repoRoot, ["ls-tree", "-r", "--name-only", "-z", "HEAD"]);
  if (!result.success) {
    return [];
  }
  const files = result.stdout.split("\0").filter(Boolean);
  return files.length > MAX_REPO_FILES ? files.slice(0, MAX_REPO_FILES) : files;
}

export async function getFileContent(repoRoot: string, filePath: string) {
  const safePath = assertSafeRelativeGitPath(filePath);
  const absolutePath = resolveInsideRepo(repoRoot, safePath);
  const buffer = await fs.readFile(absolutePath);
  // Detect binary content cheaply: NUL byte in the first 8 KiB.
  const probe = buffer.subarray(0, Math.min(buffer.length, 8 * 1024));
  if (probe.includes(0)) {
    return {
      path: safePath,
      content: `// Binary file (${buffer.length.toLocaleString()} bytes) — preview disabled.`
    };
  }
  return {
    path: safePath,
    content: buffer.toString("utf8")
  };
}
