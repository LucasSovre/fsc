import type { Metadata } from "next";
import Link from "next/link";
import { session } from "../server/session";
import { Logout } from "./components/logout";

export const metadata: Metadata = {
  title: { default: "FSC — Fucking Simple Calendar", template: "%s — FSC" },
  description: "Un calendrier partagé pour deux. Commun ou solo, tout simplement.",
  manifest: "/manifest.webmanifest",
};

export const dynamic = "force-dynamic";
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const current = await session();
  return (
    <html lang="fr">
      <body>
        <a href="#contenu">Aller au contenu</a>
        <header>
          <p><Link href="/">FSC — Fucking Simple Calendar</Link></p>
          {current?.user.emailVerified ? <>
            <nav aria-label="Navigation principale"><Link href="/">Accueil</Link>{" · "}<Link href="/calendrier">Calendrier</Link>{" · "}<Link href="/evenements/nouveau">Créer</Link>{" · "}<Link href="/reglages">Réglages</Link>{" · "}<Link href="/claude">Connecter Claude</Link></nav>
            <p>{current.user.name} · {current.user.email}</p><Logout />
          </> : <nav><Link href="/connexion">Connexion</Link>{" · "}<Link href="/inscription">Créer un compte</Link></nav>}
        </header>
        <hr /><main id="contenu">{children}</main>
        <datalist id="timezones"><option value="Europe/Paris" /><option value="Europe/London" /><option value="America/Montreal" /><option value="America/New_York" /><option value="Asia/Tokyo" /><option value="UTC" /></datalist>
        <footer><hr /><p>FSC · logiciel libre · WTFPL v2</p></footer>
      </body>
    </html>
  );
}
