"use client";

import { createContext, useContext } from "react";

interface ConnectionContextValue {
  altConnectMode: boolean;
  altConnectSource: string | null;
}

export const ConnectionContext = createContext<ConnectionContextValue>({
  altConnectMode: false,
  altConnectSource: null,
});

export function useConnectionContext() {
  return useContext(ConnectionContext);
}
