export const branchColors = ["#4cc9f0", "#80ffdb", "#ffb703", "#fb8500", "#e63946", "#a7c957", "#f72585"];

export function colorForIndex(index: number) {
  return branchColors[index % branchColors.length];
}
