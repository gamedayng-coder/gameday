import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getBrand, getTrainingData } from "@/lib/training-data-db";
import TrainingDataClient from "./TrainingDataClient";

export default async function TrainingDataPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  // Gracefully handle missing DB tables (migrations not yet applied)
  let brand, items: Awaited<ReturnType<typeof getTrainingData>> = [];
  try {
    brand = await getBrand(id, session.user.id);
    if (!brand) notFound();
    items = await getTrainingData(id, session.user.id);
  } catch {
    notFound();
  }
  if (!brand) notFound();
  return <TrainingDataClient brand={brand} items={items} />;
}
