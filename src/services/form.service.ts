import { Checkbox } from "@material/mwc-checkbox";

export const formService = { checkFormValidity, collectFormData };

function checkFormValidity(shadowRoot: ShadowRoot): boolean {
  const requiredFields = shadowRoot.querySelectorAll(
    "[required]"
  ) as NodeListOf<HTMLInputElement>;

  const validFields: boolean[] = [];

  requiredFields.forEach((field) => {
    validFields.push(field.validity.valid);
  });

  const checkboxFields = shadowRoot.querySelectorAll(
    "mwc-checkbox"
  ) as NodeListOf<Checkbox>;
  checkboxFields.forEach((field) => {
    validFields.push(field.checked);
  });

  return !validFields.includes(false);
}

function collectFormData(shadowRoot: ShadowRoot): Record<string, any> {
  const payload: Record<string, any> = {};
  const fields = shadowRoot.querySelectorAll(
    "mwc-textfield, mwc-select, mwc-checkbox, mwc-radio"
  ) as NodeListOf<HTMLInputElement>;

  fields.forEach((field) => {
    if (field.tagName === "MWC-TEXTFIELD" || field.tagName === "MWC-SELECT") {
      payload[field.name] = field.value;
    }

    if (field.tagName === "MWC-CHECKBOX") {
      console.log(field);
      payload[field.name] = field.checked;
    }

    if (field.tagName === "MWC-RADIO" && field.checked) {
      payload[field.name] = field.value;
    }
  });

  return payload;
}
