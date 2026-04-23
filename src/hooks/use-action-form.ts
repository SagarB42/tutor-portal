"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import {
  type DefaultValues,
  type FieldValues,
  useForm,
  type UseFormProps,
  type UseFormReturn,
} from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import type { ActionResult } from "@/lib/actions/result";

// zod v4 removed ZodTypeDef; use ZodType<Out, In> directly.
type AnyZodSchema = z.ZodType<FieldValues, FieldValues>;

type Options<TSchema extends AnyZodSchema> = {
  schema: TSchema;
  action: (input: z.output<TSchema>) => Promise<ActionResult<unknown>>;
  defaultValues: DefaultValues<z.input<TSchema>>;
  /** Fired after a successful action; useful for closing dialogs. */
  onSuccess?: (data: unknown) => void;
  successMessage?: string;
  /** Additional useForm options (mode, reValidateMode, etc). */
  formOptions?: Omit<
    UseFormProps<z.input<TSchema>>,
    "resolver" | "defaultValues"
  >;
};

type Result<TSchema extends AnyZodSchema> = {
  form: UseFormReturn<z.input<TSchema>>;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  pending: boolean;
};

/**
 * Wires react-hook-form to a zod-validated server action.
 */
export function useActionForm<TSchema extends AnyZodSchema>({
  schema,
  action,
  defaultValues,
  onSuccess,
  successMessage,
  formOptions,
}: Options<TSchema>): Result<TSchema> {
  const form = useForm<z.input<TSchema>>({
    ...formOptions,
    // zodResolver/RHF generics don't line up cleanly across zod v4 + RHF v7.
    // Both sides operate on FieldValues-shaped data, so cast via unknown.
    resolver: zodResolver(
      schema as unknown as z.ZodType<FieldValues, FieldValues>,
    ) as unknown as UseFormProps<z.input<TSchema>>["resolver"],
    defaultValues,
  }) as UseFormReturn<z.input<TSchema>>;

  const [pending, startTransition] = useTransition();

  const onSubmit = form.handleSubmit((values) => {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const result = await action(values as z.output<TSchema>);
        if (!result.ok) {
          toast.error(result.error);
          resolve();
          return;
        }
        if (successMessage) toast.success(successMessage);
        onSuccess?.(result.data);
        resolve();
      });
    });
  });

  return { form, onSubmit, pending };
}
