import { formService } from "./form.service";

describe("formService", () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  describe("checkFormValidity", () => {
    it("should return true if there are no required fields and no checkboxes", () => {
      const mockShadowRoot = {
        querySelectorAll: (selector: string) => [],
      } as unknown as ShadowRoot;

      expect(formService.checkFormValidity(mockShadowRoot)).toBe(true);
    });

    it("should return true when all required fields are valid and checkboxes checked", () => {
      const requiredInputs = [
        { validity: { valid: true } },
        { validity: { valid: true } },
      ];
      const checkboxes = [{ checked: true }, { checked: true }];

      const mockShadowRoot = {
        querySelectorAll: (selector: string) => {
          if (selector === "[required]") return requiredInputs;
          if (selector === "md-checkbox") return checkboxes;
          return [];
        },
      } as unknown as ShadowRoot;

      expect(formService.checkFormValidity(mockShadowRoot)).toBe(true);
    });

    it("should return false if any required field is invalid", () => {
      const requiredInputs = [
        { validity: { valid: true } },
        { validity: { valid: false } },
      ];
      const checkboxes = [{ checked: true }];

      const mockShadowRoot = {
        querySelectorAll: (selector: string) => {
          if (selector === "[required]") return requiredInputs;
          if (selector === "md-checkbox") return checkboxes;
          return [];
        },
      } as unknown as ShadowRoot;

      expect(formService.checkFormValidity(mockShadowRoot)).toBe(false);
    });

    it("should return false if any checkbox is unchecked", () => {
      const requiredInputs = [{ validity: { valid: true } }];
      const checkboxes = [{ checked: true }, { checked: false }];

      const mockShadowRoot = {
        querySelectorAll: (selector: string) => {
          if (selector === "[required]") return requiredInputs;
          if (selector === "md-checkbox") return checkboxes;
          return [];
        },
      } as unknown as ShadowRoot;

      expect(formService.checkFormValidity(mockShadowRoot)).toBe(false);
    });
  });

  describe("checkInputValidity", () => {
    it("should debounce reportValidity call by 300ms", () => {
      jest.useFakeTimers();

      const reportValiditySpy = jest.fn();
      const mockEvent = {
        target: {
          reportValidity: reportValiditySpy,
        },
      } as unknown as Event;

      formService.checkInputValidity(mockEvent);

      // Should not be called immediately
      expect(reportValiditySpy).not.toHaveBeenCalled();

      // Advance by 150ms - still not called
      jest.advanceTimersByTime(150);
      expect(reportValiditySpy).not.toHaveBeenCalled();

      // Advance by another 150ms (300ms total) - called once
      jest.advanceTimersByTime(150);
      expect(reportValiditySpy).toHaveBeenCalledTimes(1);
    });

    it("should reset timer on subsequent calls within 300ms debounce window", () => {
      jest.useFakeTimers();

      const reportValidity1 = jest.fn();
      const reportValidity2 = jest.fn();

      const mockEvent1 = {
        target: { reportValidity: reportValidity1 },
      } as unknown as Event;
      const mockEvent2 = {
        target: { reportValidity: reportValidity2 },
      } as unknown as Event;

      formService.checkInputValidity(mockEvent1);
      jest.advanceTimersByTime(200);

      // Second input within debounce window
      formService.checkInputValidity(mockEvent2);

      jest.advanceTimersByTime(200);
      // Total 400ms passed, but only 200ms since mockEvent2
      expect(reportValidity1).not.toHaveBeenCalled();
      expect(reportValidity2).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      // 300ms reached for mockEvent2
      expect(reportValidity1).not.toHaveBeenCalled();
      expect(reportValidity2).toHaveBeenCalledTimes(1);
    });
  });

  describe("collectFormData", () => {
    it("should collect values from text fields, selects, checkboxes, and checked radios", () => {
      const mockFields = [
        {
          tagName: "MD-FILLED-TEXT-FIELD",
          name: "username",
          value: "Alice",
        },
        {
          tagName: "MD-FILLED-SELECT",
          name: "gamemode",
          value: "standard",
        },
        {
          tagName: "MD-CHECKBOX",
          name: "rememberMe",
          checked: true,
        },
        {
          tagName: "MD-CHECKBOX",
          name: "subscribe",
          checked: false,
        },
        {
          tagName: "MD-RADIO",
          name: "difficulty",
          value: "easy",
          checked: false,
        },
        {
          tagName: "MD-RADIO",
          name: "difficulty",
          value: "hard",
          checked: true,
        },
      ];

      const mockShadowRoot = {
        querySelectorAll: () => mockFields,
      } as unknown as ShadowRoot;

      const payload = formService.collectFormData(mockShadowRoot);

      expect(payload).toEqual({
        username: "Alice",
        gamemode: "standard",
        rememberMe: true,
        subscribe: false,
        difficulty: "hard",
      });
    });

    it("should return empty object when no fields are present", () => {
      const mockShadowRoot = {
        querySelectorAll: () => [],
      } as unknown as ShadowRoot;

      const payload = formService.collectFormData(mockShadowRoot);
      expect(payload).toEqual({});
    });
  });
});
