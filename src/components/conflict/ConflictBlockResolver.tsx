import type { ConflictFileData } from "../../types/git";

export function buildUseBothResult(file: ConflictFileData) {
  const local = file.local ?? "";
  const remote = file.remote ?? "";
  return `${local}\n\n/* ===== Git Visualizer: Remote / Incoming version below. Review for duplicates. ===== */\n\n${remote}`;
}

export function ConflictBlockResolver() {
  return (
    <div className="conflict-note">
      Git accepts any final file content after it is saved and staged. Please make sure the result is logically correct before
      continuing the operation.
    </div>
  );
}
