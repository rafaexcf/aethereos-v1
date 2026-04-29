import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dock, Mesa, WindowManager, applyTheme } from "@aethereos/ui-shell";
import type { DockItem, MesaWidget } from "@aethereos/ui-shell";
import { useBootResult } from "../lib/boot-context";
import { useWindowsStore } from "../stores/windows";
import { Notepad } from "./notepad/index";

const DOCK_ITEMS: DockItem[] = [
  { id: "notepad", label: "Bloco de Notas", icon: "📝", appId: "notepad" },
  { id: "settings", label: "Configurações", icon: "⚙️", appId: "settings" },
  { id: "about", label: "Sobre", icon: "ℹ️", appId: "about" },
];

function WelcomeWidget({
  isFirstRun,
  backend,
}: {
  isFirstRun: boolean;
  backend: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="font-semibold text-[var(--ae-fg)]">
        {isFirstRun ? "Bem-vindo ao Aethereos" : "Bem-vindo de volta"}
      </p>
      <p className="text-xs text-[var(--ae-muted-fg)]">
        OS B2B local-first · sem backend obrigatório
      </p>
      <p className="mt-1 text-xs text-[var(--ae-muted-fg)]">
        Armazenamento: <span className="font-mono">{backend}</span>
      </p>
    </div>
  );
}

function QuickTipWidget() {
  return (
    <div className="flex flex-col gap-1">
      <p className="font-semibold text-[var(--ae-fg)]">Dica rápida</p>
      <p className="text-xs text-[var(--ae-muted-fg)]">
        Clique em 📝 no dock para abrir o Bloco de Notas.
      </p>
      <p className="text-xs text-[var(--ae-muted-fg)]">
        Todos os dados ficam no seu navegador — sem servidor.
      </p>
    </div>
  );
}

export function ShellLayout() {
  const { isFirstRun, backend } = useBootResult();
  const navigate = useNavigate();
  const { windows, openWindow, closeWindow } = useWindowsStore();

  useEffect(() => {
    document.documentElement.classList.add("dark");
    applyTheme();
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, []);

  const handleDockClick = (item: DockItem) => {
    if (item.appId === "notepad") {
      openWindow("notepad");
    } else if (item.appId === "settings" || item.appId === "about") {
      void navigate({ to: "/settings/about" });
    }
  };

  const dockItemsWithStatus: DockItem[] = DOCK_ITEMS.map((item) => ({
    ...item,
    isRunning: windows.some((w) => w.appId === item.appId),
  }));

  const mesaWidgets: MesaWidget[] = [
    {
      id: "welcome",
      col: 1,
      row: 1,
      colSpan: 4,
      rowSpan: 2,
      content: <WelcomeWidget isFirstRun={isFirstRun} backend={backend} />,
    },
    {
      id: "tip",
      col: 5,
      row: 1,
      colSpan: 4,
      rowSpan: 2,
      content: <QuickTipWidget />,
    },
  ];

  return (
    <div className="relative flex h-full flex-col bg-[var(--ae-bg)]">
      <div className="relative flex-1 overflow-hidden">
        <Mesa widgets={mesaWidgets} columns={12} />
        <WindowManager windows={[]}>
          {windows.map((win) => {
            if (win.appId === "notepad") {
              return (
                <Notepad
                  key={win.id}
                  windowId={win.id}
                  onClose={() => closeWindow(win.id)}
                />
              );
            }
            return null;
          })}
        </WindowManager>
      </div>
      <div className="flex shrink-0 items-center justify-center py-3">
        <Dock
          items={dockItemsWithStatus}
          position="bottom"
          onItemClick={handleDockClick}
        />
      </div>
    </div>
  );
}
