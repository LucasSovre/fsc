import type { Metadata, Viewport } from "next";
import Link from "next/link";
import localFont from "next/font/local";
import { session } from "../server/session";
import { AccountMenu } from "./components/account-menu";
import { Navigation } from "./components/navigation";
import "./globals.css";

const manrope = localFont({ src: "./fonts/Manrope.ttf", weight: "400 700", display: "swap", variable: "--font-manrope" });

export const viewport: Viewport = { themeColor: "#272725" };

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
    <html lang="fr" className={manrope.variable}>
      <body>
        <div className={`app-shell${current?.user.emailVerified ? " has-navigation" : ""}`}>
        <a className="skip-link" href="#contenu">Aller au contenu</a>
        <header className="app-header">
          {current?.user.emailVerified ? <AccountMenu name={current.user.name} email={current.user.email} /> : <>
            <Link className="brand" href="/"><span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span><span>FSC<span className="brand-name">Fucking Simple Calendar</span></span></Link>
            <nav className="guest-nav" aria-label="Compte"><Link href="/connexion">Connexion</Link></nav>
          </>}
        </header>
        <main id="contenu" tabIndex={-1}>{children}</main>
        <datalist id="timezones"><option value="Europe/Paris" /><option value="Europe/London" /><option value="America/Montreal" /><option value="America/New_York" /><option value="Asia/Tokyo" /><option value="UTC" /></datalist>
        <footer className="app-footer"><p>FSC · logiciel libre · WTFPL v2</p></footer>
        {current?.user.emailVerified && <Navigation />}
        </div>
      </body>
    </html>
  );
}
