export class Toast {
  type: "success" | "error" = "success";
  duration = 3000;
  key: string;
  properties?: Record<string, string | number>;
}
