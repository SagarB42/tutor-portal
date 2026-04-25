"use client";

import * as React from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitExpressionOfInterestAction } from "@/lib/actions/expressions-of-interest";
import { expressionOfInterestSchema } from "@/lib/schemas";

const initialForm = {
  business_name: "",
  owner_name: "",
  email: "",
  phone: "",
  message: "",
};

export function EoiForm() {
  const [form, setForm] = React.useState(initialForm);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const parsed = expressionOfInterestSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please fill in the required fields");
      return;
    }

    setSubmitting(true);
    const result = await submitExpressionOfInterestAction(parsed.data);
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error || "Something went wrong, please try again.");
      return;
    }

    toast.success("Thanks! We'll be in touch soon.");
    setForm(initialForm);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border bg-card/90 p-8 text-center shadow-xl backdrop-blur-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Send className="h-6 w-6" />
        </div>
        <h3 className="text-xl font-semibold">Submission received</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Thanks for your interest. We&apos;ll review your details and email you an invite shortly.
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => setSubmitted(false)}
        >
          Submit another
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border bg-card/90 p-6 shadow-xl backdrop-blur-sm sm:p-8"
    >
      <h3 className="text-xl font-semibold">Request access</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Tell us a bit about your tutoring business. We&apos;ll send an invite to the email you provide.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="business_name">Business name</Label>
          <Input
            id="business_name"
            required
            value={form.business_name}
            onChange={(e) => update("business_name", e.target.value)}
            placeholder="Acme Tutoring"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="owner_name">Your name</Label>
          <Input
            id="owner_name"
            required
            value={form.owner_name}
            onChange={(e) => update("owner_name", e.target.value)}
            placeholder="Jane Doe"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            required
            type="tel"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="04xx xxx xxx"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            required
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="you@business.com"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="message">Anything else? (optional)</Label>
          <Textarea
            id="message"
            value={form.message}
            onChange={(e) => update("message", e.target.value)}
            placeholder="Number of tutors, students, what you're hoping to solve..."
            rows={3}
          />
        </div>
      </div>

      <Button type="submit" className="mt-6 w-full" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" /> Send expression of interest
          </>
        )}
      </Button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        We&apos;ll only use your details to get in touch about Tutor Portal.
      </p>
    </form>
  );
}
