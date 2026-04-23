"use server";

import { requireOrg } from "@/lib/queries/org";
import { getAvailabilitiesForTutorAndStudents } from "@/lib/queries/availabilities";
import { fail, ok, type ActionResult } from "./result";

export type OverlapSlot = {
  day_of_week: number;
  start: string; // HH:MM
  end: string; // HH:MM
};

type Interval = { start: number; end: number }; // minutes from 00:00

function toMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function fromMin(n: number): string {
  const h = Math.floor(n / 60)
    .toString()
    .padStart(2, "0");
  const m = (n % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function mergeIntervals(list: Interval[]): Interval[] {
  if (list.length === 0) return [];
  const sorted = [...list].sort((a, b) => a.start - b.start);
  const out: Interval[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = out[out.length - 1];
    const cur = sorted[i];
    if (cur.start <= last.end) last.end = Math.max(last.end, cur.end);
    else out.push({ ...cur });
  }
  return out;
}

function intersect(a: Interval[], b: Interval[]): Interval[] {
  const out: Interval[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const s = Math.max(a[i].start, b[j].start);
    const e = Math.min(a[i].end, b[j].end);
    if (e > s) out.push({ start: s, end: e });
    if (a[i].end < b[j].end) i++;
    else j++;
  }
  return out;
}

export async function findOverlappingSlots(input: {
  tutorId: string;
  studentIds: string[];
  minMinutes?: number;
}): Promise<ActionResult<OverlapSlot[]>> {
  if (!input.tutorId) return fail("Select a tutor");
  if (!input.studentIds.length) return fail("Select at least one student");
  await requireOrg(); // auth gate

  const rows = await getAvailabilitiesForTutorAndStudents(
    input.tutorId,
    input.studentIds,
  );
  const minLen = input.minMinutes ?? 30;

  // Bucket intervals by owner + day-of-week.
  type DayMap = Map<number, Interval[]>;
  const byOwner = new Map<string, DayMap>(); // key = "tutor:<id>" / "student:<id>"

  function ensureOwnerDays(key: string): DayMap {
    let m = byOwner.get(key);
    if (!m) {
      m = new Map();
      byOwner.set(key, m);
    }
    return m;
  }

  for (const a of rows) {
    const key =
      a.owner_type === "tutor"
        ? `tutor:${a.tutor_id}`
        : `student:${a.student_id}`;
    const days = ensureOwnerDays(key);
    const list = days.get(a.day_of_week) ?? [];
    list.push({
      start: toMin(a.start_time_of_day.slice(0, 5)),
      end: toMin(a.end_time_of_day.slice(0, 5)),
    });
    days.set(a.day_of_week, list);
  }

  // Merge per-owner intervals.
  for (const [, days] of byOwner) {
    for (const [dow, list] of days) days.set(dow, mergeIntervals(list));
  }

  const tutorKey = `tutor:${input.tutorId}`;
  const tutorDays = byOwner.get(tutorKey);
  if (!tutorDays) return ok([]);

  const studentKeys = input.studentIds.map((id) => `student:${id}`);

  const slots: OverlapSlot[] = [];
  for (let dow = 0; dow < 7; dow++) {
    let running = tutorDays.get(dow) ?? [];
    for (const sKey of studentKeys) {
      const sDays = byOwner.get(sKey);
      const sList = sDays?.get(dow) ?? [];
      running = intersect(running, sList);
      if (running.length === 0) break;
    }
    for (const iv of running) {
      if (iv.end - iv.start >= minLen) {
        slots.push({
          day_of_week: dow,
          start: fromMin(iv.start),
          end: fromMin(iv.end),
        });
      }
    }
  }
  return ok(slots);
}
