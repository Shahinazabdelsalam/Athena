import Link from "next/link";

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-purple-50 to-white py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-6">
            Creez vos articles de blog{" "}
            <span className="text-primary">en un clic</span>
          </h1>
          <p className="text-lg text-muted mb-8 max-w-2xl mx-auto">
            Athena genere des articles de blog SEO professionnels en francais,
            specialement concus pour les femmes entrepreneures. Pas besoin de
            savoir ecrire — decrivez votre activite, choisissez un sujet, et
            c&apos;est pret.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-primary text-white text-lg px-8 py-4 rounded-xl hover:bg-primary-dark font-medium"
          >
            Commencer gratuitement
          </Link>
          <p className="mt-3 text-sm text-muted">
            3 articles gratuits par mois — sans carte bancaire
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-2xl font-bold text-center mb-12">
            Comment ca marche ?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="font-semibold mb-2">Decrivez votre activite</h3>
              <p className="text-sm text-muted">
                En quelques mots, expliquez ce que vous faites. Par exemple :
                &quot;coaching pour femmes entrepreneures&quot;.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="font-semibold mb-2">Choisissez un sujet</h3>
              <p className="text-sm text-muted">
                Tapez le sujet qui vous interesse ou laissez Athena vous
                proposer des idees.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="font-semibold mb-2">Copiez votre article</h3>
              <p className="text-sm text-muted">
                En 30 secondes, recevez un article complet avec titre, contenu
                SEO et meta description. Copiez et publiez !
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 bg-surface">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-2xl font-bold text-center mb-12">
            Tarifs simples
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            <div className="bg-white rounded-xl border border-border p-6">
              <h3 className="font-semibold text-lg mb-1">Gratuit</h3>
              <p className="text-3xl font-bold mb-4">
                0 &euro;
                <span className="text-sm text-muted font-normal">/mois</span>
              </p>
              <ul className="space-y-2 text-sm text-muted mb-6">
                <li>3 articles par mois</li>
                <li>Articles standards (~800 mots)</li>
                <li>Meta description SEO</li>
                <li>Historique des 5 derniers articles</li>
              </ul>
              <Link
                href="/signup"
                className="block text-center border border-primary text-primary px-4 py-2 rounded-lg hover:bg-primary/5"
              >
                Commencer
              </Link>
            </div>
            <div className="bg-white rounded-xl border-2 border-primary p-6 relative">
              <span className="absolute -top-3 right-4 bg-primary text-white text-xs px-3 py-1 rounded-full">
                Populaire
              </span>
              <h3 className="font-semibold text-lg mb-1">Pro</h3>
              <p className="text-3xl font-bold mb-4">
                9 &euro;
                <span className="text-sm text-muted font-normal">/mois</span>
              </p>
              <ul className="space-y-2 text-sm text-muted mb-6">
                <li>Articles illimites</li>
                <li>Articles longs (~2000 mots)</li>
                <li>Meta description SEO</li>
                <li>Suggestions de sujets IA</li>
                <li>Historique illimite</li>
              </ul>
              <Link
                href="/signup"
                className="block text-center bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark"
              >
                Passer au Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="mx-auto max-w-4xl px-4 text-center text-sm text-muted">
          <p>Athena — Cree avec soin pour les femmes entrepreneures</p>
        </div>
      </footer>
    </div>
  );
}
