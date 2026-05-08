import { describe, expect, it } from "vitest";
import { parseGitTerminalInput } from "../electron/git/terminalService";

describe("parseGitTerminalInput", () => {
  it("accepts git-prefixed and bare git commands", () => {
    expect(parseGitTerminalInput("git remote -v")).toEqual(["remote", "-v"]);
    expect(parseGitTerminalInput("status --short")).toEqual(["status", "--short"]);
  });

  it("blocks shell operators and destructive commands", () => {
    expect(() => parseGitTerminalInput("status; rm -rf /")).toThrow();
    expect(() => parseGitTerminalInput("reset --hard HEAD")).toThrow();
    expect(() => parseGitTerminalInput("push --force")).toThrow();
  });
});
