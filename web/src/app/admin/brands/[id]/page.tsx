import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  getBrandById,
  getBrandVoice,
  getBrandPublishingConfig,
  listBrandCredentials,
  listBrandTemplates,
} from "@/lib/brand-db";
import CredentialsSection from "./CredentialsSection";
import PublishingSection from "./PublishingSection";
import BrandDetailClient from "./BrandDetailClient";

type Props = { params: Promise<{ id: string }> };

export default async function BrandDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const userId = session.user.id;

  const [brand, voice, publishingConfig, credentials, templates] =
    await Promise.all([
      getBrandById(id, userId),
      getBrandVoice(id),
      getBrandPublishingConfig(id),
      listBrandCredentials(id),
      listBrandTemplates(id),
    ]);

  if (!brand) notFound();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/admin/brands"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              ← Brands
            </Link>
            <h1 className="mt-1 text-2xl font-bold text-zinc-100">{brand.name}</h1>
          </div>
          <Link
            href={`/admin/brands/${id}/training-data`}
            className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors border border-zinc-700 rounded-lg px-4 py-2"
          >
            Training data
          </Link>
        </div>

        {/* Brand Brief */}
        <Section title="Brand Brief" description="Core brand configuration that drives all content decisions.">
          <BrandDetailClient brand={brand} />
        </Section>

        {/* Brand Voice */}
        <Section title="Brand Voice" description="Tone, style, and writing guidelines for content generation.">
          <VoiceForm brandId={id} initialVoice={voice} />
        </Section>

        {/* Publishing Config */}
        <Section title="Publishing" description="Per-platform publishing rules, frequency, and timing.">
          <PublishingSection
            brandId={id}
            initialConfig={publishingConfig?.config ?? null}
          />
        </Section>

        {/* Credentials Vault */}
        <Section title="Credentials" description="Encrypted social media API keys and access tokens.">
          <CredentialsSection brandId={id} initialCredentials={credentials} />
        </Section>

        {/* Templates */}
        <Section title="Templates" description="Reusable poster and caption templates for this brand.">
          <TemplatesPanel brandId={id} initialTemplates={templates} />
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
        <p className="text-sm text-zinc-500 mt-0.5">{description}</p>
      </div>
      {children}
    </section>
  );
}

// ── Inline server-renderable sub-components ───────────────────────────────────

import type { BrandVoice } from "@/lib/brand-db";
import VoiceFormClient from "./VoiceFormClient";

function VoiceForm({
  brandId,
  initialVoice,
}: {
  brandId: string;
  initialVoice: BrandVoice | null;
}) {
  return <VoiceFormClient brandId={brandId} initialVoice={initialVoice} />;
}

import type { BrandTemplate } from "@/lib/brand-db";
import TemplatesPanelClient from "./TemplatesPanelClient";

function TemplatesPanel({
  brandId,
  initialTemplates,
}: {
  brandId: string;
  initialTemplates: BrandTemplate[];
}) {
  return (
    <TemplatesPanelClient brandId={brandId} initialTemplates={initialTemplates} />
  );
}
