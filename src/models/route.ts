import { TemplateResult } from "lit";

export interface Route {
  name: string;
  pattern: string;
  component: () => Promise<TemplateResult>;
  isProtected?: boolean;
  params?: Record<string, string>;
  data?: any;
}
