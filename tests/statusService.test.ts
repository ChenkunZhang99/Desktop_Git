import { describe, expect, it } from "vitest";
import { parsePorcelainStatus } from "../electron/git/statusService";

describe("parsePorcelainStatus", () => {
  it("groups staged, unstaged, untracked, and conflicted files", () => {
    const status = parsePorcelainStatus(["M  staged.ts", " M changed.ts", "?? new.ts", "UU conflict.ts"].join("\n"));

    expect(status.staged.map((file) => file.path)).toEqual(["staged.ts"]);
    expect(status.unstaged.map((file) => file.path)).toEqual(["changed.ts"]);
    expect(status.untracked.map((file) => file.path)).toEqual(["new.ts"]);
    expect(status.conflicted.map((file) => file.path)).toEqual(["conflict.ts"]);
  });

  it("parses renamed paths", () => {
    const status = parsePorcelainStatus("R  old.ts -> new.ts");
    expect(status.files[0].originalPath).toBe("old.ts");
    expect(status.files[0].path).toBe("new.ts");
  });
});
