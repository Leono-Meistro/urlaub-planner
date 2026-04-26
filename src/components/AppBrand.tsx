import Link from 'next/link';
import { CalendarRange } from 'lucide-react';

interface AppBrandProps {
  title?: string;
  subtitle?: string;
  href?: string;
  variant?: 'inline' | 'stacked';
  className?: string;
}

function BrandContent({
  title = 'Urlaubsplanung',
  subtitle,
  variant = 'inline',
}: Omit<AppBrandProps, 'href' | 'className'>) {
  if (variant === 'stacked') {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[1.75rem] bg-slate-900 text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.65)]">
          <CalendarRange size={32} strokeWidth={1.9} />
        </div>
        <div className="mt-5 space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            {title}
          </h1>
          {subtitle && (
            <p className="max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-[0_14px_28px_-18px_rgba(15,23,42,0.65)]">
        <CalendarRange size={20} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-base font-semibold tracking-tight text-slate-950">
          {title}
        </p>
        {subtitle && (
          <p className="truncate text-sm text-slate-500">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

export default function AppBrand({
  href,
  className = '',
  ...props
}: AppBrandProps) {
  const content = <BrandContent {...props} />;

  if (!href) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Link href={href} className={`inline-flex ${className}`}>
      {content}
    </Link>
  );
}
