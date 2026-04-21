import { notFound } from "next/navigation";
import { db, initializeDatabase } from "@/lib/db";
import { NovelReader } from "@/components/reader/NovelReader";
import type { Novel } from "@/types";

interface NovelPageProps {
  params: Promise<{ slug: string }>;
}

async function getNovel(slug: string): Promise<Novel | null> {
  try {
    await initializeDatabase();
    const result = await db.execute({
      sql: "SELECT * FROM novels WHERE slug = ?",
      args: [slug],
    });
    return (result.rows[0] as unknown as Novel) || null;
  } catch (e) {
    console.error(e);
    return null;
  }
}

export default async function NovelPage({ params }: NovelPageProps) {
  const { slug } = await params;
  const novel = await getNovel(slug);

  if (!novel) {
    notFound();
  }

  return <NovelReader novel={novel} />;
}

export async function generateMetadata({ params }: NovelPageProps) {
  const { slug } = await params;
  const novel = await getNovel(slug);
  return {
    title: novel ? `${novel.title} — KAI-DIARY` : "Not Found",
  };
}
