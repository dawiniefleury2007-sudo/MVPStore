interface Props { className?: string; }

export default function AppleIcon({ className = 'w-5 h-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.7 12.7c0-2.1 1.7-3.1 1.8-3.2-1-.1-2.1-1.1-3.2-1.1-1.3-.1-2.5.8-3.1.8-.6 0-1.6-.8-2.7-.8-1.4 0-2.7.8-3.4 2.1-1.5 2.6-.4 6.5 1 8.6.7 1 1.5 2.1 2.6 2.1 1 0 1.4-.7 2.7-.7 1.3 0 1.6.7 2.7.7 1.1 0 1.8-1 2.5-2 .8-1.1 1.1-2.2 1.1-2.3-.1 0-2-.8-2-2.2Zm-2-5.6c.6-.8 1-1.8.9-2.8-.9 0-2 .6-2.6 1.3-.6.7-1 1.7-.9 2.7 1 .1 2-.5 2.6-1.2Z" />
    </svg>
  );
}
