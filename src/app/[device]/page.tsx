import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { DeviceApp } from "@/components/Shell";
import { DEVICE_APPS, OLD_SLUGS, appFromSlug } from "@/lib/layout";
import { ProtoProvider } from "@/lib/store";

// One standalone app per device: /iphone, /ipad, /duo, /laptop. Each keeps its own prototype state.
export function generateStaticParams() {
  return [...DEVICE_APPS.map((a) => a.slug), ...Object.keys(OLD_SLUGS)].map((device) => ({ device }));
}

export async function generateMetadata({ params }: { params: Promise<{ device: string }> }): Promise<Metadata> {
  const app = appFromSlug((await params).device);
  return { title: app ? `Skyhand · ${app.label}` : "Skyhand Wireframe" };
}

export default async function DevicePage({ params }: { params: Promise<{ device: string }> }) {
  const slug = (await params).device;
  if (OLD_SLUGS[slug]) redirect(`/${OLD_SLUGS[slug]}`);
  const app = appFromSlug(slug);
  if (!app) notFound();
  return (
    <ProtoProvider lockPlatform={app.start}>
      <DeviceApp slug={app.slug} />
    </ProtoProvider>
  );
}
