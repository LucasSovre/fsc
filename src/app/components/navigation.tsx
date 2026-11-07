"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, MotionConfig } from "motion/react";
import { Icon } from "./ui-icon";

const destinations = [
  { href: "/", label: "Accueil", icon: "home" },
  { href: "/calendrier", label: "Calendrier", icon: "calendar" },
  { href: "/todo", label: "Todo", icon: "todo" },
  { href: "/evenements/nouveau", label: "Créer", icon: "plus" },
  { href: "/reglages", label: "Réglages", icon: "settings" },
] as const;

const isActive = (pathname: string, href: string) => {
  if (href === "/") return pathname === "/";
  if (href === "/calendrier") return pathname === href || (pathname.startsWith("/evenements/") && pathname !== "/evenements/nouveau");
  if (href === "/reglages" && (pathname.startsWith("/calendriers-lies") || pathname.startsWith("/claude"))) return true;
  return pathname === href || pathname.startsWith(`${href}/`);
};

export function Navigation() {
  const pathname = usePathname();
  if (pathname === "/evenements/nouveau" || pathname.endsWith("/modifier")) return null;
  return <MotionConfig reducedMotion="user">
    <nav className="bottom-nav" aria-label="Navigation principale">
      {destinations.map(({ href, label, icon }) => {
        const active = isActive(pathname, href);
        return <Link key={href} href={href} aria-current={active ? "page" : undefined}>
          {active && <motion.span className="nav-pill" layoutId="nav-pill" transition={{ type: "spring", stiffness: 500, damping: 35 }} />}
          <Icon name={icon} /><span>{label}</span>
        </Link>;
      })}
    </nav>
  </MotionConfig>;
}
