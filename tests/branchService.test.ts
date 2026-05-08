import { describe, expect, it } from "vitest";
import { parseBranches } from "../electron/git/branchService";

describe("parseBranches", () => {
  it("separates local and remote refs without leaking format separators", () => {
    const output = [
      "refs/heads/master\tmaster\tabc123\torigin/master\t*",
      "refs/remotes/origin/master\torigin/master\tabc123\t\t",
      "refs/remotes/origin/feature/demo\torigin/feature/demo\tdef456\t\t"
    ].join("\n");

    const branches = parseBranches(output);

    expect(branches).toEqual([
      {
        name: "master",
        hash: "abc123",
        upstream: "origin/master",
        isCurrent: true,
        isRemote: false
      },
      {
        name: "origin/master",
        hash: "abc123",
        upstream: undefined,
        isCurrent: false,
        isRemote: true
      },
      {
        name: "origin/feature/demo",
        hash: "def456",
        upstream: undefined,
        isCurrent: false,
        isRemote: true
      }
    ]);
  });
});
