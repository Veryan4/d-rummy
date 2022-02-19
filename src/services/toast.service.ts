import { Toast } from "../models/toast.model";

const TOAST_EVENT = "toast";

export const toastService = { newToast, newError, TOAST_EVENT };

function newToast(
  key: string,
  placeholders?: Record<string, string | number>
): void {
  const toast: Toast = {
    type: "success",
    duration: 3000,
    key,
    properties: placeholders,
  };
  window.dispatchEvent(
    new CustomEvent(TOAST_EVENT, {
      detail: toast,
    })
  );
}

function newError(
  key: string,
  placeholders?: Record<string, string | number>
): void {
  const toast: Toast = {
    type: "error",
    duration: 3000,
    key,
    properties: placeholders,
  };
  window.dispatchEvent(
    new CustomEvent(TOAST_EVENT, {
      detail: toast,
    })
  );
}
