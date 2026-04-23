"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  findOverlappingSlots,
  type OverlapSlot,
} from "@/lib/actions/scheduling";
import type {
  SessionStudentOption,
  SessionTutorOption,
} from "@/components/sessions/session-dialog";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tutors: SessionTutorOption[];
  students: SessionStudentOption[];
};

export function OverlapFinderDialog({
  open,
  onOpenChange,
  tutors,
  students,
}: Props) {
  const [tutorId, setTutorId] = useState("");
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [minMinutes, setMinMinutes] = useState("60");
  const [slots, setSlots] = useState<OverlapSlot[] | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleStudent(id: string, checked: boolean) {
    setStudentIds((prev) =>
      checked ? [...new Set([...prev, id])] : prev.filter((s) => s !== id),
    );
  }

  function handleSearch() {
    startTransition(async () => {
      const res = await findOverlappingSlots({
        tutorId,
        studentIds,
        minMinutes: Number(minMinutes) || 30,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setSlots(res.data);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Find a matching slot</DialogTitle>
          <DialogDescription>
            Intersects the selected tutor&apos;s availability with the selected
            students&apos; availability.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Tutor</Label>
            <Select value={tutorId} onValueChange={setTutorId}>
              <SelectTrigger>
                <SelectValue placeholder="Select tutor" />
              </SelectTrigger>
              <SelectContent>
                {tutors
                  .filter((t) => !t.archived_at)
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.full_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Students</Label>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
              {students
                .filter((s) => !s.archived_at)
                .map((s) => (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={studentIds.includes(s.id)}
                      onChange={(e) => toggleStudent(s.id, e.target.checked)}
                    />
                    {s.full_name}
                  </label>
                ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Minimum slot length (minutes)</Label>
            <Input
              type="number"
              min={15}
              step={15}
              value={minMinutes}
              onChange={(e) => setMinMinutes(e.target.value)}
              className="w-32"
            />
          </div>

          {slots && (
            <div className="rounded-md border">
              <div className="border-b bg-muted/50 px-3 py-2 text-sm font-medium">
                {slots.length
                  ? `${slots.length} slot${slots.length === 1 ? "" : "s"} found`
                  : "No overlap found"}
              </div>
              <ul className="max-h-48 divide-y overflow-y-auto">
                {slots.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{DAYS[s.day_of_week]}</span>
                    <span className="font-mono text-muted-foreground">
                      {s.start} – {s.end}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            type="button"
          >
            Close
          </Button>
          <Button onClick={handleSearch} disabled={pending}>
            {pending ? "Searching..." : "Find Slots"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
