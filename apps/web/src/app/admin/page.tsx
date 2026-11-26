import type { Metadata } from "next";
import { AdminPanel } from "@/features/chain/admin/AdminPanel";

export const metadata: Metadata = { title: "CLAW machine setup" };

/** One-time setup for whoever deployed the program: create the machine, fill the prize pool. */
export default function AdminPage() {
  return <AdminPanel />;
}
