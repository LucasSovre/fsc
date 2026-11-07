"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./ui-icon";

const destinations = [
  { href: "/", label: "Accueil", icon: "home" },
  { href: "/calendrier", label: "Calendrier", icon: "calendar" },
  { href: "/todo", label: "Todo", icon: "todo" },
  { href: "/evenements/nouveau", label: "Créer", icon: "plus" },
  { href: "/reglages", label: "Réglages", icon: "settings" },
] as const;

export function Navigation() {
  const pathname = usePathname();
  return <nav className="bottom-nav" aria-label="Navigation principale">
    {destinations.map(({ href, label, icon }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>
      <Icon name={icon} /><span>{label}</span>
    </Link>)}
  </nav>;
}
