import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import { Background, ReactFlow, type NodeMouseHandler, type ReactFlowInstance } from "@xyflow/react";
import type { BranchInfo, CommitInfo, RepositoryInfo } from "../../types/git";
import { BranchRail } from "./BranchRail";
import { CommitNode } from "./CommitNode";
import { LaneLabelNode } from "./LaneLabelNode";
import { GraphContextMenu } from "./GraphContextMenu";
import { GraphToolbar } from "./GraphToolbar";
import { layoutCommitGraph } from "./graphLayout";
import { GitEdge } from "./GitEdge";

const nodeTypes = {
  branchRail: BranchRail as ComponentType<any>,
  commit: CommitNode as ComponentType<any>,
  laneLabel: LaneLabelNode as ComponentType<any>
};

const edgeTypes = {
  git: GitEdge
};

interface CommitGraphProps {
  commits: CommitInfo[];
  branches: BranchInfo[];
  repo: RepositoryInfo;
  hasDirtyWorktree: boolean;
  selectedHash?: string;
  onSelectCommit: (commit: CommitInfo) => void;
  onCreateBranch: (name: string, startPoint?: string) => void;
  onSwitchCommit: (hash: string) => void;
  onSwitchBranch: (name: string) => void;
  onMergeTarget: (target: string) => void;
}

export function CommitGraph({
  commits,
  branches,
  repo,
  hasDirtyWorktree,
  selectedHash,
  onSelectCommit,
  onCreateBranch,
  onSwitchCommit,
  onSwitchBranch,
  onMergeTarget
}: CommitGraphProps) {
  const [menu, setMenu] = useState<{ commit: CommitInfo; x: number; y: number } | null>(null);
  const [flow, setFlow] = useState<ReactFlowInstance | null>(null);
  const { nodes, edges } = useMemo(() => layoutCommitGraph(commits, branches, repo, selectedHash), [commits, branches, repo, selectedHash]);

  const focusCommit = (hash?: string) => {
    if (!hash) return;
    const node = nodes.find((candidate) => candidate.id === hash);
    const commit = commits.find((candidate) => candidate.hash === hash);
    if (commit) onSelectCommit(commit);
    if (node && flow) {
      void flow.setCenter(node.position.x + 92, node.position.y + 28, { zoom: 1, duration: 420 });
    }
  };

  const onNodeClick: NodeMouseHandler = (_event, node) => {
    if (node.type !== "commit") return;
    onSelectCommit((node.data as { commit: CommitInfo }).commit);
  };

  const onNodeContextMenu: NodeMouseHandler = (event, node) => {
    if (node.type !== "commit") return;
    event.preventDefault();
    setMenu({ commit: (node.data as { commit: CommitInfo }).commit, x: event.clientX, y: event.clientY });
  };

  return (
    <section className="graph-shell">
      <GraphToolbar count={commits.length} onGoHead={() => focusCommit(repo.headHash)} onGoLatest={() => focusCommit(commits[0]?.hash)} />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.2}
        maxZoom={1.4}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        onInit={setFlow}
      >
        <Background color="#183049" gap={28} size={1} />
      </ReactFlow>
      <GraphContextMenu
        commit={menu?.commit ?? null}
        headHash={repo.headHash}
        currentBranch={repo.currentBranch}
        hasDirtyWorktree={hasDirtyWorktree}
        x={menu?.x ?? 0}
        y={menu?.y ?? 0}
        onClose={() => setMenu(null)}
        onCopyHash={(hash) => {
          navigator.clipboard?.writeText(hash).catch(() => undefined);
          setMenu(null);
        }}
        onCreateBranch={(commit) => {
          const name = prompt(`Create branch at ${commit.shortHash}`, `branch-${commit.shortHash}`);
          if (name?.trim()) {
            onCreateBranch(name.trim(), commit.hash);
          }
          setMenu(null);
        }}
        onSwitchCommit={(commit) => {
          onSwitchCommit(commit.hash);
          setMenu(null);
        }}
        onSwitchBranch={(branchName) => {
          onSwitchBranch(branchName);
          setMenu(null);
        }}
        onMergeTarget={(target) => {
          onMergeTarget(target);
          setMenu(null);
        }}
      />
    </section>
  );
}
