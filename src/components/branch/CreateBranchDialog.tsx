import { useState } from "react";

interface CreateBranchDialogProps {
  startPoint?: string;
  onCreate: (name: string, startPoint?: string) => void;
}

export function CreateBranchDialog({ startPoint, onCreate }: CreateBranchDialogProps) {
  const [name, setName] = useState("");
  return (
    <form
      className="create-branch"
      onSubmit={(event) => {
        event.preventDefault();
        if (name.trim()) {
          onCreate(name.trim(), startPoint);
          setName("");
        }
      }}
    >
      <input value={name} onChange={(event) => setName(event.target.value)} placeholder="new-branch-name" />
      <button>Create</button>
    </form>
  );
}
