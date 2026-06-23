"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

const importantRoutes = ["/game", "/squad", "/leaderboard", "/profile"];

function shouldIgnore(element: HTMLElement) {
  return (
    element.hasAttribute("data-no-auto-loading") ||
    element.getAttribute("aria-disabled") === "true" ||
    element.getAttribute("disabled") !== null ||
    element.closest("[data-no-auto-loading]")
  );
}

export function GlobalClickFeedback() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const element = target?.closest("button, a") as HTMLElement | null;
      if (!element) return;

      if (element.getAttribute("data-click-disabled") === "true") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (shouldIgnore(element)) return;

      element.classList.add("is-click-loading");

      if (element.tagName === "BUTTON") {
        element.setAttribute("data-click-disabled", "true");
        element.setAttribute("aria-disabled", "true");
      }

      window.setTimeout(() => {
        element.classList.remove("is-click-loading");
        if (element.getAttribute("data-click-disabled") === "true") {
          element.removeAttribute("data-click-disabled");
          element.removeAttribute("aria-disabled");
        }
      }, 1200);
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}

export function ImportantRoutePrefetcher() {
  const router = useRouter();

  useEffect(() => {
    importantRoutes.forEach((route) => router.prefetch(route));
  }, [router]);

  return null;
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
