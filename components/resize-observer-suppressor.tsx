"use client";

import { useEffect } from "react";

/**
 * Suppresses the benign "ResizeObserver loop completed with undelivered notifications" error.
 * This error is caused by ResizeObserver callbacks triggering layout changes that cause
 * more resize observations. It's a known issue with React Flow and other libraries
 * that use ResizeObserver, and is safe to ignore.
 * 
 * See: https://github.com/WICG/resize-observer/issues/38
 */
export function ResizeObserverErrorSuppressor() {
  useEffect(() => {
    const errorHandler = (event: ErrorEvent) => {
      if (event.message?.includes("ResizeObserver loop")) {
        event.stopImmediatePropagation();
        event.preventDefault();
        return true;
      }
    };

    // Also handle unhandled rejections that might contain this error
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes("ResizeObserver loop")) {
        event.preventDefault();
        return true;
      }
    };

    window.addEventListener("error", errorHandler);
    window.addEventListener("unhandledrejection", rejectionHandler);

    return () => {
      window.removeEventListener("error", errorHandler);
      window.removeEventListener("unhandledrejection", rejectionHandler);
    };
  }, []);

  return null;
}
