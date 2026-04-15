import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getBrands } from "@/lib/training-data-db";
import BrandsClient from "./BrandsClient";

export default async function BrandsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const brands = await getBrands(session.user.id);
  return <BrandsClient brands={brands} />;
}
