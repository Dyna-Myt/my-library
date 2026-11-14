import type { Metadata } from "next";

import { AdminDesk } from "@/components/AdminDesk";

export const metadata: Metadata = {
  title: "Librarian's desk",
  description: "Private admin for My Library.",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminPage() {
  return <AdminDesk />;
}
