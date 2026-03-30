import { revalidatePath } from "next/cache";

/** Call after mutations so lists and dashboards refresh. */
export function revalidateAppData(): void {
  revalidatePath("/", "layout");
}
