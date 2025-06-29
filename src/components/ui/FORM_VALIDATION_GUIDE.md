# Form Validation Components Documentation

## Overview

This documentation covers the enhanced form validation components that provide accessible, user-friendly validation with real-time feedback. These components are designed to improve the UX/UI of all forms in the ALO Sales application.

## Components

### 1. ValidatedInput

A wrapper around the standard Input component that provides validation, error handling, and accessibility features.

```tsx
import { ValidatedInput } from "@/components/ui/validated-inputs";
import { validationRules } from "@/components/ui/form-validation";

<ValidatedInput
  label="Email Address"
  name="email"
  type="email"
  value={email}
  onValueChange={setEmail}
  onBlur={() => setTouched("email")}
  validationRules={[
    validationRules.required(),
    validationRules.email()
  ]}
  required
  helpText="Your primary email address"
  placeholder="user@example.com"
/>
```

### 2. ValidatedTextarea

A wrapper around the standard Textarea component with validation capabilities.

```tsx
<ValidatedTextarea
  label="Description"
  name="description"
  value={description}
  onValueChange={setDescription}
  validationRules={[
    validationRules.required(),
    validationRules.maxLength(500)
  ]}
  helpText="Maximum 500 characters"
  rows={4}
/>
```

### 3. ValidatedSelect

A wrapper around the standard Select component with validation.

```tsx
<ValidatedSelect
  label="Priority Level"
  name="priority"
  value={priority}
  onValueChange={setPriority}
  validationRules={[validationRules.required()]}
  required
  placeholder="Select priority"
>
  <SelectItem value="low">Low</SelectItem>
  <SelectItem value="high">High</SelectItem>
</ValidatedSelect>
```

## Validation Rules

### Built-in Rules

- `required(message?)` - Field must not be empty
- `email(message?)` - Valid email format
- `phone(message?)` - Valid phone number format
- `minLength(min, message?)` - Minimum character length
- `maxLength(max, message?)` - Maximum character length
- `numeric(message?)` - Must be a valid number
- `positiveNumber(message?)` - Must be positive
- `currency(message?)` - Valid currency format (e.g., 123.45)
- `percentage(message?)` - Valid percentage (0-100)
- `url(message?)` - Valid URL format
- `date(message?)` - Valid date
- `futureDate(message?)` - Date must be in the future
- `pastDate(message?)` - Date must be in the past
- `minValue(min, message?)` - Minimum numeric value
- `maxValue(max, message?)` - Maximum numeric value

### Custom Rules

You can create custom validation rules:

```tsx
const customRule: ValidationRule = {
  test: (value) => value === "specific-value",
  message: "Value must be 'specific-value'"
};
```

## Form Validation Hook

The `useFormValidation` hook provides comprehensive form state management:

```tsx
import { useFormValidation, validationRules } from "@/components/ui/form-validation";

const MyForm = () => {
  const validationSchema = {
    name: [validationRules.required(), validationRules.minLength(2)],
    email: [validationRules.required(), validationRules.email()]
  };

  const {
    values,
    errors,
    touched,
    hasErrors,
    setValue,
    setTouched,
    validateForm,
    validateField
  } = useFormValidation(
    { name: "", email: "" }, // initial values
    validationSchema
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Form is valid, submit data
      console.log("Submitting:", values);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <ValidatedInput
        label="Name"
        name="name"
        value={values.name}
        onValueChange={(value) => setValue("name", value)}
        onBlur={() => setTouched("name")}
        validationRules={validationSchema.name}
        error={errors.name?.[0]}
        required
      />
      {/* More fields... */}
      <Button type="submit" disabled={hasErrors}>
        Submit
      </Button>
    </form>
  );
};
```

## Accessibility Features

All validated components include:

- **ARIA attributes**: `aria-invalid`, `aria-describedby` for screen readers
- **Proper labeling**: Associated labels with form controls
- **Error announcements**: `role="alert"` for immediate error feedback
- **Focus management**: Proper focus indicators and navigation
- **Help text**: Descriptive text linked via `aria-describedby`

## Best Practices

### 1. Progressive Validation

Validate fields as users interact with them:

```tsx
onBlur={() => setTouched("fieldName")} // Validate when user leaves field
```

### 2. Clear Error Messages

Use specific, actionable error messages:

```tsx
validationRules.email("Please enter a valid email address like user@domain.com")
```

### 3. Help Text

Provide guidance for complex fields:

```tsx
helpText="Phone number with country code, e.g., +1 (555) 123-4567"
```

### 4. Responsive Design

Use responsive grid layouts:

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <ValidatedInput ... />
  <ValidatedInput ... />
</div>
```

### 5. Form Submission

Always validate the entire form before submission:

```tsx
const handleSubmit = (e) => {
  e.preventDefault();
  if (validateForm()) {
    // Submit form
  } else {
    // Focus on first error field
  }
};
```

## Migration Guide

### From Basic Forms

**Before:**
```tsx
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    required
  />
</div>
```

**After:**
```tsx
<ValidatedInput
  label="Email"
  name="email"
  type="email"
  value={email}
  onValueChange={setEmail}
  validationRules={[validationRules.required(), validationRules.email()]}
  required
/>
```

### Benefits of Migration

1. **Immediate validation feedback** instead of waiting for form submission
2. **Consistent error handling** across all forms
3. **Better accessibility** for screen readers and keyboard navigation
4. **Reduced code duplication** with reusable validation logic
5. **Type safety** with TypeScript validation rules

## Examples

See `/src/components/ui/example-validated-form.tsx` for a complete working example demonstrating all features.

## Common Patterns

### Lead/Client Forms
```tsx
const leadValidation = {
  companyName: [validationRules.required(), validationRules.minLength(2)],
  contactEmail: [validationRules.required(), validationRules.email()],
  estimatedRevenue: [validationRules.currency(), validationRules.positiveNumber()],
  contactPhone: [validationRules.phone()]
};
```

### Settings Forms
```tsx
const settingsValidation = {
  commissionRate: [
    validationRules.required(),
    validationRules.percentage(),
    validationRules.minValue(0),
    validationRules.maxValue(100)
  ]
};
```

### Goal Setting Forms
```tsx
const goalValidation = {
  targetValue: [validationRules.required(), validationRules.positiveNumber()],
  deadline: [validationRules.required(), validationRules.futureDate()]
};
```
