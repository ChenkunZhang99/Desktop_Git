import { describe, expect, it } from "vitest";
import { parseRemotes } from "../electron/git/remoteService";

describe("parseRemotes", () => {
  it("groups fetch and push URLs by remote name", () => {
    const remotes = parseRemotes([
      "origin\tgit@github.com:me/repo.git (fetch)",
      "origin\tgit@github.com:me/repo.git (push)",
      "upstream\thttps://github.com/org/repo.git (fetch)"
    ].join("\n"));

    expect(remotes).toEqual([
      {
        name: "origin",
        fetchUrl: "git@github.com:me/repo.git",
        pushUrl: "git@github.com:me/repo.git"
      },
      {
        name: "upstream",
        fetchUrl: "https://github.com/org/repo.git"
      }
    ]);
  });
});
