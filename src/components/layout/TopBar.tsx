import { useState } from "react";
import type { RemoteInfo, RepositoryInfo } from "../../types/git";

interface TopBarProps {
  repo: RepositoryInfo;
  remotes: RemoteInfo[];
  busy: boolean;
  onOpenRepository: () => void;
  onRefresh: () => void;
  onFetch: () => void;
  onPull: () => void;
  onPush: () => void;
  onAddRemote: (name: string, url: string) => void;
  onForkSetup: (originUrl: string, pushCurrentBranch: boolean) => void;
}

export function TopBar({
  repo,
  remotes,
  busy,
  onOpenRepository,
  onRefresh,
  onFetch,
  onPull,
  onPush,
  onAddRemote,
  onForkSetup
}: TopBarProps) {
  const [remoteMenuOpen, setRemoteMenuOpen] = useState(false);
  const [remoteName, setRemoteName] = useState("myfork");
  const [remoteUrl, setRemoteUrl] = useState("");
  const [forkUrl, setForkUrl] = useState("");
  const [pushForkBranch, setPushForkBranch] = useState(true);
  const canForkSetup = remotes.some((remote) => remote.name === "origin") && !remotes.some((remote) => remote.name === "upstream");
  const remoteNameValid = /^[A-Za-z0-9._-]+$/.test(remoteName.trim());
  const remoteUrlValid = remoteUrl.trim().length > 0 && !/\s/.test(remoteUrl.trim());
  const remoteNameDuplicate = remotes.some((remote) => remote.name === remoteName.trim());

  return (
    <header className="topbar">
      <div>
        <strong>Git Visualizer</strong>
        <span className="branch-pill">{repo.currentBranch}</span>
      </div>
      <div className="topbar-actions">
        <button onClick={onOpenRepository}>Open Repository</button>
        <button disabled={busy} onClick={onRefresh}>
          Refresh
        </button>
        <button disabled={busy} onClick={onFetch}>
          Fetch
        </button>
        <button disabled={busy} onClick={onPull}>
          Pull
        </button>
        <button disabled={busy} onClick={onPush}>
          Push
        </button>
        <div className="remote-menu-wrap">
          <button disabled={busy} onClick={() => setRemoteMenuOpen((open) => !open)}>
            Remote ▾
          </button>
          {remoteMenuOpen ? (
            <div className="remote-backdrop" onClick={() => setRemoteMenuOpen(false)}>
              <aside className="remote-drawer" onClick={(event) => event.stopPropagation()}>
                <div className="remote-drawer-header">
                  <div>
                    <strong>Remote Manager</strong>
                    <span>Credentials stay in system Git / Keychain.</span>
                  </div>
                  <button onClick={() => setRemoteMenuOpen(false)}>Close</button>
                </div>
                <div className="remote-menu-section">
                  <strong>Configured Remotes</strong>
                  {remotes.length === 0 ? <span className="muted">No remotes configured.</span> : null}
                  {remotes.map((remote) => (
                    <span key={remote.name} title={remote.fetchUrl ?? remote.pushUrl}>
                      {remote.name}
                    </span>
                  ))}
                </div>
                <form
                  className="remote-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (busy || !remoteNameValid || !remoteUrlValid || remoteNameDuplicate) return;
                    onAddRemote(remoteName.trim(), remoteUrl.trim());
                    setRemoteUrl("");
                  }}
                >
                  <strong>Add Remote</strong>
                  <input value={remoteName} onChange={(event) => setRemoteName(event.target.value)} placeholder="myfork" />
                  <input value={remoteUrl} onChange={(event) => setRemoteUrl(event.target.value)} placeholder="git@github.com:you/repo.git" />
                  <code>git remote add {remoteName.trim() || "<name>"} {remoteUrl.trim() || "<url>"}</code>
                  {remoteName.trim() && !remoteNameValid ? (
                    <span className="form-hint form-hint-error">Use letters, digits, dot, underscore, hyphen only.</span>
                  ) : remoteNameDuplicate ? (
                    <span className="form-hint form-hint-error">Remote "{remoteName.trim()}" already exists.</span>
                  ) : null}
                  <button
                    disabled={busy || !remoteNameValid || !remoteUrlValid || remoteNameDuplicate}
                    title={
                      !remoteNameValid
                        ? "Invalid remote name."
                        : remoteNameDuplicate
                        ? "A remote with that name already exists."
                        : !remoteUrlValid
                        ? "Enter a non-empty URL with no whitespace."
                        : undefined
                    }
                  >
                    git remote add
                  </button>
                </form>
                <form
                  className="remote-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (busy || !forkUrl.trim() || !canForkSetup) return;
                    if (confirm("Fork setup renames origin to upstream and adds your URL as origin. Continue?")) {
                      onForkSetup(forkUrl.trim(), pushForkBranch);
                      setForkUrl("");
                    }
                  }}
                >
                  <strong>Fork Setup</strong>
                  <input value={forkUrl} onChange={(event) => setForkUrl(event.target.value)} placeholder="your fork URL as new origin" />
                  <code>remote rename origin upstream → remote add origin &lt;url&gt;</code>
                  <label className="remote-checkbox">
                    <input type="checkbox" checked={pushForkBranch} onChange={(event) => setPushForkBranch(event.target.checked)} />
                    Push current branch
                  </label>
                  <button
                    disabled={busy || !canForkSetup || !forkUrl.trim()}
                    title={canForkSetup ? undefined : "Requires origin and no existing upstream."}
                  >
                    Convert origin/upstream
                  </button>
                </form>
              </aside>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
