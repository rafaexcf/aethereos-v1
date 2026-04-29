import { useState } from "react";

interface NotepadProps {
  windowId: string;
  onClose: () => void;
}

export function Notepad({ windowId, onClose }: NotepadProps) {
  const [text, setText] = useState("");

  return (
    <div
      className="absolute flex flex-col overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-900/95 shadow-2xl"
      style={{
        inset: "10%",
        zIndex: 110,
      }}
      data-window-id={windowId}
    >
      <div className="flex shrink-0 items-center gap-3 border-b border-zinc-700/50 px-4 py-2">
        <button
          type="button"
          onClick={onClose}
          className="h-3 w-3 rounded-full bg-red-500 transition-colors hover:bg-red-400"
          aria-label="Fechar"
        />
        <span className="flex-1 text-center text-sm font-medium text-zinc-300">
          Bloco de Notas
        </span>
      </div>
      <textarea
        className="flex-1 resize-none bg-transparent p-4 text-sm text-zinc-200 outline-none placeholder:text-zinc-600"
        placeholder="Comece a escrever…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
      />
      <div className="flex shrink-0 items-center justify-end border-t border-zinc-700/50 px-4 py-1.5">
        <span className="text-xs text-zinc-600">
          {text.length} caractere{text.length !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
