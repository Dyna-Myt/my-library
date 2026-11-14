import { fetchItems } from "@/lib/items";
import { LibraryShell } from "@/components/LibraryShell";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await fetchItems();
  return <LibraryShell initialItems={data.items} source={data.source} />;
}
