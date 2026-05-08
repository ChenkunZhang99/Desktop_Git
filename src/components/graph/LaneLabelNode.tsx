import type { CSSProperties } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import type { LaneLabelNodeData } from "./graphLayout";

type LaneLabelReactFlowNode = Node<LaneLabelNodeData, "laneLabel">;

export function LaneLabelNode({ data }: NodeProps<LaneLabelReactFlowNode>) {
  const hiddenRefCount = Math.max(0, data.refs.length - 2);

  return (
    <div className={data.isCurrent ? "lane-label current-lane-label" : "lane-label"} style={{ "--lane-color": data.color } as CSSProperties}>
      <span className="lane-label-line" />
      <strong>{data.name}</strong>
      {hiddenRefCount > 0 ? <em>+{hiddenRefCount}</em> : null}
    </div>
  );
}
