"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

interface Post {
  id: string;
  business: string;
  topic: string;
  format: "BLOG" | "LINKEDIN" | "CAROUSEL" | "THREAD";
  title: string | null;
  content: string | null;
  metaDescription: string | null;
  wordCount: number | null;
  charCount: number | null;
  status: string;
  createdAt: string;
  pillar: string | null;
  alternativeHooks: string[];
  followUpIdeas: string[];
}

const FORMAT_LABELS: Record<Post["format"], string> = {
  LINKEDIN: "LinkedIn",
  BLOG: "Blog",
  CAROUSEL: "Carrousel",
  THREAD: "Thread",
};

export default function PostViewPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchPost = useCallback(async () => {
    try {
      const res = await fetch(`/api/posts/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setPost(data);
      } else {
        router.push("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
    if (status === "authenticated") {
      fetchPost();
    }
  }, [status, router, fetchPost]);

  async function copyToClipboard(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted">Chargement...</p>
      </div>
    );
  }

  if (!session || !post) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/dashboard"
        className="text-sm text-muted hover:text-foreground mb-6 inline-block"
      >
        &larr; Retour a mes articles
      </Link>

      {/* Title */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold">{post.title}</h1>
          <button
            onClick={() => copyToClipboard(post.title || "", "title")}
            className="text-sm text-primary hover:underline whitespace-nowrap"
          >
            {copied === "title" ? "Copie !" : "Copier le titre"}
          </button>
        </div>
        <p className="text-sm text-muted mt-2">
          <span className="inline-block px-2 py-0.5 mr-2 rounded-full bg-primary/10 text-primary text-xs font-medium">
            {FORMAT_LABELS[post.format]}
          </span>
          {post.pillar && (
            <span className="inline-block px-2 py-0.5 mr-2 rounded-full bg-surface border border-border text-foreground text-xs font-medium">
              {post.pillar}
            </span>
          )}
          {new Date(post.createdAt).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          {post.format === "LINKEDIN" && post.charCount
            ? ` — ${post.charCount} caracteres`
            : post.wordCount
              ? ` — ${post.wordCount} mots`
              : ""}
        </p>
      </div>

      {/* Meta description */}
      {post.metaDescription && (
        <div className="bg-surface border border-border rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted uppercase">
              Meta description SEO
            </span>
            <button
              onClick={() =>
                copyToClipboard(post.metaDescription || "", "meta")
              }
              className="text-xs text-primary hover:underline"
            >
              {copied === "meta" ? "Copie !" : "Copier"}
            </button>
          </div>
          <p className="text-sm text-foreground">{post.metaDescription}</p>
        </div>
      )}

      {/* Content */}
      <div className="border border-border rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-muted uppercase">
            {post.format === "LINKEDIN" ? "Post LinkedIn" : "Article"}
          </span>
          <button
            onClick={() => copyToClipboard(post.content || "", "content")}
            className="text-sm bg-primary text-white px-4 py-1.5 rounded-lg hover:bg-primary-dark"
          >
            {copied === "content"
              ? "Copie !"
              : post.format === "LINKEDIN"
                ? "Copier le post"
                : "Copier l'article"}
          </button>
        </div>
        {post.format === "LINKEDIN" ? (
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
            {post.content || ""}
          </pre>
        ) : (
          <article className="prose prose-sm max-w-none">
            <ReactMarkdown>{post.content || ""}</ReactMarkdown>
          </article>
        )}
      </div>

      {post.alternativeHooks.length > 0 && (
        <div className="border border-border rounded-lg p-6 mb-6">
          <h2 className="text-xs font-medium text-muted uppercase mb-3">Accroches alternatives</h2>
          <ul className="space-y-3">
            {post.alternativeHooks.map((hook, i) => (
              <li key={i} className="flex items-start justify-between gap-3">
                <p className="text-sm text-foreground flex-1">{hook}</p>
                <button
                  onClick={() => copyToClipboard(hook, `hook-${i}`)}
                  className="text-xs text-primary hover:underline whitespace-nowrap"
                >
                  {copied === `hook-${i}` ? "Copie !" : "Copier"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {post.followUpIdeas.length > 0 && (
        <div className="border border-border rounded-lg p-6 mb-6">
          <h2 className="text-xs font-medium text-muted uppercase mb-3">Idees de posts suivants</h2>
          <ul className="space-y-2">
            {post.followUpIdeas.map((idea, i) => (
              <li key={i} className="text-sm text-foreground">
                — {idea}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Copy all (blog only — LinkedIn post is a single block) */}
      {post.format === "BLOG" && (
        <button
          onClick={() => {
            const fullText = `${post.title}\n\n${post.content}`;
            copyToClipboard(fullText, "all");
          }}
          className="w-full bg-primary text-white py-3 rounded-xl hover:bg-primary-dark font-medium text-lg"
        >
          {copied === "all" ? "Tout copie !" : "Copier tout (titre + article)"}
        </button>
      )}
    </div>
  );
}
