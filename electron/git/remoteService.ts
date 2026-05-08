import type { RemoteInfo } from "../../src/types/git.js";
import { runGit } from "./gitRunner.js";

function assertSafeRemoteName(name: string): string {
  const trimmed = name.trim();
  if (!/^[A-Za-z0-9._-]+$/.test(trimmed) || trimmed.startsWith("-")) {
    throw new Error("Remote name can only contain letters, numbers, dots, underscores, and hyphens.");
  }
  return trimmed;
}

function assertSafeRemoteUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed || trimmed.includes("\0") || trimmed.startsWith("-") || /\s/.test(trimmed)) {
    throw new Error("Remote URL is invalid.");
  }
  return trimmed;
}

export function parseRemotes(output: string): RemoteInfo[] {
  const remotes = new Map<string, RemoteInfo>();
  for (const line of output.split(/\r?\n/).filter(Boolean)) {
    const match = line.match(/^(\S+)\s+(.+)\s+\((fetch|push)\)$/);
    if (!match) continue;
    const [, name, url, kind] = match;
    const remote = remotes.get(name) ?? { name };
    if (kind === "fetch") {
      remote.fetchUrl = url;
    } else {
      remote.pushUrl = url;
    }
    remotes.set(name, remote);
  }
  return [...remotes.values()];
}

export async function getRemotes(repoRoot: string): Promise<RemoteInfo[]> {
  const result = await runGit(repoRoot, ["remote", "-v"]);
  if (!result.success) {
    throw new Error(result.stderr || "Unable to read remotes.");
  }
  return parseRemotes(result.stdout);
}

export async function addRemote(repoRoot: string, name: string, url: string) {
  const safeName = assertSafeRemoteName(name);
  const safeUrl = assertSafeRemoteUrl(url);
  const remotes = await getRemotes(repoRoot);
  if (remotes.some((remote) => remote.name === safeName)) {
    throw new Error(`Remote "${safeName}" already exists.`);
  }
  return runGit(repoRoot, ["remote", "add", safeName, safeUrl]);
}

export async function forkSetup(repoRoot: string, originUrl: string, pushCurrentBranch: boolean, currentBranch: string) {
  const safeUrl = assertSafeRemoteUrl(originUrl);
  const remotes = await getRemotes(repoRoot);
  const hasOrigin = remotes.some((remote) => remote.name === "origin");
  const hasUpstream = remotes.some((remote) => remote.name === "upstream");
  if (!hasOrigin) {
    throw new Error("Cannot run fork setup because remote origin does not exist.");
  }
  if (hasUpstream) {
    throw new Error("Cannot run fork setup because remote upstream already exists.");
  }

  const results = [await runGit(repoRoot, ["remote", "rename", "origin", "upstream"])];
  if (!results[0].success) {
    return results;
  }

  const addOriginResult = await runGit(repoRoot, ["remote", "add", "origin", safeUrl]);
  results.push(addOriginResult);
  if (!addOriginResult.success) {
    // Roll the rename back so the repo is not left without an origin.
    const rollback = await runGit(repoRoot, ["remote", "rename", "upstream", "origin"]);
    results.push(rollback);
    return results;
  }

  if (pushCurrentBranch && currentBranch && currentBranch !== "DETACHED") {
    results.push(await runGit(repoRoot, ["push", "-u", "origin", currentBranch]));
  }
  return results;
}
