"use client";

import { useRef, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export function MonthSwipe({ previousHref, nextHref, children }: { previousHref: string; nextHref: string; children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const gesture = useRef<{ id: number; x: number; y: number; started: number } | null>(null);
  const suppressClickUntil = useRef(0);
  return <div className="month-swipe" aria-busy={pending} onPointerDown={event => {
    if (pending || !event.isPrimary || event.pointerType === "mouse") return;
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, started: event.timeStamp };
  }} onPointerCancel={() => { gesture.current = null; }} onPointerUp={event => {
    const start = gesture.current;
    gesture.current = null;
    if (!start || start.id !== event.pointerId || pending) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5 || event.timeStamp - start.started > 1000) return;
    suppressClickUntil.current = Date.now() + 350;
    startTransition(() => router.push(dx < 0 ? nextHref : previousHref, { scroll: false }));
  }} onClickCapture={event => {
    if (Date.now() < suppressClickUntil.current) { event.preventDefault(); event.stopPropagation(); }
  }}>{children}</div>;
}
