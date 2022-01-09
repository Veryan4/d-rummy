import { Toast } from "../models/toast.model";

const TOAST_EVENT = "toast";

export const toastService = { newToast, newError, TOAST_EVENT };

function newToast(key: string): void {
  const toast: Toast = {
    type: "success",
    duration: 3000,
    key,
  };
  window.dispatchEvent(
    new CustomEvent(TOAST_EVENT, {
      detail: toast,
    })
  );
}

function newError(key: string): void {
  const toast: Toast = {
    type: "error",
    duration: 3000,
    key,
  };
  window.dispatchEvent(
    new CustomEvent(TOAST_EVENT, {
      detail: toast,
    })
  );
}
