"use client";

import { createContext, useContext } from "react";

interface CanvasNodeActionsContextValue {
  onCopyNodeLink: (nodeId: string) => void;
}

export const CanvasNodeActionsContext = createContext<CanvasNodeActionsContextValue>({
  onCopyNodeLink: () => {},
});

export const CanvasNodeActionsProvider = CanvasNodeActionsContext.Provider;

export function useCanvasNodeActions() {
  return useContext(CanvasNodeActionsContext);
}
