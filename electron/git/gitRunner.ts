import { spawn } from "node:child_process";
import { assertDirectory } from "../utils/pathSafety.js";
import type { GitCommandResult } from "../../src/types/git.js";

export interface RunGitOptions {
  /**
   * Hard timeout in milliseconds. The child process is killed when this
   * elapses. Network commands (fetch / push / pull / clone / ls-remote) get a
   * generous default; everything else uses a short default so a stuck local
   * command can't lock the UI forever.
   */
  timeoutMs?: number;
  /**
   * Capture mode for stdout. Defaults to utf-8 string. Pass "buffer" if a
   * caller needs to inspect raw bytes (e.g. -z output).
   */
  encoding?: "utf8" | "buffer";
}

const NETWORK_SUBCOMMANDS = new Set(["fetch", "push", "pull", "clone", "ls-remote"]);

function defaultTimeout(args: string[]): number {
  return args.some((arg) => NETWORK_SUBCOMMANDS.has(arg)) ? 120_000 : 30_000;
}

function buildEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    // Prevent git from blocking on a TTY prompt (e.g. HTTPS username/password).
    // The user is expected to use the system credential helper / SSH agent.
    GIT_TERMINAL_PROMPT: "0",
    // Stable, machine-readable output regardless of the user's locale.
    LC_ALL: "C.UTF-8",
    LANG: "C.UTF-8",
    // Avoid pager hangs (git diff/log will pipe through 'less' otherwise).
    GIT_PAGER: "cat",
    PAGER: "cat"
  };
}

export async function runGit(
  repoPath: string,
  args: string[],
  options: RunGitOptions = {}
): Promise<GitCommandResult> {
  const cwd = await assertDirectory(repoPath);
  const timeoutMs = options.timeoutMs ?? defaultTimeout(args);

  return new Promise((resolve) => {
    const child = spawn("git", args, {
      cwd,
      shell: false,
      windowsHide: true,
      env: buildEnv(),
      // Detach git from this process's stdin so a credential prompt cannot
      // hang waiting for input that will never arrive.
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    if (options.encoding !== "buffer") {
      child.stdout?.setEncoding("utf8");
    }
    child.stderr?.setEncoding("utf8");

    child.stdout?.on("data", (chunk: string | Buffer) => {
      stdout += typeof chunk === "string" ? chunk : chunk.toString("utf8");
    });
    child.stderr?.on("data", (chunk: string) => {
      stderr += chunk;
    });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      // Final fallback if the process refuses SIGTERM.
      setTimeout(() => {
        if (!child.killed) child.kill("SIGKILL");
      }, 2_000).unref();
    }, timeoutMs);
    timer.unref();

    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({
        success: false,
        command: "git",
        args,
        stdout,
        stderr: stderr ? `${stderr}\n${error.message}` : error.message,
        exitCode: -1
      });
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      const exitCode = code ?? -1;
      let finalStderr = stderr;
      if (timedOut) {
        finalStderr = `${finalStderr ? `${finalStderr}\n` : ""}git timed out after ${Math.round(timeoutMs / 1000)}s and was terminated (${signal ?? "SIGTERM"}).`;
      }
      resolve({
        success: exitCode === 0 && !timedOut,
        command: "git",
        args,
        stdout,
        stderr: finalStderr,
        exitCode
      });
    });
  });
}

export function requireGitSuccess(result: GitCommandResult, message: string): GitCommandResult {
  if (!result.success) {
    throw new Error(`${message}\n${result.stderr || result.stdout || "Git command failed."}`);
  }
  return result;
}
