import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FieldValidation, ValidationRule, validationRules } from "./form-validation";
import { cn } from "@/lib/utils";

interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  value: string;
  onValueChange: (value: string) => void;
  onBlur?: () => void;
  validationRules?: ValidationRule[];
  showValidation?: boolean;
  helpText?: string;
  error?: string;
}

export const ValidatedInput = ({
  label,
  name,
  value,
  onValueChange,
  onBlur,
  validationRules = [],
  showValidation = true,
  helpText,
  error,
  className,
  ...props
}: ValidatedInputProps) => {
  const hasError = error || (validationRules.length > 0 && validationRules.some(rule => !rule.test(value)));
  const errorId = hasError ? `${name}-error` : undefined;
  const helpTextId = helpText ? `${name}-help` : undefined;
  const describedBy = [errorId, helpTextId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-2">
      <Label htmlFor={name} className={cn(hasError && "text-destructive")}>
        {label}
        {props.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        id={name}
        name={name}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={hasError ? "true" : "false"}
        aria-describedby={describedBy}
        className={cn(
          hasError && "border-destructive focus:border-destructive",
          className
        )}
        {...props}
      />
      {error ? (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : (
        <FieldValidation
          value={value}
          rules={validationRules}
          showValidation={showValidation}
        />
      )}
      {helpText && !error && (
        <p id={helpTextId} className="text-sm text-muted-foreground">
          {helpText}
        </p>
      )}
    </div>
  );
};

interface ValidatedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  name: string;
  value: string;
  onValueChange: (value: string) => void;
  onBlur?: () => void;
  validationRules?: ValidationRule[];
  showValidation?: boolean;
  helpText?: string;
  error?: string;
}

export const ValidatedTextarea = ({
  label,
  name,
  value,
  onValueChange,
  onBlur,
  validationRules = [],
  showValidation = true,
  helpText,
  error,
  className,
  ...props
}: ValidatedTextareaProps) => {
  const hasError = error || (validationRules.length > 0 && validationRules.some(rule => !rule.test(value)));
  const errorId = hasError ? `${name}-error` : undefined;
  const helpTextId = helpText ? `${name}-help` : undefined;
  const describedBy = [errorId, helpTextId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-2">
      <Label htmlFor={name} className={cn(hasError && "text-destructive")}>
        {label}
        {props.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Textarea
        id={name}
        name={name}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={hasError ? "true" : "false"}
        aria-describedby={describedBy}
        className={cn(
          hasError && "border-destructive focus:border-destructive",
          className
        )}
        {...props}
      />
      {error ? (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : (
        <FieldValidation
          value={value}
          rules={validationRules}
          showValidation={showValidation}
        />
      )}
      {helpText && !error && (
        <p id={helpTextId} className="text-sm text-muted-foreground">
          {helpText}
        </p>
      )}
    </div>
  );
};

interface ValidatedSelectProps {
  label: string;
  name: string;
  value: string;
  onValueChange: (value: string) => void;
  onBlur?: () => void;
  validationRules?: ValidationRule[];
  showValidation?: boolean;
  helpText?: string;
  error?: string;
  placeholder?: string;
  required?: boolean;
  children: React.ReactNode;
}

export const ValidatedSelect = ({
  label,
  name,
  value,
  onValueChange,
  onBlur,
  validationRules = [],
  showValidation = true,
  helpText,
  error,
  placeholder,
  required,
  children
}: ValidatedSelectProps) => {
  const hasError = error || (validationRules.length > 0 && validationRules.some(rule => !rule.test(value)));
  const errorId = hasError ? `${name}-error` : undefined;
  const helpTextId = helpText ? `${name}-help` : undefined;
  const describedBy = [errorId, helpTextId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-2">
      <Label htmlFor={name} className={cn(hasError && "text-destructive")}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Select
        value={value}
        onValueChange={onValueChange}
        required={required}
      >
        <SelectTrigger
          id={name}
          className={cn(hasError && "border-destructive focus:border-destructive")}
          onBlur={onBlur}
          aria-invalid={hasError ? "true" : "false"}
          aria-describedby={describedBy}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {children}
        </SelectContent>
      </Select>
      {error ? (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : (
        <FieldValidation
          value={value}
          rules={validationRules}
          showValidation={showValidation}
        />
      )}
      {helpText && !error && (
        <p id={helpTextId} className="text-sm text-muted-foreground">
          {helpText}
        </p>
      )}
    </div>
  );
};
