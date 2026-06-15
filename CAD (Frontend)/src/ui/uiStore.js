// src/ui/uiStore.js
// Lightweight, dependency-free UI layer for toasts + modal dialogs that
// replaces the native prompt()/alert()/confirm() calls. Exposes both a zustand
// store (for the <UIHost/> renderer) and imperative helpers usable from any
// code (React or not): notify(), confirmDialog(), promptDialog().

import { create } from 'zustand';

let _id = 0;
const nextId = () => ++_id;

export const useUIStore = create((set, get) => ({
  toasts: [],
  dialog: null, // { type: 'confirm'|'prompt', title, message, defaultValue, resolve }

  pushToast: (message, type = 'info', timeout = 3200) => {
    const id = nextId();
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    if (timeout > 0) {
      setTimeout(() => get().dismissToast(id), timeout);
    }
    return id;
  },
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  openDialog: (dialog) => set({ dialog }),
  resolveDialog: (value) => {
    const d = get().dialog;
    if (d?.resolve) d.resolve(value);
    set({ dialog: null });
  },
}));

// ---- imperative helpers (work outside React components) --------------------

export function notify(message, type = 'info', timeout = 3200) {
  return useUIStore.getState().pushToast(message, type, timeout);
}

export function confirmDialog({ title = 'Confirm', message = '', confirmLabel = 'OK', cancelLabel = 'Cancel' } = {}) {
  return new Promise((resolve) => {
    useUIStore.getState().openDialog({
      type: 'confirm',
      title,
      message,
      confirmLabel,
      cancelLabel,
      resolve,
    });
  });
}

export function promptDialog({ title = 'Input', message = '', defaultValue = '', confirmLabel = 'OK', cancelLabel = 'Cancel' } = {}) {
  return new Promise((resolve) => {
    useUIStore.getState().openDialog({
      type: 'prompt',
      title,
      message,
      defaultValue,
      confirmLabel,
      cancelLabel,
      resolve,
    });
  });
}
