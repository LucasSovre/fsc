"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Logout } from "./logout";

export function AccountMenu({ name, email }: { name: string; email: string }) {
  const menu = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useEffect(() => { menu.current?.hidePopover(); }, [pathname]);
  return <>
    <button type="button" className="brand brand-button" popoverTarget="menu-compte" aria-label="Ouvrir le menu du compte">
      <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
      <span>FSC<span className="brand-name">Fucking Simple Calendar</span></span>
      <svg className="brand-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
    </button>
    <div ref={menu} id="menu-compte" className="account-menu" popover="auto" aria-label="Compte">
      <div className="account"><p><strong>{name}</strong><span>{email}</span></p>
        <div className="account-actions"><Link href="/calendriers-lies" onClick={() => menu.current?.hidePopover()}>Calendriers liés</Link><Link href="/claude" onClick={() => menu.current?.hidePopover()}>Connecter Claude</Link><Logout /></div>
      </div>
    </div>
  </>;
}
