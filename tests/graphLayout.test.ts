import { describe, expect, it } from "vitest";
import type { BranchInfo, CommitInfo, RepositoryInfo } from "../src/types/git";
import { assignCommitColumns, assignCommitLanes } from "../src/components/graph/graphLayout";

function commit(hash: string, parents: string[] = []): CommitInfo {
  return {
    hash,
    shortHash: hash.slice(0, 8),
    parents,
    authorName: "Test",
    authorEmail: "test@example.com",
    date: "2026-01-01",
    message: hash,
    refs: []
  };
}

const repo: RepositoryInfo = {
  root: "/repo",
  gitDir: "/repo/.git",
  currentBranch: "main",
  headHash: "m1",
  isInsideWorkTree: true
};

describe("assignCommitLanes", () => {
  it("keeps a first-parent chain on the same lane", () => {
    const lanes = assignCommitLanes([commit("m1", ["m0"]), commit("m0", ["root"]), commit("root")], [], repo);

    expect(lanes.get("m1")).toBe(lanes.get("m0"));
    expect(lanes.get("m0")).toBe(lanes.get("root"));
  });

  it("moves merge parents onto a side lane", () => {
    const branches: BranchInfo[] = [
      { name: "main", hash: "merge", isCurrent: true, isRemote: false },
      { name: "feature", hash: "f1", isCurrent: false, isRemote: false }
    ];
    const lanes = assignCommitLanes([commit("merge", ["m1", "f1"]), commit("f1", ["root"]), commit("m1", ["root"]), commit("root")], branches, {
      ...repo,
      headHash: "merge"
    });

    expect(lanes.get("merge")).toBe(lanes.get("m1"));
    expect(lanes.get("f1")).not.toBe(lanes.get("merge"));
  });
});

describe("assignCommitColumns", () => {
  it("places descendants to the right of their parents", () => {
    const columns = assignCommitColumns([commit("tip", ["mid"]), commit("mid", ["root"]), commit("root")]);

    expect(columns.get("root")).toBeLessThan(columns.get("mid")!);
    expect(columns.get("mid")).toBeLessThan(columns.get("tip")!);
  });
});
