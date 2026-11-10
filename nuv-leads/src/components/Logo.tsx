export function CloudMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#2B59FF" />
      <path d="M18 42a10 10 0 0 1 3-19.6A13 13 0 0 1 46 26a8 8 0 0 1 0 16Z" fill="#fff" />
    </svg>
  );
}

export function BigCloud({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 120" aria-hidden="true">
      <path d="M48 112a36 36 0 0 1 6-71.5A50 50 0 0 1 150 52a30 30 0 0 1 0 60Z" fill="#2B59FF" />
    </svg>
  );
}
