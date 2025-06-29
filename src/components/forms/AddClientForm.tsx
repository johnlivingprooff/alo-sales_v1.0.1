
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ValidatedInput, ValidatedTextarea } from "@/components/ui/validated-inputs";
import { validationRules, useFormValidation } from "@/components/ui/form-validation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { createClientSafely, checkClientExists } from "@/lib/clientValidation";

interface AddClientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated?: (client: any) => void;
  initialCompanyName?: string;
}

export const AddClientForm = ({ 
  open, 
  onOpenChange, 
  onClientCreated,
  initialCompanyName = ""
}: AddClientFormProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  // Define validation schema
  const validationSchema = {
    companyName: [validationRules.required(), validationRules.minLength(2)],
    contactPerson: [validationRules.minLength(2)],
    email: [validationRules.email()],
    phone: [validationRules.phone()],
    address: [validationRules.maxLength(200)],
    industry: [validationRules.maxLength(100)],
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
      companyName: initialCompanyName,
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      industry: "",
      notes: ""
    },
    validationSchema
  );

  // Real-time duplicate checking with debounce
  useEffect(() => {
    const checkDuplicate = async () => {
      if (!values.companyName || values.companyName.trim().length < 2) {
        setDuplicateWarning(null);
        return;
      }

      setCheckingDuplicate(true);
      try {
        const result = await checkClientExists(values.companyName);
        if (result.exists && result.client) {
          setDuplicateWarning(`A client named "${result.client.company_name}" already exists`);
        } else {
          setDuplicateWarning(null);
        }
      } catch (error) {
        console.error('Error checking for duplicate:', error);
        setDuplicateWarning(null);
      } finally {
        setCheckingDuplicate(false);
      }
    };

    // Debounce the duplicate check
    const timeoutId = setTimeout(checkDuplicate, 500);
    return () => clearTimeout(timeoutId);
  }, [values.companyName]);

  // Clear duplicate warning when form is closed
  useEffect(() => {
    if (!open) {
      setDuplicateWarning(null);
      setCheckingDuplicate(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setLoading(true);
    try {
      const clientData = {
        created_by: user.id,
        company_name: values.companyName,
        contact_person: values.contactPerson || null,
        email: values.email || null,
        phone: values.phone || null,
        address: values.address || null,
        industry: values.industry || null,
        notes: values.notes || null
      };

      const result = await createClientSafely(clientData, {
        returnExistingIfDuplicate: false // Block creation if duplicate exists
      });

      if (!result.success) {
        if (result.isDuplicate) {
          toast.error(`A client with the name "${values.companyName}" already exists`);
        } else {
          toast.error(result.error || 'Failed to add client');
        }
        return;
      }

      toast.success('Client added successfully!');
      onOpenChange(false);
      if (onClientCreated) onClientCreated(result.client);
      
      // Reset form
      resetForm();
    } catch (error) {
      console.error('Error adding client:', error);
      toast.error('Failed to add client');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setValue('companyName', '');
    setValue('contactPerson', '');
    setValue('email', '');
    setValue('phone', '');
    setValue('address', '');
    setValue('industry', '');
    setValue('notes', '');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto w-full px-2 py-4 sm:p-6 rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Add New Client</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <ValidatedInput
            label="Company Name"
            name="companyName"
            value={values.companyName}
            onValueChange={(value) => setValue("companyName", value)}
            onBlur={() => setTouched("companyName")}
            validationRules={validationSchema.companyName}
            error={errors.companyName?.[0] || duplicateWarning}
            required
            helpText={checkingDuplicate ? "Checking for duplicates..." : "Enter the full company name"}
            placeholder="e.g., Acme Corporation"
          />

          <ValidatedInput
            label="Contact Person"
            name="contactPerson"
            value={values.contactPerson}
            onValueChange={(value) => setValue("contactPerson", value)}
            onBlur={() => setTouched("contactPerson")}
            validationRules={validationSchema.contactPerson}
            error={errors.contactPerson?.[0]}
            helpText="Primary contact at the company"
            placeholder="John Doe"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ValidatedInput
              label="Email"
              name="email"
              type="email"
              value={values.email}
              onValueChange={(value) => setValue("email", value)}
              onBlur={() => setTouched("email")}
              validationRules={validationSchema.email}
              error={errors.email?.[0]}
              helpText="Primary contact email"
              placeholder="contact@company.com"
            />

            <ValidatedInput
              label="Phone"
              name="phone"
              type="tel"
              value={values.phone}
              onValueChange={(value) => setValue("phone", value)}
              onBlur={() => setTouched("phone")}
              validationRules={validationSchema.phone}
              error={errors.phone?.[0]}
              helpText="Include country code if international"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <ValidatedInput
            label="Address"
            name="address"
            value={values.address}
            onValueChange={(value) => setValue("address", value)}
            onBlur={() => setTouched("address")}
            validationRules={validationSchema.address}
            error={errors.address?.[0]}
            helpText="Company address or location"
            placeholder="123 Business St, City, State, ZIP"
          />

          <ValidatedInput
            label="Industry"
            name="industry"
            value={values.industry}
            onValueChange={(value) => setValue("industry", value)}
            onBlur={() => setTouched("industry")}
            validationRules={validationSchema.industry}
            error={errors.industry?.[0]}
            helpText="Industry or business sector"
            placeholder="e.g., Technology, Healthcare, Finance"
          />

          <ValidatedTextarea
            label="Notes"
            name="notes"
            value={values.notes}
            onValueChange={(value) => setValue("notes", value)}
            onBlur={() => setTouched("notes")}
            validationRules={validationSchema.notes}
            error={errors.notes?.[0]}
            helpText="Additional notes about this client"
            placeholder="Any additional information..."
            rows={3}
          />

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || hasErrors}>
              {loading ? "Saving..." : "Add Client"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
