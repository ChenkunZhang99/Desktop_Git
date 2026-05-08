import { describe, expect, it } from "vitest";
import { parseCommitLog } from "../electron/git/logService";

describe("parseCommitLog", () => {
  it("parses machine-readable git log records", () => {
    const refs = new Map([["abc123456789", ["main"]]]);
    const commits = parseCommitLog("abc123456789\u001fparent1 parent2\u001fAda\u001fada@example.com\u001f2026-01-01 10:00:00 +0000\u001fInitial commit\u001e", refs);

    expect(commits[0]).toMatchObject({
      hash: "abc123456789",
      shortHash: "abc12345",
      parents: ["parent1", "parent2"],
      authorName: "Ada",
      refs: ["main"]
    });
  });
});
