import { redirect } from "next/navigation";

/** Catches mistaken `/in` visits (e.g. bad Supabase Site URL or bookmark). */
export default function InAliasPage() {
  redirect("/");
}
