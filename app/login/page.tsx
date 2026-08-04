import Image from 'next/image';
import { brand } from '../../lib/brand';
import { LoginForm } from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = typeof params.next === 'string' && params.next.startsWith('/') ? params.next : '/';
  return (
    <main className="min-h-screen flex items-center justify-center bg-mist">
      <div className="w-full max-w-sm bg-paper p-8" style={{ border: '1px solid #e0e0e0' }}>
        <Image
          src={brand.wordmark}
          alt="UNSW"
          width={120}
          height={40}
          className="mb-6"
          unoptimized
        />
        <h1 className="mb-2 text-xl font-bold text-ink">{brand.name}</h1>
        <p className="mb-6 text-sm text-muted">Enter the demo password to continue.</p>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
