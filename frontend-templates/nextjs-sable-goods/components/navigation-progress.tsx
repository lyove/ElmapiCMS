"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function NavigationProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const prevRoute = useRef(routeKey);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const trickleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimers() {
    if (trickleRef.current) {
      clearInterval(trickleRef.current);
      trickleRef.current = null;
    }
    if (hideRef.current) {
      clearTimeout(hideRef.current);
      hideRef.current = null;
    }
  }

  function start() {
    clearTimers();
    setVisible(true);
    setProgress(12);
    trickleRef.current = setInterval(() => {
      setProgress((current) => {
        if (current >= 88) return current;
        const step = current < 40 ? 8 : current < 70 ? 4 : 1.5;
        return Math.min(88, current + step);
      });
    }, 320);
  }

  function finish() {
    clearTimers();
    setProgress(100);
    hideRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 280);
  }

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return;
      }
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;

      const next = `${url.pathname}?${url.searchParams.toString()}`;
      const current = `${window.location.pathname}?${window.location.search.replace(/^\?/, "")}`;
      if (next === current) return;

      start();
    }

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", start);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", start);
      clearTimers();
    };
  }, []);

  useEffect(() => {
    if (prevRoute.current === routeKey) return;
    prevRoute.current = routeKey;
    if (visible || progress > 0) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- finish only when route settles
  }, [routeKey]);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px]"
      aria-hidden
      role="presentation"
    >
      <div
        className="h-full bg-teal shadow-[0_0_10px_rgba(46,196,182,0.45)] transition-[width,opacity] duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  );
}

export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  );
}
