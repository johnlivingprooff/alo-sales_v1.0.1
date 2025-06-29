import React from "react";
import { ValidatedInput, ValidatedTextarea, ValidatedSelect } from "@/components/ui/validated-inputs";
import { validationRules, useFormValidation } from "@/components/ui/form-validation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SelectItem } from "@/components/ui/select";

interface ExampleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ExampleValidatedForm = ({ open, onOpenChange }: ExampleFormProps) => {
  // Define validation schema
  const validationSchema = {
    companyName: [validationRules.required(), validationRules.minLength(2)],
    contactEmail: [validationRules.required(), validationRules.email()],
    contactPhone: [validationRules.phone()],
    estimatedRevenue: [validationRules.currency(), validationRules.positiveNumber()],
    priority: [validationRules.required()],
    notes: [validationRules.maxLength(500)]
  };

  // Use the form validation hook
  const {
    values,
    errors,
    setValue,
    setTouched,
    validateForm,
    hasErrors
  } = useFormValidation(
    {
      companyName: "",
      contactEmail: "",
      contactPhone: "",
      estimatedRevenue: "",
      priority: "",
      notes: ""
    },
    validationSchema
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      console.log("Form is valid:", values);
      // Handle successful submission
      onOpenChange(false);
    } else {
      console.log("Form has errors:", errors);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Example Validated Form</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <ValidatedInput
            label="Company Name"
            name="companyName"
            value={values.companyName}
            onValueChange={(value) => setValue("companyName", value)}
            onBlur={() => setTouched("companyName")}
            validationRules={validationSchema.companyName}
            error={errors.companyName?.[0]}
            required
            helpText="Enter the full company name"
            placeholder="e.g., Acme Corporation"
          />

          <ValidatedInput
            label="Contact Email"
            name="contactEmail"
            type="email"
            value={values.contactEmail}
            onValueChange={(value) => setValue("contactEmail", value)}
            onBlur={() => setTouched("contactEmail")}
            validationRules={validationSchema.contactEmail}
            error={errors.contactEmail?.[0]}
            required
            helpText="Primary contact email address"
            placeholder="contact@company.com"
          />

          <ValidatedInput
            label="Contact Phone"
            name="contactPhone"
            type="tel"
            value={values.contactPhone}
            onValueChange={(value) => setValue("contactPhone", value)}
            onBlur={() => setTouched("contactPhone")}
            validationRules={validationSchema.contactPhone}
            error={errors.contactPhone?.[0]}
            helpText="Include country code if international"
            placeholder="+1 (555) 123-4567"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ValidatedInput
              label="Estimated Revenue"
              name="estimatedRevenue"
              type="number"
              value={values.estimatedRevenue}
              onValueChange={(value) => setValue("estimatedRevenue", value)}
              onBlur={() => setTouched("estimatedRevenue")}
              validationRules={validationSchema.estimatedRevenue}
              error={errors.estimatedRevenue?.[0]}
              helpText="Estimated deal value"
              placeholder="10000.00"
              step="0.01"
              min="0"
            />

            <ValidatedSelect
              label="Priority"
              name="priority"
              value={values.priority}
              onValueChange={(value) => setValue("priority", value)}
              onBlur={() => setTouched("priority")}
              validationRules={validationSchema.priority}
              error={errors.priority?.[0]}
              required
              placeholder="Select priority level"
              helpText="Deal priority level"
            >
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </ValidatedSelect>
          </div>

          <ValidatedTextarea
            label="Notes"
            name="notes"
            value={values.notes}
            onValueChange={(value) => setValue("notes", value)}
            onBlur={() => setTouched("notes")}
            validationRules={validationSchema.notes}
            error={errors.notes?.[0]}
            helpText="Additional notes about this lead"
            placeholder="Any additional information..."
            rows={3}
          />

          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={hasErrors}
              className="w-full sm:w-auto"
            >
              Save Lead
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
