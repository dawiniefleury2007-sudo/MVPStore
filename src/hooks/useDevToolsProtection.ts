import { useEffect } from "react";

export function useDevToolsProtection() {
  useEffect(() => {
    // Block F12 and common developer-tools shortcuts
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      if (
        event.key === "F12" ||
        (event.ctrlKey &&
          event.shiftKey &&
          ["i", "j", "c"].includes(key)) ||
        (event.ctrlKey && key === "u") ||
        (event.metaKey &&
          event.altKey &&
          ["i", "j", "c"].includes(key))
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    // Block right-click context menu
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    // Block long-press context menus on touch devices
    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length > 1) return;
    };

    const handleTouchMove = () => {
      // Movement cancels a long press naturally
    };

    const handleSelectStart = (event: Event) => {
      const target = event.target as HTMLElement | null;

      // Preserve text selection in inputs and editable fields
      if (
        target?.closest(
          'input, textarea, [contenteditable="true"]'
        )
      ) {
        return;
      }

      event.preventDefault();
    };

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("contextmenu", handleContextMenu, true);
    document.addEventListener("selectstart", handleSelectStart, true);

    // Disable native touch callout on supported mobile browsers
    const style = document.createElement("style");
    style.id = "mvpstore-protection-styles";
    style.textContent = `
      body {
        -webkit-touch-callout: none;
      }
      img {
        -webkit-user-drag: none;
        user-select: none;
      }
    `;

    if (!document.getElementById(style.id)) {
      document.head.appendChild(style);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("contextmenu", handleContextMenu, true);
      document.removeEventListener("selectstart", handleSelectStart, true);
      style.remove();
    };
  }, []);
}
