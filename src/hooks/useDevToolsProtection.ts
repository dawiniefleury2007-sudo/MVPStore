
import { useEffect } from "react";

export function useDevToolsProtection() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      // Block F12
      if (event.key === "F12") {
        event.preventDefault();
        event.stopPropagation();
      }

      // Block Ctrl+Shift+I / J / C
      if (
        event.ctrlKey &&
        event.shiftKey &&
        ["i", "j", "c"].includes(key)
      ) {
        event.preventDefault();
        event.stopPropagation();
      }

      // Block Ctrl+U (View Source)
      if (event.ctrlKey && key === "u") {
        event.preventDefault();
        event.stopPropagation();
      }

      // Block Cmd+Option+I on macOS
      if (
        event.metaKey &&
        event.altKey &&
        ["i", "j", "c"].includes(key)
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);
}
