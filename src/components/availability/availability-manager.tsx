"use client";

import { useState } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createAvailability,
  deleteAvailability,
} from "@/lib/actions/availabilities";
import type { AvailabilityRow } from "@/lib/db-types";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

type Props = {
  ownerType: "tutor" | "student";
  ownerId: string;
  availabilities: AvailabilityRow[];
};

export function AvailabilityManager({
  ownerType,
  ownerId,
  availabilities,
}: Props) {
  const [day, setDay] = useState("1");
  const [start, setStart] = useState("16:00");
  const [end, setEnd] = useState("18:00");
  const [pending, setPending] = useState(false);

  async function handleAdd() {
    if (end <= start) {
      toast.error("End must be after start");
      return;
    }
    setPending(true);
    const res = await createAvailability({
      owner_type: ownerType,
      tutor_id: ownerType === "tutor" ? ownerId : null,
      student_id: ownerType === "student" ? ownerId : null,
      day_of_week: Number(day),
      start_time_of_day: start,
      end_time_of_day: end,
    });
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Availability added");
  }

  async function handleDelete(id: string) {
    const res = await deleteAvailability(id, ownerType, ownerId);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Availability removed");
  }

  const grouped = new Map<number, AvailabilityRow[]>();
  for (const a of availabilities) {
    const list = grouped.get(a.day_of_week) ?? [];
    list.push(a);
    grouped.set(a.day_of_week, list);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label>Day</Label>
          <Select value={day} onValueChange={setDay}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((label, i) => (
                <SelectItem key={i} value={String(i)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Start</Label>
          <Input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-[130px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label>End</Label>
          <Input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-[130px]"
          />
        </div>
        <Button onClick={handleAdd} disabled={pending}>
          {pending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Add
        </Button>
      </div>

      {availabilities.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No availability set yet.
        </p>
      ) : (
        <div className="space-y-2">
          {DAYS.map((label, i) => {
            const rows = grouped.get(i);
            if (!rows?.length) return null;
            return (
              <div key={i} className="rounded-md border p-3">
                <div className="mb-2 text-sm font-medium">{label}</div>
                <ul className="space-y-1.5">
                  {rows.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-mono">
                        {a.start_time_of_day.slice(0, 5)} –{" "}
                        {a.end_time_of_day.slice(0, 5)}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(a.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
