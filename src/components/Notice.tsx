import type { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

type NoticeTone = 'error' | 'success' | 'info' | 'warning';

interface NoticeProps {
  tone?: NoticeTone;
  title?: string;
  children: ReactNode;
  className?: string;
}

const toneStyles = {
  error: {
    wrapper: 'border-red-200 bg-red-50/90 text-red-800',
    icon: AlertCircle,
    iconClass: 'text-red-600',
  },
  success: {
    wrapper: 'border-emerald-200 bg-emerald-50/90 text-emerald-800',
    icon: CheckCircle2,
    iconClass: 'text-emerald-600',
  },
  info: {
    wrapper: 'border-blue-200 bg-blue-50/90 text-blue-800',
    icon: Info,
    iconClass: 'text-blue-600',
  },
  warning: {
    wrapper: 'border-amber-200 bg-amber-50/90 text-amber-800',
    icon: AlertTriangle,
    iconClass: 'text-amber-600',
  },
} satisfies Record<
  NoticeTone,
  { wrapper: string; icon: typeof AlertCircle; iconClass: string }
>;

export default function Notice({
  tone = 'info',
  title,
  children,
  className = '',
}: NoticeProps) {
  const style = toneStyles[tone];
  const Icon = style.icon;

  return (
    <div
      className={`flex items-start gap-3 rounded-3xl border px-4 py-3.5 text-sm shadow-[0_10px_30px_-24px_rgba(15,23,42,0.45)] ${style.wrapper} ${className}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <Icon size={18} className={`mt-0.5 shrink-0 ${style.iconClass}`} />
      <div className="min-w-0">
        {title && <p className="font-medium">{title}</p>}
        <div className={title ? 'mt-1' : ''}>{children}</div>
      </div>
    </div>
  );
}
