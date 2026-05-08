import { useState } from "react";
import type { BranchInfo } from "../../types/git";
import { CreateBranchDialog } from "./CreateBranchDialog";

interface BranchPanelProps {
  branches: BranchInfo[];
  hasDirtyWorktree: boolean;
  onSwitchBranch: (name: string) => void;
  onSwitchRemoteBranch: (name: string) => void;
  onMergeBranch: (name: string) => void;
  onDeleteBranch: (name: string) => void;
  onCreateBranch: (name: string, startPoint?: string) => void;
}

export function BranchPanel({
  branches,
  hasDirtyWorktree,
  onSwitchBranch,
  onSwitchRemoteBranch,
  onMergeBranch,
  onDeleteBranch,
  onCreateBranch
}: BranchPanelProps) {
  const [menu, setMenu] = useState<{ branch: BranchInfo; x: number; y: number } | null>(null);
  const localBranches = branches.filter((branch) => !branch.isRemote);
  const remoteBranches = branches.filter((branch) => branch.isRemote);
  const currentBranch = localBranches.find((branch) => branch.isCurrent)?.name ?? "current branch";

  return (
    <section className="panel-section branch-panel">
      <p className="section-title">Branches</p>
      <CreateBranchDialog onCreate={onCreateBranch} />
      <div className="branch-list">
        {localBranches.map((branch) => (
          <button
            key={branch.name}
            className={branch.isCurrent ? "branch-row current-branch" : "branch-row"}
            disabled={branch.isCurrent}
            onClick={() => {
              if (!branch.isCurrent) onSwitchBranch(branch.name);
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              setMenu({ branch, x: event.clientX, y: event.clientY });
            }}
            title={branch.isCurrent ? "Already on this branch." : hasDirtyWorktree ? "Working tree has changes; click to confirm switch." : "Click to switch. Right-click for branch actions."}
          >
            <span>{branch.isCurrent ? "●" : "○"}</span>
            {branch.name}
          </button>
        ))}
      </div>
      <p className="section-title">Remote</p>
      <div className="branch-list remote-list">
        {remoteBranches.slice(0, 12).map((branch) => (
          <div
            key={branch.name}
            className="branch-row remote-branch"
            onClick={() => {
              onSwitchRemoteBranch(branch.name);
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              setMenu({ branch, x: event.clientX, y: event.clientY });
            }}
            title={hasDirtyWorktree ? "Working tree has changes; click to confirm switch." : "Click to create/switch a local tracking branch. Right-click for actions."}
          >
            <span>◇</span>
            {branch.name}
          </div>
        ))}
      </div>
      {menu ? (
        <div className="graph-menu branch-menu" style={{ left: menu.x, top: menu.y }} onMouseLeave={() => setMenu(null)}>
          <button
            disabled={menu.branch.isCurrent}
            onClick={() => {
              if (menu.branch.isRemote) {
                onSwitchRemoteBranch(menu.branch.name);
              } else {
                onSwitchBranch(menu.branch.name);
              }
              setMenu(null);
            }}
          >
            {menu.branch.isCurrent ? `Already on ${menu.branch.name}` : menu.branch.isRemote ? "Track and Switch" : "Switch to Branch"}
          </button>
          <button onClick={() => { navigator.clipboard?.writeText(menu.branch.name).catch(() => undefined); setMenu(null); }}>
            Copy Branch Name
          </button>
          <button
            disabled={menu.branch.isCurrent || hasDirtyWorktree}
            title={
              menu.branch.isCurrent
                ? "This is already the current branch."
                : hasDirtyWorktree
                  ? "Commit or stash changes before merging."
                  : undefined
            }
            onClick={() => {
              onMergeBranch(menu.branch.name);
              setMenu(null);
            }}
          >
            Merge into {currentBranch}
          </button>
          <button
            className="danger-button"
            disabled={menu.branch.isCurrent || menu.branch.isRemote}
            onClick={() => {
              onDeleteBranch(menu.branch.name);
              setMenu(null);
            }}
          >
            Delete Local Branch
          </button>
        </div>
      ) : null}
    </section>
  );
}
