import { BaseEdge, type EdgeProps } from "@xyflow/react";

export function GitEdge(props: EdgeProps) {
  const isMerge = props.data?.kind === "merge";
  const sameLane = props.data?.sameLane === true;

  if (sameLane) {
    return (
      <BaseEdge
        id={props.id}
        path={`M ${props.sourceX},${props.sourceY} L ${props.targetX},${props.targetY}`}
        className={isMerge ? "graph-edge graph-edge-merge" : "graph-edge graph-edge-primary"}
        style={props.style}
      />
    );
  }

  const path = roundedOrthogonalPath(props.sourceX, props.sourceY, props.targetX, props.targetY, isMerge ? 12 : 16);

  return (
    <BaseEdge
      id={props.id}
      path={path}
      className={isMerge ? "graph-edge graph-edge-merge" : "graph-edge graph-edge-primary"}
      style={props.style}
    />
  );
}

function roundedOrthogonalPath(sourceX: number, sourceY: number, targetX: number, targetY: number, radius: number) {
  const direction = targetX >= sourceX ? 1 : -1;
  const absDx = Math.abs(targetX - sourceX);
  const absDy = Math.abs(targetY - sourceY);
  const horizontalRadius = Math.min(radius, Math.max(2, absDx / 2));
  const verticalRadius = Math.min(radius, Math.max(2, absDy / 2));
  const midX = sourceX + direction * Math.max(34, absDx * 0.5);
  const yDirection = targetY >= sourceY ? 1 : -1;

  return [
    `M ${sourceX},${sourceY}`,
    `L ${midX - direction * horizontalRadius},${sourceY}`,
    `Q ${midX},${sourceY} ${midX},${sourceY + yDirection * verticalRadius}`,
    `L ${midX},${targetY - yDirection * verticalRadius}`,
    `Q ${midX},${targetY} ${midX + direction * horizontalRadius},${targetY}`,
    `L ${targetX},${targetY}`
  ].join(" ");
}
