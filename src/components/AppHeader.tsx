import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarRange } from 'lucide-react';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  inlineActions?: ReactNode;
  actions?: ReactNode;
  sticky?: boolean;
  className?: string;
}

export default function AppHeader({
  title = 'Urlaubsplanung',
  subtitle,
  backHref,
  backLabel = 'Zurück',
  inlineActions,
  actions,
  sticky = false,
  className = '',
}: AppHeaderProps) {
  return (
    <header className={`app-header ${sticky ? 'sticky top-3 z-20' : ''} ${className}`}>
      <div className="app-header-main">
        {backHref && (
          <Link href={backHref} className="app-header-back" aria-label={backLabel}>
            <ArrowLeft size={18} />
            <span>{backLabel}</span>
          </Link>
        )}

        <Link href="/" className="app-header-brand" aria-label="Startseite">
          <span className="app-header-logo">
            <CalendarRange size={19} strokeWidth={2} />
          </span>
          <span className="app-header-copy">
            <span className="app-header-title">{title}</span>
            {subtitle && <span className="app-header-subtitle">{subtitle}</span>}
          </span>
        </Link>

        {inlineActions && (
          <div className="app-header-inline-actions">
            {inlineActions}
          </div>
        )}
      </div>

      {actions && (
        <div className="app-header-actions">
          {actions}
        </div>
      )}
    </header>
  );
}
