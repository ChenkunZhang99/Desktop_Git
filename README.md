# Git Visualizer

A local-first desktop Git GUI built with Electron, React, TypeScript, Vite, Monaco Editor, and React Flow.

Git Visualizer is designed as a dark, VS Code-like Git cockpit: open a local repository, inspect branch history, view diffs, run common Git operations, and resolve conflicts without leaving the app.

## Highlights

- Open and validate local Git repositories.
- Visualize commit history with branch lanes, commit nodes, parent edges, HEAD markers, and branch labels.
- Inspect working tree status, changed files, staged files, and repository files.
- View diffs and commit details with Monaco Editor.
- Stage, unstage, discard, commit staged changes, or one-click add-all-and-commit.
- Create, switch, delete, merge, fetch, pull, and push branches.
- Add remotes and set up fork workflows without storing credentials.
- Detect merge, rebase, cherry-pick, and unmerged-file conflict states.
- Resolve conflict files inside the app with local, remote, both, or manual result workflows.
- Use a guarded in-app Git terminal for non-destructive Git commands.

## Tech Stack

- Electron for the desktop shell and privileged filesystem/Git operations.
- React + TypeScript + Vite for the renderer UI.
- Monaco Editor for file, diff, and conflict editing surfaces.
- `@xyflow/react` for the interactive commit graph canvas.
- Node.js `child_process.spawn` for all Git commands.
- Plain CSS for the dark interface and graph styling.

## Installation

Requirements:

- Node.js 20 or newer is recommended.
- Git must be installed and available on your `PATH`.
- For HTTPS remotes, use system Git Credential Manager.
- For SSH remotes, configure your SSH key and SSH agent outside this app.

Install dependencies:

```bash
npm install
```

## Development

Run the Electron + Vite development app:

```bash
npm run dev
```

The dev script starts Vite, compiles the Electron main/preload TypeScript files, waits for the local dev server, and launches Electron.

If you change Electron main process or preload code, restart `npm run dev`. Renderer-only changes usually hot reload.

## Build

Compile the renderer and Electron files:

```bash
npm run build
```

Run type checks:

```bash
npm run typecheck
```

Run tests:

```bash
npm test
```

Note: this project currently builds the app code, but does not yet include an installer/package script such as `electron-builder` or `electron-forge`.

## Project Structure

```text
git-visualizer/
  electron/
    main.ts
    preload.ts
    ipc.ts
    git/
      gitRunner.ts
      repoService.ts
      statusService.ts
      logService.ts
      diffService.ts
      branchService.ts
      conflictService.ts
      operationService.ts
      remoteService.ts
      terminalService.ts
    utils/
      pathSafety.ts
      gitState.ts
  src/
    App.tsx
    main.tsx
    components/
      branch/
      commit/
      conflict/
      diff/
      graph/
      layout/
      repo/
      status/
    styles/
      global.css
    types/
  tests/
```

## Architecture

Git Visualizer keeps a strict Electron boundary:

- The renderer is UI-only.
- Filesystem access and Git commands live in the Electron main process.
- Renderer-to-main communication uses a typed preload IPC API.
- Git commands are executed with `spawn("git", args, { cwd: repoRoot })`.
- User input is passed as argument arrays, not interpolated into shell strings.
- File paths are validated before reading or writing.
- Conflict resolution writes are restricted to files inside the selected repository root.

## Supported Git Features

Repository:

- Open a local repository with a native dialog.
- Resolve the real Git root and real Git directory.
- Support worktrees and submodules where `.git` may be a file instead of a directory.
- Display repository root, current branch, and HEAD state.

Status and diffs:

- Read `git status --porcelain=v1`.
- Show changed, staged, untracked, deleted, renamed, and conflicted files.
- Stage and unstage individual files.
- Stage all changed files with `git add -A`.
- Discard file changes with confirmation.
- Show working and staged diffs.

History and branches:

- Parse machine-readable `git log --all --parents` output.
- Render commits, parent edges, branch labels, HEAD, and latest markers.
- Create branches from the current position or a selected commit.
- Switch local branches.
- Track and switch remote branches.
- Delete local branches with Git's safe `branch -d` behavior.
- Merge a selected branch or commit into the current branch.

Remote operations:

- Fetch.
- Pull with fast-forward preference.
- Push current branch.
- Add remotes.
- Convert a cloned upstream repository into a fork workflow.

Terminal:

- Run guarded Git commands from an in-app terminal.
- Command history supports up/down recall.
- `Ctrl+L` clears the transcript.
- Shell operators and high-risk destructive commands are blocked.

## Conflict Resolver Workflow

When a pull, merge, rebase, or cherry-pick produces conflicts, Git Visualizer detects the state and opens the Conflict Resolver.

1. Select a conflicted file.
2. Review the current file content with conflict markers.
3. Inspect Git index stages where available:
   - Base: `git show :1:path`
   - Local / Current Branch: `git show :2:path`
   - Remote / Incoming: `git show :3:path`
4. Choose one of the resolution helpers:
   - Use Local
   - Use Remote
   - Use Both
   - Manual Edit
5. Edit the Result panel in Monaco.
6. Save Result to write the exact editor content back to the real file.
7. The app runs `git add path`.
8. The app verifies that Git no longer reports the file as unmerged.
9. When every conflicted file is resolved, continue merge, rebase, or cherry-pick.

Git accepts any final file content after it is saved and staged. The app helps with mechanics, but the user is still responsible for checking that the final code is logically correct.

## Authentication

Git Visualizer does not collect, store, or manage GitHub/GitLab passwords or tokens.

Authentication is intentionally delegated to system Git:

- HTTPS authentication should go through Git Credential Manager.
- SSH authentication should go through your SSH keys and SSH agent.
- The app can trigger Git commands that cause the system credential prompt to appear, but credentials are not saved inside the app.

If HTTPS push fails with an authentication error, configure Git Credential Manager or use an SSH remote:

```bash
git remote set-url origin git@github.com:USER/REPO.git
```

## Safety Notes

- Destructive actions require confirmation where implemented.
- `git reset --hard` is not implemented as a one-click operation.
- `git clean -fd` is not implemented as a one-click operation.
- The in-app terminal blocks shell operators and selected destructive Git commands.
- Branch deletion uses `git branch -d`, which refuses to delete unmerged local branches.
- The app does not bypass Git's own safety checks.

## Current Limitations

- Commit graph layout is still evolving. The current version uses branch lanes and custom edges, but it is not yet a full GitKraken-style lane solver.
- Packaged installers are not configured yet.
- Rebase is supported only for continuing or aborting an existing rebase/conflict flow.
- Advanced operations such as reset, clean, squash merge, interactive rebase, and force push are intentionally excluded from v0.1.
- Remote branch deletion and prune actions are planned but not fully polished.

## Scripts

```bash
npm run dev        # start Vite + Electron in development mode
npm run build      # typecheck and build renderer + Electron files
npm run typecheck  # run TypeScript checks
npm test           # run Vitest tests
```

## License

No license has been selected yet. Add a license before publishing if you want others to use, copy, or modify this project.
