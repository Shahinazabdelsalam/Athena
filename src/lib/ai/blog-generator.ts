import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

interface BlogInput {
  business: string;
  topic: string;
  longForm: boolean;
}

interface BlogOutput {
  title: string;
  metaDescription: string;
  content: string;
  wordCount: number;
}

const SYSTEM_PROMPT = `Tu es une redactrice de blog professionnelle specialisee dans le contenu SEO optimise pour les femmes entrepreneures francophones. Tu ecris dans un ton chaleureux, professionnel et accessible. Toute ta production doit etre en francais.

Regles importantes :
- Utilise "vous" (vouvoiement) pour t'adresser aux lectrices
- Ecris des phrases claires et courtes
- Donne des conseils pratiques et actionnables
- Utilise des exemples concrets lies a l'entrepreneuriat feminin
- Optimise naturellement pour le SEO sans bourrage de mots-cles

Format de reponse OBLIGATOIRE (respecte exactement ce format) :

TITRE: [titre accrocheur optimise SEO]

META: [meta description de 150-160 caracteres maximum]

ARTICLE:
[article complet en Markdown avec titres H2, listes, et paragraphes]`;

export async function generateBlogPost(input: BlogInput): Promise<BlogOutput> {
  const targetLength = input.longForm ? "2000" : "800";

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: input.longForm ? 4096 : 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Mon activite : ${input.business}

Sujet de l'article : ${input.topic}

Ecris un article de blog SEO complet en francais d'environ ${targetLength} mots. Inclus :
1. Un titre (H1) engageant et optimise pour les moteurs de recherche francophones
2. Une meta description (max 160 caracteres)
3. L'article complet avec :
   - Une introduction engageante
   - 3 a 5 sections avec des titres H2
   - Des conseils pratiques et actionnables
   - Une conclusion avec un appel a l'action`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  return parseBlogResponse(text);
}

function parseBlogResponse(text: string): BlogOutput {
  const titleMatch = text.match(/TITRE:\s*(.+)/);
  const metaMatch = text.match(/META:\s*(.+)/);
  const articleMatch = text.match(/ARTICLE:\s*([\s\S]+)/);

  const title = titleMatch?.[1]?.trim() || "Article sans titre";
  const metaDescription = metaMatch?.[1]?.trim() || "";
  const content = articleMatch?.[1]?.trim() || text;

  const wordCount = content.split(/\s+/).filter(Boolean).length;

  return { title, metaDescription, content, wordCount };
}
