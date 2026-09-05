"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Dark or light.
 *
 * Applied immediately to the document and saved to the account afterwards, so
 * the switch feels instant and still follows the user to another machine. The
 * network call is deliberately not awaited before the UI changes - a theme
 * toggle that waits on a round trip feels broken.
 */
export function ThemeToggle({
  initial = "dark",
}: {
  initial?: "dark" | "light";
}) {
  const [theme, setTheme] = useState<"dark" | "light">(initial);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("light", theme === "light");
    root.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("theme", theme);
    } catch {
      /* private browsing; the account copy still holds it */
    }
  }, [theme]);

  return (
    <Button
      variant="outline"
      size="icon-sm"
      aria-label={theme === "dark" ? "Switch to light" : "Switch to dark"}
      onClick={() => {
        const next = theme === "dark" ? "light" : "dark";
        setTheme(next);
        fetch("/api/account", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme: next }),
        }).catch(() => {
          /* Saved locally either way; the preference is not worth an error toast. */
        });
      }}
    >
      {theme === "dark" ? (
        <Sun className="h-3.5 w-3.5" />
      ) : (
        <Moon className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}

/**
 * Applies the saved theme before the page paints.
 *
 * Rendered as a raw script in the document head. React cannot do this - by the
 * time it hydrates the wrong theme has already been shown, and a white flash on
 * a dark app is the most noticeable defect a user will find.
 */
export function ThemeScript() {
  const script = `
    try {
      var t = localStorage.getItem('theme') || 'dark';
      document.documentElement.classList.add(t);
      document.documentElement.classList.remove(t === 'dark' ? 'light' : 'dark');
    } catch (e) {
      document.documentElement.classList.add('dark');
    }
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
