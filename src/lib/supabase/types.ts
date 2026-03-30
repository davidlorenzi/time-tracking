import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database";

/** Server DB client with table typings (see `createClient` in `./server`). */
export type SupabaseServerClient = SupabaseClient<Database>;
