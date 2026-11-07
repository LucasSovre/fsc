export function Icon({ name }: { name: "home" | "calendar" | "todo" | "plus" | "settings" | "arrow" }) {
  const paths = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="4" /><path d="M7 3v4m10-4v4M3 11h18m-14 4h2m6 0h2m-10 3h2" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    todo: <><rect x="3" y="3" width="18" height="18" rx="4" /><path d="m7 8 1.5 1.5L11 7M14 8h3m-10 7 1.5 1.5L11 14m3 1h3" /></>,
    settings: <><polygon points="19.11,9.05 21.85,10.26 21.85,13.74 19.11,14.95 20.19,17.74 17.74,20.19 14.95,19.11 13.74,21.85 10.26,21.85 9.05,19.11 6.26,20.19 3.81,17.74 4.89,14.95 2.15,13.74 2.15,10.26 4.89,9.05 3.81,6.26 6.26,3.81 9.05,4.89 10.26,2.15 13.74,2.15 14.95,4.89 17.74,3.81 20.19,6.26" /><circle cx="12" cy="12" r="3" /></>,
    arrow: <path d="M6 18 18 6M6 6h12v12" />,
  };
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
