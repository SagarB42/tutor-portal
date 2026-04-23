"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export function FYSelector({
  current,
  options,
}: {
  current: number;
  options: number[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-muted-foreground">
        Financial year
      </label>
      <select
        value={current}
        disabled={isPending}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("fy", e.target.value);
          startTransition(() => {
            router.push(`?${params.toString()}`);
          });
        }}
        className="rounded-md border bg-background px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((y) => {
          const yy = String(y).slice(-2);
          const yy2 = String(y + 1).slice(-2);
          return (
            <option key={y} value={y}>
              FY{yy}/{yy2}
            </option>
          );
        })}
      </select>
    </div>
  );
}
