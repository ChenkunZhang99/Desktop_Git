import type { CSSProperties } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import type { BranchRailNodeData } from "./graphLayout";

type BranchRailReactFlowNode = Node<BranchRailNodeData, "branchRail">;

export function BranchRail({ data }: NodeProps<BranchRailReactFlowNode>) {
  return (
    <div
      className={data.isCurrent ? "branch-rail current-branch-rail" : "branch-rail"}
      style={{ "--rail-color": data.color, height: data.height } as CSSProperties}
      aria-hidden="true"
    />
  );
}
