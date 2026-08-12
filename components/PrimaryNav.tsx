'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { brand, tabs } from '../lib/brand';

export function PrimaryNav() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky top-0 z-40 flex flex-none items-center bg-paper"
      style={{ height: 70, padding: '0 36px', borderBottom: '1px solid #e0e0e0' }}
    >
      <div className="flex items-center" style={{ gap: 26 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={brand.wordmark} alt="UNSW" style={{ height: 36, width: 'auto' }} />
        <div className="flex items-center" style={{ gap: 24, fontSize: 15 }}>
          {tabs.map((t) => {
            const active =
              pathname === t.href || (pathname === '/' && t.href === '/course-intelligence');
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
    </nav>
  );
}
