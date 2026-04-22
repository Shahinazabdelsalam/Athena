"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Format = "LINKEDIN" | "BLOG" | "CAROUSEL" | "THREAD";

interface Props {
  initialBusiness: string;
  pillars: string[];
  hasVoice: boolean;
}

export default function GenerateForm({ initialBusiness, pillars, hasVoice }: Props) {
  const router = useRouter();
  const [business, setBusiness] = useState(initialBusiness);
  const [topic, setTopic] = useState("");
  const [format, setFormat] = useState<Format>("LINKEDIN");
  const [pillar, setPillar] = useState<string>(pillars[0] ?? "");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setProgress("Envoi de votre demande...");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business, topic, format, pillar: pillar || null }),
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

      setProgress(
        format === "LINKEDIN"
          ? "Recherche et redaction de votre post LinkedIn..."
          : "Recherche et redaction de votre article..."
      );
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-error text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Format
        </label>
        <div className="grid grid-cols-2 gap-2">
          <FormatTile
            active={format === "LINKEDIN"}
            onClick={() => setFormat("LINKEDIN")}
            disabled={loading}
            title="Post LinkedIn"
            subtitle="~3000 caracteres"
          />
          <FormatTile
            active={format === "BLOG"}
            onClick={() => setFormat("BLOG")}
            disabled={loading}
            title="Article de blog"
            subtitle="800-2000 mots"
          />
          <FormatTile
            active={format === "CAROUSEL"}
            onClick={() => setFormat("CAROUSEL")}
            disabled={loading || !hasVoice}
            title="Carrousel LinkedIn"
            subtitle={hasVoice ? "7-10 slides" : "Requiert une voix de marque"}
          />
          <FormatTile
            active={format === "THREAD"}
            onClick={() => setFormat("THREAD")}
            disabled={loading || !hasVoice}
            title="Thread X"
            subtitle={hasVoice ? "5-9 posts" : "Requiert une voix de marque"}
          />
        </div>
        {!hasVoice && (
          <p className="mt-2 text-xs text-muted">
            <Link href="/dashboard/settings/voice" className="text-primary hover:underline">
              Configurez votre voix de marque
            </Link>{" "}
            pour debloquer les formats carrousel et thread.
          </p>
        )}
      </div>

      {pillars.length > 0 && (
        <div>
          <label htmlFor="pillar" className="block text-sm font-medium text-foreground mb-1">
            Pilier de contenu
          </label>
          <select
            id="pillar"
            value={pillar}
            onChange={(e) => setPillar(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 bg-white"
          >
            {pillars.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
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
        <p className="mt-1 text-xs text-muted">
          Enregistre automatiquement pour vos prochains articles.
        </p>
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
        {loading
          ? progress
          : format === "LINKEDIN"
            ? "Creer mon post LinkedIn"
            : "Creer mon article"}
      </button>

      {loading && (
        <div className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted">{progress}</p>
        </div>
      )}
    </form>
  );
}

function FormatTile({
  active,
  onClick,
  disabled,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  disabled: boolean;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-3 rounded-lg border text-sm font-medium transition ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-foreground hover:border-primary/40"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {title}
      <span className="block text-xs font-normal text-muted mt-0.5">{subtitle}</span>
    </button>
  );
}
