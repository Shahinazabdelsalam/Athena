"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveBrandVoice, type BrandVoiceFormInput } from "./actions";

interface Pillar {
  name: string;
  description: string;
}

interface Props {
  initial: BrandVoiceFormInput | null;
  defaultAnchors: string[];
  defaultBannedWords: string[];
  isFirstTime: boolean;
}

export default function VoiceForm({
  initial,
  defaultAnchors,
  defaultBannedWords,
  isFirstTime,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [soul, setSoul] = useState(initial?.soul ?? "");
  const [audience, setAudience] = useState(initial?.audience ?? "");
  const [toneRulesText, setToneRulesText] = useState((initial?.toneRules ?? []).join("\n"));
  const [bannedWordsText, setBannedWordsText] = useState(
    (initial?.bannedWords ?? defaultBannedWords).join(", ")
  );
  const [mandatoryAnchorsText, setMandatoryAnchorsText] = useState(
    (initial?.mandatoryAnchors ?? defaultAnchors).join("\n")
  );
  const [pillars, setPillars] = useState<Pillar[]>(
    initial?.pillars.length
      ? initial.pillars
      : [
          { name: "", description: "" },
          { name: "", description: "" },
        ]
  );

  function addPillar() {
    if (pillars.length >= 5) return;
    setPillars([...pillars, { name: "", description: "" }]);
  }

  function removePillar(i: number) {
    if (pillars.length <= 2) return;
    setPillars(pillars.filter((_, idx) => idx !== i));
  }

  function updatePillar(i: number, field: keyof Pillar, value: string) {
    setPillars(pillars.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const payload: BrandVoiceFormInput = {
      soul,
      audience,
      toneRules: toneRulesText.split("\n"),
      bannedWords: bannedWordsText.split(","),
      mandatoryAnchors: mandatoryAnchorsText.split("\n"),
      pillars,
    };

    startTransition(async () => {
      const result = await saveBrandVoice(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/generate");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-error text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      <div>
        <label htmlFor="soul" className="block text-sm font-medium text-foreground mb-1">
          Identite — qui etes-vous et pourquoi ecrivez-vous ?
        </label>
        <textarea
          id="soul"
          required
          rows={4}
          value={soul}
          onChange={(e) => setSoul(e.target.value)}
          disabled={isPending}
          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none disabled:opacity-50"
          placeholder="Ex: Coach pour femmes entrepreneures specialisee en gestion du temps. Apres 10 ans dans la finance, j'ecris pour celles qui veulent arreter de s'epuiser."
        />
        <p className="mt-1 text-xs text-muted">3 a 5 phrases. Votre voix distinctive tient dans ce bloc.</p>
      </div>

      <div>
        <label htmlFor="audience" className="block text-sm font-medium text-foreground mb-1">
          Audience
        </label>
        <input
          id="audience"
          type="text"
          required
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          disabled={isPending}
          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
          placeholder="Ex: entrepreneures francaises entre 30 et 50 ans, en phase de croissance"
        />
      </div>

      <div>
        <label htmlFor="tone" className="block text-sm font-medium text-foreground mb-1">
          Regles de ton (une par ligne)
        </label>
        <textarea
          id="tone"
          rows={4}
          value={toneRulesText}
          onChange={(e) => setToneRulesText(e.target.value)}
          disabled={isPending}
          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none disabled:opacity-50"
          placeholder={"Phrases courtes, une idee par ligne\nPartage une perspective, pas une lecon\nVulnerabilite acceptee quand elle est concrete"}
        />
      </div>

      <div>
        <label htmlFor="banned" className="block text-sm font-medium text-foreground mb-1">
          Vocabulaire interdit (separe par des virgules)
        </label>
        <textarea
          id="banned"
          rows={2}
          value={bannedWordsText}
          onChange={(e) => setBannedWordsText(e.target.value)}
          disabled={isPending}
          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none disabled:opacity-50"
        />
        <p className="mt-1 text-xs text-muted">
          Chaque mot listé ici sera refusé par le generateur de contenu.
        </p>
      </div>

      <div>
        <label htmlFor="anchors" className="block text-sm font-medium text-foreground mb-1">
          Ancrages concrets obligatoires (un par ligne)
        </label>
        <textarea
          id="anchors"
          rows={3}
          value={mandatoryAnchorsText}
          onChange={(e) => setMandatoryAnchorsText(e.target.value)}
          disabled={isPending}
          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none disabled:opacity-50"
        />
        <p className="mt-1 text-xs text-muted">
          Chaque post doit contenir au moins un de ces elements concrets.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Piliers de contenu (2 a 5)
        </label>
        <div className="space-y-3">
          {pillars.map((p, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={p.name}
                onChange={(e) => updatePillar(i, "name", e.target.value)}
                disabled={isPending}
                placeholder="Nom du pilier"
                className="w-40 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              />
              <input
                type="text"
                value={p.description}
                onChange={(e) => updatePillar(i, "description", e.target.value)}
                disabled={isPending}
                placeholder="Angle en 1 phrase"
                className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              />
              {pillars.length > 2 && (
                <button
                  type="button"
                  onClick={() => removePillar(i)}
                  disabled={isPending}
                  className="px-3 py-2 text-sm text-muted hover:text-error"
                >
                  Retirer
                </button>
              )}
            </div>
          ))}
        </div>
        {pillars.length < 5 && (
          <button
            type="button"
            onClick={addPillar}
            disabled={isPending}
            className="mt-3 text-sm text-primary hover:text-primary-dark"
          >
            + Ajouter un pilier
          </button>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-primary text-white py-3 rounded-xl hover:bg-primary-dark disabled:opacity-50 text-lg font-medium"
      >
        {isPending ? "Enregistrement..." : isFirstTime ? "Creer ma voix" : "Enregistrer"}
      </button>
    </form>
  );
}
