import { AppShell } from "@/components/layout/app-shell";
import { Reveal } from "@/components/aceternity/reveal";
import { Card } from "@/components/ui/card";
import { MarketingHero } from "@/components/marketing/hero";

const features = [
  {
    title: "Intake",
    subtitle: "Upload and register",
    body: "Create meeting metadata, attach mp3/mp4 files, and trigger the processing pipeline in one action.",
  },
  {
    title: "Intelligence",
    subtitle: "Transcript-backed draft",
    body: "Generate transcript, summary, and action candidates before any delivery happens.",
  },
  {
    title: "Control",
    subtitle: "Approval gate",
    body: "Approve outbound actions explicitly and keep audit-ready logs for every meeting run.",
  },
];

export default function Home() {
  return (
    <AppShell>
      <MarketingHero />

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <Reveal>
          <Card title="Pipeline Status" subtitle="Backend lifecycle is wired and callable.">
            <ul className="space-y-3 text-sm text-[var(--text-secondary)]">
              <li>1. Create metadata (`POST /api/meetings`)</li>
              <li>2. Upload media (`POST /api/meetings/:id/upload`)</li>
              <li>3. Process transcript (`POST /api/meetings/:id/process`)</li>
              <li>4. Approve delivery (`POST /api/meetings/:id/approve`)</li>
            </ul>
          </Card>
        </Reveal>

        <Reveal delay={0.08}>
          <Card title="Brand Fit" subtitle="Orbit-themed neon palette applied.">
            <div className="space-y-3 text-sm text-[var(--text-secondary)]">
              <p>Dark background with blue-purple gradients</p>
              <p>Warm orbit accent for key CTAs</p>
              <p>Soft spotlight and reveal motion</p>
            </div>
          </Card>
        </Reveal>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-3">
        {features.map((item, index) => (
          <Reveal key={item.title} delay={0.1 + index * 0.06}>
            <Card title={item.title} subtitle={item.subtitle}>
              <p className="text-sm text-[var(--text-secondary)]">{item.body}</p>
            </Card>
          </Reveal>
        ))}
      </section>
    </AppShell>
  );
}
