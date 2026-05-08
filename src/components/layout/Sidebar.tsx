import type { BranchInfo, ConflictState, RepositoryInfo } from "../../types/git";
import { BranchPanel } from "../branch/BranchPanel";

interface SidebarProps {
  repo: RepositoryInfo;
  branches: BranchInfo[];
  conflictState: ConflictState;
  activeView: "graph" | "conflicts";
  hasDirtyWorktree: boolean;
  onViewChange: (view: "graph" | "conflicts") => void;
  onSwitchBranch: (name: string) => void;
  onSwitchRemoteBranch: (name: string) => void;
  onMergeBranch: (name: string) => void;
  onDeleteBranch: (name: string) => void;
  onCreateBranch: (name: string, startPoint?: string) => void;
}

export function Sidebar({
  repo,
  branches,
  conflictState,
  activeView,
  hasDirtyWorktree,
  onViewChange,
  onSwitchBranch,
  onSwitchRemoteBranch,
  onMergeBranch,
  onDeleteBranch,
  onCreateBranch
}: SidebarProps) {
  const hasConflicts = conflictState.files.length > 0;

  return (
    <aside className="sidebar">
      <section className="panel-section">
        <p className="section-title">Repository</p>
        <div className="repo-root" title={repo.root}>
          {repo.root}
        </div>
        <button className={activeView === "graph" ? "nav-active" : ""} onClick={() => onViewChange("graph")}>
          Commit Graph
        </button>
        <button
          className={activeView === "conflicts" || hasConflicts ? "danger-nav" : ""}
          disabled={!hasConflicts}
          onClick={() => onViewChange("conflicts")}
        >
          Conflicts {hasConflicts ? `(${conflictState.files.length})` : ""}
        </button>
      </section>
      <BranchPanel
        branches={branches}
        hasDirtyWorktree={hasDirtyWorktree}
        onSwitchBranch={onSwitchBranch}
        onSwitchRemoteBranch={onSwitchRemoteBranch}
        onMergeBranch={onMergeBranch}
        onDeleteBranch={onDeleteBranch}
        onCreateBranch={onCreateBranch}
      />
    </aside>
  );
}
