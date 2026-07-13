import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "program-editor-block-sidebar-collapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function useBlockSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(readCollapsed);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  const toggle = useCallback(() => setCollapsed((v) => !v), []);

  return { collapsed, setCollapsed, toggle };
}

export type UndoEntry = {
  id: string;
  label: string;
  undo: () => Promise<void>;
};

export function useProgramEditorUndo() {
  const [stack, setStack] = useState<UndoEntry[]>([]);
  const [isUndoing, setIsUndoing] = useState(false);

  const push = useCallback((entry: Omit<UndoEntry, "id">) => {
    setStack((prev) => [
      ...prev.slice(-19),
      {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      },
    ]);
  }, []);

  const canUndo = stack.length > 0 && !isUndoing;

  const undo = useCallback(async () => {
    if (stack.length === 0 || isUndoing) return;
    const entry = stack[stack.length - 1];
    setIsUndoing(true);
    setStack((prev) => prev.slice(0, -1));
    try {
      await entry.undo();
    } finally {
      setIsUndoing(false);
    }
  }, [stack, isUndoing]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isUndo =
        (e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "z";
      if (!isUndo) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      void undo();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo]);

  return { canUndo, isUndoing, push, undo, stackSize: stack.length };
}
