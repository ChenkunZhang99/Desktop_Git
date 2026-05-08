import type { CommitInfo } from "../../types/git";

interface GraphContextMenuProps {
  commit: CommitInfo | null;
  headHash: string;
  currentBranch: string;
  hasDirtyWorktree: boolean;
  x: number;
  y: number;
  onClose: () => void;
  onCopyHash: (hash: string) => void;
  onCreateBranch: (commit: CommitInfo) => void;
  onSwitchCommit: (commit: CommitInfo) => void;
  onSwitchBranch: (branchName: string) => void;
  onMergeTarget: (target: string) => void;
}

export function GraphContextMenu({
  commit,
  headHash,
  currentBranch,
  hasDirtyWorktree,
  x,
  y,
  onClose,
  onCopyHash,
  onCreateBranch,
  onSwitchCommit,
  onSwitchBranch,
  onMergeTarget
}: GraphContextMenuProps) {
  if (!commit) return null;
  const localBranchRefs = commit.refs.filter((ref) => ref !== "HEAD" && !ref.startsWith("origin/"));
  const mergeRefs = commit.refs.filter((ref) => ref !== "HEAD" && ref !== currentBranch).slice(0, 4);
  const switchTarget = localBranchRefs.find((ref) => ref !== currentBranch);
  const isHead = commit.hash === headHash;
  const mergeDisabled = isHead || hasDirtyWorktree;
  const mergeTitle = isHead
    ? "This commit is already HEAD."
    : hasDirtyWorktree
      ? "Commit or stash changes before merging."
      : undefined;
  return (
    <div className="graph-menu" style={{ left: x, top: y }} onMouseLeave={onClose}>
      <button onClick={() => onCopyHash(commit.hash)}>Copy Hash</button>
      <button onClick={() => onCopyHash(commit.shortHash)}>Copy Short Hash</button>
      <button onClick={() => onCreateBranch(commit)}>Create Branch Here</button>
      {mergeRefs.length > 0 ? (
        mergeRefs.map((ref) => (
          <button key={ref} disabled={mergeDisabled} title={mergeTitle} onClick={() => onMergeTarget(ref)}>
            Merge {ref} into {currentBranch}
          </button>
        ))
      ) : (
        <button disabled={mergeDisabled} title={mergeTitle} onClick={() => onMergeTarget(commit.hash)}>
          Merge Commit into {currentBranch}
        </button>
      )}
      {localBranchRefs.length > 0 ? (
        <button disabled={!switchTarget || hasDirtyWorktree} title={hasDirtyWorktree ? "Commit or stash changes before switching." : undefined} onClick={() => switchTarget && onSwitchBranch(switchTarget)}>
          {switchTarget ? `Switch to ${switchTarget}` : `Already on ${currentBranch}`}
        </button>
      ) : null}
      <button disabled={isHead || hasDirtyWorktree} title={isHead ? "Already at HEAD." : hasDirtyWorktree ? "Commit or stash changes before checkout." : undefined} onClick={() => onSwitchCommit(commit)}>
        {isHead ? "Already at HEAD" : "Checkout Commit"}
      </button>
    </div>
  );
}
