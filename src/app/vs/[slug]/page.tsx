import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VS_SLUGS, VS_NAMES } from "@/lib/vsContent";
import VsView from "@/components/VsView";

export function generateStaticParams() {
  return VS_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: any }): Promise<Metadata> {
  const { slug } = await params;
  const name = VS_NAMES[slug];
  if (!name) return {};
  const title = "QuizUps vs " + name + " — Free Alternative";
  const description =
    "A free " + name + " alternative — 100% free with unlimited players, AI questions, interactive video and exams. See how QuizUps compares, feature by feature.";
  return {
    title,
    description,
    alternates: { canonical: "/vs/" + slug },
    openGraph: { title, description, url: "https://quizups.com/vs/" + slug, type: "article", images: [{ url: "/og-image.png", width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: ["/og-image.png"] },
  };
}

export default async function VsPage({ params }: { params: any }) {
  const { slug } = await params;
  const name = VS_NAMES[slug];
  if (!name) notFound();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "QuizUps", item: "https://quizups.com" },
              { "@type": "ListItem", position: 2, name: "Comparisons", item: "https://quizups.com/features" },
              { "@type": "ListItem", position: 3, name: "QuizUps vs " + name, item: "https://quizups.com/vs/" + slug },
            ],
          }),
        }}
      />
      <VsView slug={slug} />
    </>
  );
}
