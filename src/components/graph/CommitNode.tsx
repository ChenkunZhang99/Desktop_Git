import type { CSSProperties } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import type { CommitNodeData } from "./graphLayout";

type CommitReactFlowNode = Node<CommitNodeData, "commit">;

export function CommitNode({ data }: NodeProps<CommitReactFlowNode>) {
  const commit = data.commit;
  const visibleRefs = commit.refs.slice(0, 2);
  const hiddenRefCount = Math.max(0, commit.refs.length - visibleRefs.length);
  const className = [
    "commit-node",
    data.selected ? "selected-commit-node" : "",
    data.isHead ? "head-commit-node" : "",
    data.isCurrentBranchHead ? "current-branch-node" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className} style={{ "--node-color": data.color } as CSSProperties}>
      <Handle id="top" type="source" position={Position.Top} />
      <Handle id="top-target" type="target" position={Position.Top} />
      <Handle id="left-source" type="source" position={Position.Left} />
      <Handle id="left" type="target" position={Position.Left} />
      <Handle id="right" type="source" position={Position.Right} />
      <Handle id="right-target" type="target" position={Position.Right} />
      <div className="commit-dot" />
      <div className="commit-copy">
        <div className="commit-flags">
          {data.isHead ? <b>HEAD</b> : null}
          {data.isCurrentBranchHead && !data.isHead ? <b>Current</b> : null}
          {data.isLatest ? <b>Latest</b> : null}
        </div>
        <strong>{commit.message}</strong>
        <span>
          {commit.shortHash} · {commit.authorName}
        </span>
        {commit.refs.length > 0 ? (
          <div className="commit-refs">
            {visibleRefs.map((ref) => (
              <em key={ref}>{ref.replace("remotes/", "")}</em>
            ))}
            {hiddenRefCount > 0 ? <em title={commit.refs.join(", ")}>+{hiddenRefCount}</em> : null}
          </div>
        ) : null}
      </div>
      <Handle id="bottom" type="source" position={Position.Bottom} />
      <Handle id="bottom-target" type="target" position={Position.Bottom} />
    </div>
  );
}
