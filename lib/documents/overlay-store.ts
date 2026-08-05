import { create } from "zustand"

interface DocumentOverlayState {
  openDocId: string | null
  open: (docId: string) => void
  close: () => void
}

export const useDocumentOverlayStore = create<DocumentOverlayState>()((set) => ({
  openDocId: null,
  open: (docId) => set({ openDocId: docId }),
  close: () => set({ openDocId: null }),
}))
