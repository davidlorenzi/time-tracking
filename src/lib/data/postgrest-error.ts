import type { PostgrestError } from "@supabase/supabase-js";

export function mapPostgrestError(error: PostgrestError): string {
  switch (error.code) {
    case "23503":
      return "This record is still linked to other data. Remove or reassign dependents first.";
    case "23505":
      return "A conflicting record already exists.";
    case "PGRST116":
      return "Record not found.";
    default:
      return error.message || "Database request failed.";
  }
}
