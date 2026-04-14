"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function GeneratePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [business, setBusiness] = useState("");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setProgress("Envoi de votre demande...");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business, topic }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "LIMIT_REACHED") {
          setError(data.error);
        } else {
          setError(data.error || "Erreur lors de la generation");
        }
        setLoading(false);
        setProgress("");
        return;
      }

      // Poll for completion
      setProgress("Generation de votre article en cours...");
      const postId = data.postId;

      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/jobs/${postId}`);
          const statusData = await statusRes.json();

          if (statusData.status === "COMPLETED") {
            clearInterval(pollInterval);
            router.push(`/dashboard/posts/${postId}`);
          } else if (statusData.status === "FAILED") {
            clearInterval(pollInterval);
            setError(
              statusData.error || "La generation a echoue. Veuillez reessayer."
            );
            setLoading(false);
            setProgress("");
          }
        } catch {
          clearInterval(pollInterval);
          setError("Erreur de connexion. Veuillez reessayer.");
          setLoading(false);
          setProgress("");
        }
      }, 2000);
    } catch {
      setError("Erreur de connexion. Veuillez reessayer.");
      setLoading(false);
      setProgress("");
    }
  }

  if (status === "loading") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted">Chargement...</p>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-bold text-center mb-2">
          Creer un article
        </h1>
        <p className="text-center text-sm text-muted mb-8">
          Decrivez votre activite et le sujet — Athena s&apos;occupe du reste.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-error text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="business"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Decrivez votre activite
            </label>
            <textarea
              id="business"
              required
              rows={3}
              value={business}
              onChange={(e) => setBusiness(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none disabled:opacity-50"
              placeholder="Ex: Je suis coach pour femmes entrepreneures, specialisee en gestion du temps et productivite"
            />
          </div>

          <div>
            <label
              htmlFor="topic"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Quel sujet voulez-vous aborder ?
            </label>
            <input
              id="topic"
              type="text"
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              placeholder="Ex: 5 astuces pour mieux organiser sa journee d'entrepreneure"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-3 rounded-xl hover:bg-primary-dark disabled:opacity-50 text-lg font-medium"
          >
            {loading ? progress : "Creer mon article"}
          </button>

          {loading && (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted">{progress}</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
