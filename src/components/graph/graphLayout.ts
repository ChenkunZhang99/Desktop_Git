import type { Edge, Node } from "@xyflow/react";
import type { BranchInfo, CommitInfo, RepositoryInfo } from "../../types/git";
import { colorForIndex } from "./graphTheme";

const laneWidth = 210;
const rowHeight = 92;
const laneXInset = 150;
const nodeYInset = 118;
const commitDotX = 17;
const commitDotY = 17;
const laneLabelY = 62;
const railYInset = 96;

export interface CommitNodeData extends Record<string, unknown> {
  commit: CommitInfo;
  color: string;
  selected: boolean;
  isHead: boolean;
  isLatest: boolean;
  isCurrentBranchHead: boolean;
  lane: number;
  column: number;
}

export interface LaneLabelNodeData extends Record<string, unknown> {
  name: string;
  refs: string[];
  color: string;
  isCurrent: boolean;
  lane: number;
}

export interface BranchRailNodeData extends Record<string, unknown> {
  color: string;
  height: number;
  isCurrent: boolean;
  lane: number;
}

export function layoutCommitGraph(
  commits: CommitInfo[],
  branches: BranchInfo[],
  repo: RepositoryInfo,
  selectedHash?: string
) {
  const commitByHash = new Map(commits.map((commit) => [commit.hash, commit]));
  const branchByHash = new Map<string, string[]>();
  branches.forEach((branch) => {
    branchByHash.set(branch.hash, [...(branchByHash.get(branch.hash) ?? []), branch.name]);
  });
  branchByHash.set(repo.headHash, [...(branchByHash.get(repo.headHash) ?? []), "HEAD"]);

  const columnByHash = assignCommitColumns(commits);
  const orderedBranchHeads = buildOrderedBranchHeads(branches, repo, commitByHash, columnByHash);
  const laneByHash = assignCommitLanes(commits, branches, repo);
  const rowByHash = assignCommitRows(commits);

  const railNodes: Node<BranchRailNodeData>[] = buildRailNodes(orderedBranchHeads, branches, repo, laneByHash, commits.length);
  const laneLabels: Node<LaneLabelNodeData>[] = buildLaneLabelNodes(orderedBranchHeads, branches, repo, laneByHash);

  const commitNodes: Node<CommitNodeData>[] = commits.map((commit, index) => {
    const refs = branchByHash.get(commit.hash) ?? commit.refs;
    const lane = laneByHash.get(commit.hash) ?? 0;
    const column = columnByHash.get(commit.hash) ?? index;
    const row = rowByHash.get(commit.hash) ?? index;
    const enrichedCommit = { ...commit, refs };
    const laneX = laneXInset + lane * laneWidth;
    return {
      id: commit.hash,
      type: "commit",
      position: { x: laneX - commitDotX, y: nodeYInset + row * rowHeight - commitDotY },
      draggable: false,
      zIndex: 3,
      data: {
        commit: enrichedCommit,
        color: colorForIndex(lane),
        selected: selectedHash === commit.hash,
        isHead: repo.headHash === commit.hash,
        isLatest: index === 0,
        isCurrentBranchHead: branches.some((branch) => branch.isCurrent && branch.hash === commit.hash),
        lane,
        column
      }
    };
  });

  const nodes: Node[] = [...railNodes, ...laneLabels, ...commitNodes];

  const edges: Edge[] = commits.flatMap((commit) =>
    commit.parents
      .filter((parent) => commitByHash.has(parent))
      .map((parent, parentIndex) => {
        const parentLane = laneByHash.get(parent) ?? 0;
        const childLane = laneByHash.get(commit.hash) ?? 0;
        const handles = getConnectionHandles(parentLane, childLane, parentIndex);
        return {
          id: `${parent}-${commit.hash}-${parentIndex}`,
          source: parent,
          target: commit.hash,
          sourceHandle: handles.sourceHandle,
          targetHandle: handles.targetHandle,
          type: "git",
          animated: false,
          className: parentIndex === 0 ? "graph-edge graph-edge-primary" : "graph-edge graph-edge-merge",
          data: {
            kind: parentIndex === 0 ? "primary" : "merge",
            sameLane: parentLane === childLane,
            sourceLane: parentLane,
            targetLane: childLane,
            branchDirection: Math.sign(childLane - parentLane)
          },
          style: getEdgeStyle(parentLane, childLane, parentIndex)
        };
      })
  );

  return { nodes, edges };
}

export function assignCommitRows(commits: CommitInfo[]): Map<string, number> {
  const rowByHash = new Map<string, number>();
  commits.forEach((commit, index) => {
    rowByHash.set(commit.hash, index);
  });
  return rowByHash;
}

/**
 * Topological-index columns. The commit list is already in `git log
 * --topo-order --date-order` order with the newest commit at index 0, so we
 * place the newest commit at the rightmost column. This gives an intuitive
 * "time flows left to right" reading even when long-running side branches
 * have shallower ancestry depth than the main line.
 */
export function assignCommitColumns(commits: CommitInfo[]): Map<string, number> {
  const columnByHash = new Map<string, number>();
  const lastIndex = Math.max(0, commits.length - 1);
  commits.forEach((commit, index) => {
    columnByHash.set(commit.hash, lastIndex - index);
  });
  return columnByHash;
}

export function assignCommitLanes(commits: CommitInfo[], branches: BranchInfo[], repo: RepositoryInfo): Map<string, number> {
  const laneByHash = new Map<string, number>();
  const commitByHash = new Map(commits.map((commit) => [commit.hash, commit]));
  const columnByHash = assignCommitColumns(commits);
  const orderedBranchHeads = buildOrderedBranchHeads(branches, repo, commitByHash, columnByHash);
  let nextLane = 0;

  for (const branch of orderedBranchHeads) {
    if (laneByHash.has(branch.hash)) continue;
    assignFirstParentPath(branch.hash, nextLane, commitByHash, laneByHash);
    nextLane += 1;
  }

  // Safety net for orphaned commits not reachable from visible branch refs.
  // We intentionally do not create extra lanes just because a commit appears
  // as a merge parent. If the original branch no longer has a visible ref,
  // showing that historical side branch as a synthetic lane is more confusing
  // than useful for this app's branch-first timeline.
  for (const commit of commits) {
    if (!laneByHash.has(commit.hash)) {
      const firstAssignedDescendant = findAssignedDescendantLane(commit.hash, commits, laneByHash);
      assignFirstParentPath(commit.hash, firstAssignedDescendant ?? 0, commitByHash, laneByHash);
    }
  }

  return laneByHash;
}

function buildOrderedBranchHeads(
  branches: BranchInfo[],
  repo: RepositoryInfo,
  commitByHash: Map<string, CommitInfo>,
  columnByHash: Map<string, number>
): BranchInfo[] {
  const localBranches = uniqueBranchesByHash(branches.filter((branch) => !branch.isRemote));
  const primaryBranch =
    localBranches.find((branch) => branch.name === "master") ??
    localBranches.find((branch) => branch.name === "main") ??
    localBranches.find((branch) => branch.isCurrent) ??
    localBranches[0];

  const ordered: BranchInfo[] = [];
  if (primaryBranch) {
    ordered.push(primaryBranch);
  }

  const nonPrimaryLocal = localBranches
    .filter((branch) => branch.hash !== primaryBranch?.hash)
    .sort((left, right) => branchStartColumn(left.hash, commitByHash, columnByHash) - branchStartColumn(right.hash, commitByHash, columnByHash));

  ordered.push(...nonPrimaryLocal);

  const localNames = new Set(localBranches.map((branch) => branch.name));
  const remoteOnlyBranches = uniqueBranchesByHash(
    branches.filter((branch) => branch.isRemote && !localNames.has(branch.name.replace(/^[^/]+\//, "")))
  ).sort((left, right) => branchStartColumn(left.hash, commitByHash, columnByHash) - branchStartColumn(right.hash, commitByHash, columnByHash));

  ordered.push(...remoteOnlyBranches);

  if (!ordered.some((branch) => branch.hash === repo.headHash)) {
    ordered.push({
      name: repo.currentBranch,
      hash: repo.headHash,
      isCurrent: true,
      isRemote: false
    });
  }

  return ordered;
}

function assignFirstParentPath(
  startHash: string,
  lane: number,
  commitByHash: Map<string, CommitInfo>,
  laneByHash: Map<string, number>
) {
  let hash: string | undefined = startHash;
  while (hash && commitByHash.has(hash) && !laneByHash.has(hash)) {
    laneByHash.set(hash, lane);
    hash = commitByHash.get(hash)?.parents[0];
  }
}

function branchStartColumn(hash: string, commitByHash: Map<string, CommitInfo>, columnByHash: Map<string, number>) {
  let currentHash: string | undefined = hash;
  let earliest = columnByHash.get(hash) ?? Number.MAX_SAFE_INTEGER;
  const seen = new Set<string>();
  while (currentHash && commitByHash.has(currentHash) && !seen.has(currentHash)) {
    seen.add(currentHash);
    earliest = Math.min(earliest, columnByHash.get(currentHash) ?? earliest);
    currentHash = commitByHash.get(currentHash)?.parents[0];
  }
  return earliest;
}

function uniqueBranchesByHash(branches: BranchInfo[]) {
  const seen = new Set<string>();
  const uniqueBranches: BranchInfo[] = [];
  for (const branch of branches) {
    if (!branch.hash || seen.has(branch.hash)) continue;
    seen.add(branch.hash);
    uniqueBranches.push(branch);
  }
  return uniqueBranches;
}

function findAssignedDescendantLane(hash: string, commits: CommitInfo[], laneByHash: Map<string, number>) {
  const child = commits.find((commit) => commit.parents.includes(hash) && laneByHash.has(commit.hash));
  return child ? laneByHash.get(child.hash) : undefined;
}

function buildLaneLabelNodes(
  orderedBranchHeads: BranchInfo[],
  branches: BranchInfo[],
  repo: RepositoryInfo,
  laneByHash: Map<string, number>
): Node<LaneLabelNodeData>[] {
  const refsByLane = new Map<number, BranchInfo[]>();
  for (const branch of branches) {
    const lane = laneByHash.get(branch.hash);
    if (lane === undefined) continue;
    refsByLane.set(lane, [...(refsByLane.get(lane) ?? []), branch]);
  }

  const labelByLane = new Map<number, BranchInfo>();
  for (const branch of orderedBranchHeads) {
    const lane = laneByHash.get(branch.hash);
    if (lane === undefined || labelByLane.has(lane)) continue;
    labelByLane.set(lane, branch);
  }

  return [...labelByLane.entries()].map(([lane, branch]) => {
    const laneRefs = refsByLane.get(lane) ?? [branch];
    const localRefs = laneRefs.filter((ref) => !ref.isRemote).map((ref) => ref.name);
    const remoteRefs = laneRefs.filter((ref) => ref.isRemote).map((ref) => ref.name);
    const refs = [...localRefs, ...remoteRefs].filter((ref, index, all) => all.indexOf(ref) === index);
    const name = localRefs[0] ?? branch.name;
    return {
      id: `lane-${lane}`,
      type: "laneLabel",
      position: { x: laneXInset + lane * laneWidth - 86, y: laneLabelY },
      selectable: false,
      draggable: false,
      zIndex: 2,
      data: {
        name,
        refs,
        color: colorForIndex(lane),
        isCurrent: refs.includes(repo.currentBranch),
        lane
      }
    };
  });
}

function buildRailNodes(
  orderedBranchHeads: BranchInfo[],
  branches: BranchInfo[],
  repo: RepositoryInfo,
  laneByHash: Map<string, number>,
  commitCount: number
): Node<BranchRailNodeData>[] {
  const visibleLanes = new Set<number>();
  for (const branch of orderedBranchHeads) {
    const lane = laneByHash.get(branch.hash);
    if (lane !== undefined) visibleLanes.add(lane);
  }

  return [...visibleLanes].map((lane) => {
    const laneRefs = branches.filter((branch) => laneByHash.get(branch.hash) === lane);
    return {
      id: `rail-${lane}`,
      type: "branchRail",
      position: { x: laneXInset + lane * laneWidth - 1.5, y: railYInset },
      selectable: false,
      draggable: false,
      zIndex: 0,
      data: {
        color: colorForIndex(lane),
        height: Math.max(260, commitCount * rowHeight + 80),
        isCurrent: laneRefs.some((branch) => branch.name === repo.currentBranch),
        lane
      }
    };
  });
}

function getEdgeStyle(sourceLane: number, targetLane: number, parentIndex: number) {
  const color = parentIndex === 0 ? colorForIndex(targetLane) : "#ffb703";
  const opacity = parentIndex === 0 ? 0.82 : 0.56;
  const isSameLane = sourceLane === targetLane;

  return {
    stroke: color,
    strokeWidth: parentIndex === 0 ? 3 : 2.2,
    strokeOpacity: isSameLane ? opacity : Math.max(0.44, opacity - 0.08),
    strokeDasharray: parentIndex === 0 ? undefined : "6 8"
  };
}

/**
 * Edges are parent→child. The graph places newer commits above older commits,
 * so lines visually travel upward from a parent into its descendant.
 */
function getConnectionHandles(sourceLane: number, targetLane: number, _parentIndex: number) {
  if (sourceLane === targetLane) {
    return { sourceHandle: "top", targetHandle: "bottom-target" };
  }

  if (targetLane > sourceLane) {
    return { sourceHandle: "right", targetHandle: "left" };
  }

  return { sourceHandle: "left-source", targetHandle: "right-target" };
}
