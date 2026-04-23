/**
 * Standard return type for all server actions.
 * Actions never throw for validation/business errors; they return { ok: false, error }
 * so forms can display the message inline without crashing the RSC boundary.
 */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function ok<T = undefined>(data?: T): ActionResult<T> {
  return { ok: true, data: data as T };
}

export function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}
