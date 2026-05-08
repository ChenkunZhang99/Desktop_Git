import { dialog } from "electron";
import { runGit, requireGitSuccess } from "./gitRunner.js";
import { getStatus } from "./statusService.js";
import { getBranches } from "./branchService.js";
import { getCommits } from "./logService.js";
import { getConflictState } from "./conflictService.js";
import { getRepositoryFiles } from "./fileService.js";
import { getRemotes } from "./remoteService.js";
import { assertDirectory, resolveGitDir } from "../utils/pathSafety.js";
import type { RepoSnapshot, RepositoryInfo } from "../../src/types/git.js";

export async function openRepositoryDialog(): Promise<string | undefined> {
  const result = await dialog.showOpenDialog({
    title: "Open Git Repository",
    properties: ["openDirectory"]
  });
  return result.canceled ? undefined : result.filePaths[0];
}

export async function validateRepository(candidatePath: string): Promise<RepositoryInfo> {
  const directory = await assertDirectory(candidatePath);
  const insideWorkTree = requireGitSuccess(
    await runGit(directory, ["rev-parse", "--is-inside-work-tree"]),
    "Path is not inside a Git working tree."
  );
  const topLevel = requireGitSuccess(
    await runGit(directory, ["rev-parse", "--show-toplevel"]),
    "Unable to resolve repository root."
  );
  const gitDir = requireGitSuccess(
    await runGit(directory, ["rev-parse", "--git-dir"]),
    "Unable to resolve Git directory."
  );
  const currentBranch = await runGit(directory, ["branch", "--show-current"]);
  const headHash = requireGitSuccess(await runGit(directory, ["rev-parse", "HEAD"]), "Unable to resolve HEAD.");

  const root = topLevel.stdout.trim();
  return {
    root,
    gitDir: resolveGitDir(root, gitDir.stdout.trim()),
    currentBranch: currentBranch.stdout.trim() || "DETACHED",
    headHash: headHash.stdout.trim(),
    isInsideWorkTree: insideWorkTree.stdout.trim() === "true"
  };
}

export async function getRepoSnapshot(repoRoot: string): Promise<RepoSnapshot> {
  const repo = await validateRepository(repoRoot);
  const [status, branches, remotes, files, commits, conflictState] = await Promise.all([
    getStatus(repo.root),
    getBranches(repo.root),
    getRemotes(repo.root),
    getRepositoryFiles(repo.root),
    getCommits(repo.root),
    getConflictState(repo.root)
  ]);
  return { repo, status, branches, remotes, files, commits, conflictState };
}
