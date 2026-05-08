import { runGit } from "./gitRunner.js";

/**
 * Block list for the in-app Git terminal. Each rule is matched against a
 * tokenized argv (with the leading "git" stripped). A rule matches if the
 * subcommand equals `subcommand` and *any* argument matches one of `flags`.
 *
 * `flags` entries can be either an exact string (e.g. "--hard") or a RegExp
 * fragment compiled with the start anchor `^`. This catches concatenated short
 * flags such as `-fd`, `-fdx`, `--force-with-lease`, etc.
 */
interface BlockRule {
  subcommand: string;
  /** Match if any argv token matches one of these patterns. */
  flags: Array<string | RegExp>;
  reason: string;
}

const blockRules: BlockRule[] = [
  {
    subcommand: "reset",
    flags: ["--hard"],
    reason: "git reset --hard discards committed work and is disabled in the in-app terminal."
  },
  {
    subcommand: "clean",
    // Catches -f, -fd, -df, -fdx, -dfx, --force, etc.
    flags: [/^-[A-Za-z]*f[A-Za-z]*$/, "--force"],
    reason: "git clean with -f permanently deletes untracked files; use the file panel instead."
  },
  {
    subcommand: "push",
    flags: ["--force", "-f", "--force-with-lease", "--mirror"],
    reason: "force-pushing rewrites remote history and is disabled in the in-app terminal."
  },
  {
    subcommand: "branch",
    flags: ["-D"],
    reason: "branch -D force-deletes unmerged branches; delete via the branch panel after merging."
  },
  {
    subcommand: "checkout",
    flags: ["-f", "--force"],
    reason: "checkout --force overwrites uncommitted work and is disabled in the in-app terminal."
  },
  {
    subcommand: "filter-branch",
    flags: [/.*/],
    reason: "filter-branch rewrites history; run it from your system terminal if you understand the risk."
  },
  {
    subcommand: "update-ref",
    flags: ["-d"],
    reason: "update-ref -d removes refs and is disabled in the in-app terminal."
  }
];

export function parseGitTerminalInput(input: string): string[] {
  const args = tokenize(input.trim());
  if (args[0] === "git") {
    args.shift();
  }
  if (args.length === 0) {
    throw new Error("Enter a Git command, for example: status or git remote -v.");
  }
  if (args.some((arg) => /[;&|<>`$\n\r]/.test(arg))) {
    throw new Error("Shell operators are not supported. Enter Git arguments only.");
  }

  const subcommand = args[0];
  for (const rule of blockRules) {
    if (rule.subcommand !== subcommand) continue;
    const tripped = args.slice(1).some((arg) =>
      rule.flags.some((flag) => (flag instanceof RegExp ? flag.test(arg) : flag === arg))
    );
    if (tripped) {
      throw new Error(rule.reason);
    }
  }
  return args;
}

export async function runGitTerminalCommand(repoRoot: string, input: string) {
  return runGit(repoRoot, parseGitTerminalInput(input));
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: '"' | "'" | undefined;
  let escaping = false;

  for (const char of input) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }

    if (char === "\\" && quote !== "'") {
      escaping = true;
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = undefined;
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (quote) {
    throw new Error("Unclosed quote in command.");
  }
  if (escaping) {
    throw new Error("Trailing backslash in command.");
  }
  if (current) {
    tokens.push(current);
  }
  return tokens;
}
