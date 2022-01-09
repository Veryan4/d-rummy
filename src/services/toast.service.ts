import { Toast } from "../models/toast.model";

export const toastService = {newToast, newError}

function newToast(key: string): void {
    const toast: Toast = {
      type: "success",
      duration: 3000,
      key
    }
    window.dispatchEvent(new CustomEvent('toast', {
        detail: toast
    }))
}

function newError(key: string): void {
  const toast: Toast = {
    type: "error",
    duration: 3000,
    key
  }
  window.dispatchEvent(new CustomEvent('toast', {
      detail: toast
  }))
}