import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from '../components/AppShell';
import './globals.css';

export const metadata: Metadata = {
  title: 'UNSW Online: Marketing Intelligence',
  description: 'Demo: agentic layer on top of AEP / AJO / Dynamics for lifelong learning',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
