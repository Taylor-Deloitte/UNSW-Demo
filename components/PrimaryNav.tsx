'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { brand, tabs } from '../lib/brand';

export function PrimaryNav({ onToggleAudit }: { onToggleAudit: () => void }) {
  const pathname = usePathname();
  // onToggleAudit reserved for future re-add of the audit control; unused here.
  void onToggleAudit;

  return (
    <nav
      className="sticky top-0 z-40 flex flex-none items-center justify-between bg-paper"
      style={{ height: 70, padding: '0 36px', borderBottom: '1px solid #e0e0e0' }}
    >
      <div className="flex items-center" style={{ gap: 26 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={brand.wordmark} alt="UNSW" style={{ height: 36, width: 'auto' }} />
        <div className="flex items-center" style={{ gap: 24, fontSize: 15 }}>
          {tabs.map((t) => {
            const active = pathname === t.href || (pathname === '/' && t.href === '/segments');
            return (
              <Link
                key={t.href}
                href={t.href}
                className={active ? 'font-bold text-ink' : 'font-medium text-muted'}
                style={
                  active
                    ? {
                        borderBottom: '3px solid #FFD100',
                        paddingBottom: 18,
                        marginBottom: -21,
                      }
                    : undefined
                }
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>
      <Link
        href="/segments"
        className="bg-unsw-yellow text-ink transition-colors hover:bg-ink hover:text-unsw-yellow"
        style={{ fontSize: 14, fontWeight: 700, padding: '9px 18px' }}
      >
        Save to AEP
      </Link>
    </nav>
  );
}
