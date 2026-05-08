import type { CommitInfo } from "../../src/types/git.js";
import { runGit } from "./gitRunner.js";
import { getBranches } from "./branchService.js";

const DEFAULT_COMMIT_LIMIT = 800;

export function parseCommitLog(output: string, refsByHash = new Map<string, string[]>()): CommitInfo[] {
  return output
    .split("\x1e")
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [hash, parentsRaw, authorName, authorEmail, date, message] = record.split("\x1f");
      return {
        hash,
        shortHash: hash.slice(0, 8),
        parents: parentsRaw ? parentsRaw.split(" ").filter(Boolean) : [],
        authorName,
        authorEmail,
        date,
        message,
        refs: refsByHash.get(hash) ?? []
      };
    });
}

export async function getCommits(repoRoot: string, limit = DEFAULT_COMMIT_LIMIT): Promise<CommitInfo[]> {
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : DEFAULT_COMMIT_LIMIT;
  const [logResult, branches] = await Promise.all([
    runGit(repoRoot, [
      "log",
      "--all",
      "--topo-order",
      "--date-order",
      "--parents",
      "--date=iso",
      `-n${safeLimit}`,
      "--pretty=format:%H%x1f%P%x1f%an%x1f%ae%x1f%ad%x1f%s%x1e"
    ]),
    getBranches(repoRoot).catch(() => [])
  ]);
  if (!logResult.success) {
    return [];
  }
  const refsByHash = new Map<string, string[]>();
  for (const branch of branches) {
    const refs = refsByHash.get(branch.hash) ?? [];
    refs.push(branch.name);
    refsByHash.set(branch.hash, refs);
  }
  return parseCommitLog(logResult.stdout, refsByHash);
}
