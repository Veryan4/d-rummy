import { ReactiveControllerHost, noChange } from "lit";
import {
  Directive,
  ChildPart,
  DirectiveParameters,
  directive,
  DirectiveResult
} from "lit/directive.js";
import { t, getLanguage } from "../services/translate.service";

class TranslationDirective extends Directive {
  private currentLanguage: string;
  private properties: Record<string, string | number>;

  update(
    part: ChildPart,
    [translationKey, language, properties]: DirectiveParameters<this>
  ) {
    // target element can be accessed from part
    return this.render(translationKey, language, properties);
  }

  render(
    translationKey: string,
    language: string,
    properties?: Record<string, string | number>
  ) {
    if (this.currentLanguage === language && this.properties === properties) {
      return noChange;
    }
    this.currentLanguage = language;
    if (properties) {
      this.properties = properties;
    }
    return t(translationKey, properties);
  }
}
const translationDirective = directive(TranslationDirective);

export class TranslationController {
  private host: ReactiveControllerHost;
  language = getLanguage();

  t(translationKey: string, properties?: Record<string, string | number>): DirectiveResult<typeof TranslationDirective> {
    return translationDirective(translationKey, this.language, properties);
  }

  _changeLanguage = (e: CustomEvent) => {
    if (this.language !== e.detail.lang) {
      this.language = e.detail.lang;
      this.host.requestUpdate();
    }
  }

  constructor(host: ReactiveControllerHost) {
    this.host = host;
    host.addController(this);
  }

  hostConnected(): void {
    window.addEventListener(
      "lang-update",
      this._changeLanguage as EventListener
    );
  }

  hostDisconnected(): void {
    window.removeEventListener(
      "lang-update",
      this._changeLanguage as EventListener
    );
  }
}
