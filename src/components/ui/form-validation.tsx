import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";

export interface ValidationRule {
  test: (value: any) => boolean;
  message: string;
}

interface FieldValidationProps {
  value: any;
  rules: ValidationRule[];
  showValidation?: boolean;
}

export const FieldValidation = ({ value, rules, showValidation = true }: FieldValidationProps) => {
  const errors = rules.filter(rule => !rule.test(value)).map(rule => rule.message);
  const hasErrors = errors.length > 0;
  const hasValue = value && value.toString().trim().length > 0;

  if (!showValidation || !hasValue) return null;

  return (
    <div className="mt-1">
      {hasErrors ? (
        <div className="flex items-start gap-2 text-destructive text-xs" role="alert">
          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span>{errors[0]}</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-green-600 text-xs">
          <CheckCircle className="h-3 w-3" />
          <span>Valid</span>
        </div>
      )}
    </div>
  );
};

// Common validation rules
export const validationRules = {
  required: (message = "This field is required"): ValidationRule => ({
    test: (value) => value && value.toString().trim().length > 0,
    message
  }),
  
  email: (message = "Please enter a valid email address"): ValidationRule => ({
    test: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message
  }),
  
  phone: (message = "Please enter a valid phone number"): ValidationRule => ({
    test: (value) => !value || /^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/[\s\-\(\)]/g, '')),
    message
  }),
  
  minLength: (min: number, message?: string): ValidationRule => ({
    test: (value) => !value || value.toString().length >= min,
    message: message || `Must be at least ${min} characters`
  }),
  
  maxLength: (max: number, message?: string): ValidationRule => ({
    test: (value) => !value || value.toString().length <= max,
    message: message || `Must be no more than ${max} characters`
  }),
  
  numeric: (message = "Please enter a valid number"): ValidationRule => ({
    test: (value) => !value || !isNaN(Number(value)),
    message
  }),
  
  positiveNumber: (message = "Please enter a positive number"): ValidationRule => ({
    test: (value) => !value || (Number(value) > 0),
    message
  }),

  // Additional validation rules for sales application
  currency: (message = "Please enter a valid currency amount"): ValidationRule => ({
    test: (value) => !value || /^\d+(\.\d{1,2})?$/.test(value.toString()),
    message
  }),

  percentage: (message = "Please enter a valid percentage (0-100)"): ValidationRule => ({
    test: (value) => !value || (Number(value) >= 0 && Number(value) <= 100),
    message
  }),

  url: (message = "Please enter a valid URL"): ValidationRule => ({
    test: (value) => !value || /^https?:\/\/.+\..+/.test(value),
    message
  }),

  date: (message = "Please enter a valid date"): ValidationRule => ({
    test: (value) => !value || !isNaN(Date.parse(value)),
    message
  }),

  futureDate: (message = "Date must be in the future"): ValidationRule => ({
    test: (value) => !value || new Date(value) > new Date(),
    message
  }),

  pastDate: (message = "Date must be in the past"): ValidationRule => ({
    test: (value) => !value || new Date(value) < new Date(),
    message
  }),

  minValue: (min: number, message?: string): ValidationRule => ({
    test: (value) => !value || Number(value) >= min,
    message: message || `Value must be at least ${min}`
  }),

  maxValue: (max: number, message?: string): ValidationRule => ({
    test: (value) => !value || Number(value) <= max,
    message: message || `Value must be no more than ${max}`
  })
};

// Form validation hook
export const useFormValidation = (initialValues: Record<string, any>, validationSchema: Record<string, ValidationRule[]>) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [touched, setTouchedState] = useState<Record<string, boolean>>({});

  const validateField = (name: string, value: any) => {
    const rules = validationSchema[name] || [];
    const fieldErrors = rules.filter(rule => !rule.test(value)).map(rule => rule.message);
    setErrors(prev => ({ ...prev, [name]: fieldErrors }));
    return fieldErrors.length === 0;
  };

  const validateForm = () => {
    const formErrors: Record<string, string[]> = {};
    let isValid = true;

    Object.keys(validationSchema).forEach(fieldName => {
      const rules = validationSchema[fieldName];
      const fieldErrors = rules.filter(rule => !rule.test(values[fieldName])).map(rule => rule.message);
      if (fieldErrors.length > 0) {
        formErrors[fieldName] = fieldErrors;
        isValid = false;
      }
    });

    setErrors(formErrors);
    return isValid;
  };

  const setValue = (name: string, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    if (touched[name]) {
      validateField(name, value);
    }
  };

  const setTouched = (name: string) => {
    setTouchedState(prev => ({ ...prev, [name]: true }));
    validateField(name, values[name]);
  };

  const hasErrors = Object.values(errors).some(fieldErrors => fieldErrors.length > 0);

  return {
    values,
    errors,
    touched,
    hasErrors,
    setValue,
    setTouched,
    validateForm,
    validateField
  };
};
