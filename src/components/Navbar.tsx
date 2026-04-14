"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="border-b border-border bg-white">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-primary">
          Athena
        </Link>

        <div className="flex items-center gap-4">
          {session ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm text-muted hover:text-foreground"
              >
                Mes articles
              </Link>
              <Link
                href="/generate"
                className="text-sm bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark"
              >
                Nouvel article
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-sm text-muted hover:text-foreground"
              >
                Deconnexion
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-muted hover:text-foreground"
              >
                Connexion
              </Link>
              <Link
                href="/signup"
                className="text-sm bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark"
              >
                Commencer gratuitement
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
