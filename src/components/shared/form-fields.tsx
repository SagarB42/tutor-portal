"use client";

import * as React from "react";
import { type FieldValues, type Path, useFormContext } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type BaseProps<TValues extends FieldValues> = {
  name: Path<TValues>;
  label?: React.ReactNode;
  description?: React.ReactNode;
  required?: boolean;
  className?: string;
};

function Required() {
  return <span className="ml-0.5 text-destructive">*</span>;
}

export function TextField<TValues extends FieldValues>({
  name,
  label,
  description,
  required,
  className,
  type = "text",
  placeholder,
  step,
  min,
  max,
  autoComplete,
  autoFocus,
}: BaseProps<TValues> & {
  type?: React.HTMLInputTypeAttribute;
  placeholder?: string;
  step?: string | number;
  min?: string | number;
  max?: string | number;
  autoComplete?: string;
  autoFocus?: boolean;
}) {
  const { control } = useFormContext<TValues>();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          {label && (
            <FormLabel>
              {label}
              {required && <Required />}
            </FormLabel>
          )}
          <FormControl>
            <Input
              type={type}
              placeholder={placeholder}
              step={step}
              min={min}
              max={max}
              autoComplete={autoComplete}
              autoFocus={autoFocus}
              {...field}
              value={field.value == null ? "" : field.value}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function TextareaField<TValues extends FieldValues>({
  name,
  label,
  description,
  required,
  className,
  placeholder,
  rows = 3,
}: BaseProps<TValues> & { placeholder?: string; rows?: number }) {
  const { control } = useFormContext<TValues>();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          {label && (
            <FormLabel>
              {label}
              {required && <Required />}
            </FormLabel>
          )}
          <FormControl>
            <Textarea
              rows={rows}
              placeholder={placeholder}
              {...field}
              value={field.value == null ? "" : field.value}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export type SelectFieldOption = { value: string; label: string };

export function SelectField<TValues extends FieldValues>({
  name,
  label,
  description,
  required,
  className,
  placeholder,
  options,
  disabled,
}: BaseProps<TValues> & {
  placeholder?: string;
  options: SelectFieldOption[];
  disabled?: boolean;
}) {
  const { control } = useFormContext<TValues>();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          {label && (
            <FormLabel>
              {label}
              {required && <Required />}
            </FormLabel>
          )}
          <Select
            onValueChange={field.onChange}
            value={field.value ?? ""}
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder ?? "Select..."} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
