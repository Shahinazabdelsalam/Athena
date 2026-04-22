"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface Post {
  id: string;
  topic: string;
  title: string | null;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  wordCount: number | null;
  createdAt: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "En attente", color: "bg-yellow-100 text-yellow-800" },
  PROCESSING: { label: "En cours", color: "bg-blue-100 text-blue-800" },
  COMPLETED: { label: "Termine", color: "bg-green-100 text-green-800" },
  FAILED: { label: "Echoue", color: "bg-red-100 text-red-800" },
};

function DashboardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const upgraded = searchParams.get("upgraded") === "true";

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/posts");
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
    if (status === "authenticated") {
      fetchPosts();
    }
  }, [status, router, fetchPosts]);

  if (status === "loading" || loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted">Chargement...</p>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {upgraded && (
        <div className="bg-green-50 text-green-800 px-4 py-3 rounded-lg mb-6 text-sm">
          Bienvenue dans le plan Pro ! Vous pouvez maintenant creer des articles
          illimites.
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Mes articles</h1>
          <p className="text-sm text-muted mt-1">
            Bienvenue, {session.user?.name || session.user?.email}
          </p>
        </div>
        <Link
          href="/generate"
          className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark font-medium"
        >
          Nouvel article
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <p className="text-muted mb-4">
            Vous n&apos;avez pas encore d&apos;articles
          </p>
          <Link
            href="/generate"
            className="inline-block bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark"
          >
            Creer mon premier article
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const statusInfo = STATUS_LABELS[post.status];
            const clickable = post.status === "COMPLETED";
            const isFailed = post.status === "FAILED";
            return (
              <div
                key={post.id}
                className={`border border-border rounded-lg p-4 transition-colors ${
                  clickable ? "hover:border-primary/30" : "opacity-70"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <ConditionalLink
                    href={`/dashboard/posts/${post.id}`}
                    active={clickable}
                    className="flex-1 min-w-0"
                  >
                    <h3 className="font-medium truncate">
                      {post.title || post.topic}
                    </h3>
                    <p className="text-sm text-muted mt-1">
                      {new Date(post.createdAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                      {post.wordCount && ` — ${post.wordCount} mots`}
                    </p>
                  </ConditionalLink>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${statusInfo.color}`}
                    >
                      {statusInfo.label}
                    </span>
                    {isFailed && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm("Supprimer cet article echoue ?")) return;
                          const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
                          if (res.ok) {
                            setPosts((prev) => prev.filter((p) => p.id !== post.id));
                          }
                        }}
                        className="text-xs text-error hover:underline"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ConditionalLink({
  href,
  active,
  className,
  children,
}: {
  href: string;
  active: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  if (active) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return <div className={className}>{children}</div>;
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted">Chargement...</p>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
