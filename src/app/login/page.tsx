'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError('Invalid email or password');
    } else {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image
            src="/images/superbowlnumber.png"
            alt="Super Bowl"
            width={60}
            height={60}
            className="mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold">Sign In</h1>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg px-4 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <Input
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
          />

          <Input
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            required
          />

          <Button type="submit" loading={loading} className="w-full">
            Sign In
          </Button>

          <p className="text-center text-sm text-gray-400">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary-400 hover:text-primary-300">
              Register
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
