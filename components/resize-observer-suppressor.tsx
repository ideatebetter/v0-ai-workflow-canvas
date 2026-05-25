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
    // Capture errors at the earliest possible phase
    const errorHandler = (event: ErrorEvent) => {
      if (
        event.message?.includes("ResizeObserver loop") ||
        event.error?.message?.includes("ResizeObserver loop")
      ) {
        event.stopImmediatePropagation();
        event.preventDefault();
        return;
      }
    };

    // Handle unhandled rejections that might contain this error
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      const message = event.reason?.message || String(event.reason);
      if (message?.includes("ResizeObserver loop")) {
        event.preventDefault();
        return;
      }
    };

    // Use capture phase to intercept errors before they propagate
    window.addEventListener("error", errorHandler, true);
    window.addEventListener("unhandledrejection", rejectionHandler, true);

    // Override the global ResizeObserver to wrap callbacks with error suppression
    const OriginalResizeObserver = window.ResizeObserver;
    window.ResizeObserver = class SuppressedResizeObserver extends OriginalResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        super((entries, observer) => {
          // Use requestAnimationFrame to defer the callback and prevent the loop warning
          window.requestAnimationFrame(() => {
            try {
              callback(entries, observer);
            } catch {
              // Silently ignore ResizeObserver errors
            }
          });
        });
      }
    };

    return () => {
      window.removeEventListener("error", errorHandler, true);
      window.removeEventListener("unhandledrejection", rejectionHandler, true);
      window.ResizeObserver = OriginalResizeObserver;
    };
  }, []);

  return null;
}
