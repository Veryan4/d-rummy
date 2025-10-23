import { MdCheckbox } from "@material/web/checkbox/checkbox";

export const formService = {
  checkFormValidity,
  checkInputValidity,
  collectFormData,
};

let debounceTimer = 0;

function checkFormValidity(shadowRoot: ShadowRoot): boolean {
  const requiredFields = shadowRoot.querySelectorAll(
    "[required]"
  ) as NodeListOf<HTMLInputElement>;

  const validFields: boolean[] = [];

  requiredFields?.forEach((field) => {
    validFields.push(field.validity.valid);
  });

  const checkboxFields = shadowRoot.querySelectorAll(
    "md-checkbox"
  ) as NodeListOf<MdCheckbox>;
  checkboxFields?.forEach((field) => {
    validFields.push(field.checked);
  });

  return !validFields.includes(false);
}

function checkInputValidity(e: Event) {
  const input = e.target as HTMLInputElement;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => input.reportValidity(), 300);
}

function collectFormData(shadowRoot: ShadowRoot): Record<string, any> {
  const payload: Record<string, any> = {};
  const fields = shadowRoot.querySelectorAll(
    "md-filled-select, md-checkbox, md-radio, md-filled-text-field"
  ) as NodeListOf<HTMLInputElement>;

  fields.forEach((field) => {
    if (
      field.tagName === "MD-FILLED-TEXT-FIELD" ||
      field.tagName === "MD-FILLED-SELECT" ||
      "MD-FILLED-TEXT-FIELD"
    ) {
      payload[field.name] = field.value;
    }

    if (field.tagName === "MD-CHECKBOX") {
      payload[field.name] = field.checked;
    }

    if (field.tagName === "MD-RADIO" && field.checked) {
      payload[field.name] = field.value;
    }
  });

  return payload;
}
