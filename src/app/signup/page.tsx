'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useWebSocket } from '@/lib/ws';
import Link from 'next/link';

interface PaymentMethod {
  type: string;
  value: string;
  enabled: boolean;
}

interface SettingsData {
  betAmount: number;
  graceHours: number;
  paymentInstructions: string;
  paymentMethods: PaymentMethod[];
}

const PAYMENT_LABELS: Record<string, string> = {
  VENMO: 'Venmo',
  PAYPAL: 'PayPal',
  CASHAPP: 'Cash App',
  ZELLE: 'Zelle',
  CASH: 'Cash',
};

function SignupForm() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { notifySquaresChanged } = useWebSocket();

  const squaresParam = searchParams.get('squares') || '';
  const positions = squaresParam.split(',').filter(Boolean);

  const [mode, setMode] = useState<'guest' | 'account'>('guest');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [settings, setSettings] = useState<SettingsData | null>(null);

  useEffect(() => {
    if (session?.user) {
      setGuestName(session.user.name || '');
      setGuestEmail(session.user.email || '');
    }
  }, [session]);

  if (positions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card text-center">
          <h1 className="text-xl font-bold mb-2">No Squares Selected</h1>
          <p className="text-gray-400 mb-4">Go back to the grid and select your squares.</p>
          <Link href="/" className="btn-primary">
            Back to Grid
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    const totalCost = settings ? settings.betAmount * positions.length : null;
    const enabledPayments = settings?.paymentMethods?.filter((pm) => pm.enabled) || [];

    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card text-center max-w-md">
          <div className="text-4xl mb-4">&#127944;</div>
          <h1 className="text-xl font-bold mb-2">Squares Claimed!</h1>
          <p className="text-gray-400 mb-2">
            You have claimed {positions.length} square{positions.length !== 1 ? 's' : ''}: {positions.join(', ')}
          </p>
          <p className="text-sm text-yellow-400 mb-4">
            Your squares will appear as pending until the commissioner confirms payment.
          </p>

          {totalCost !== null && (
            <div className="bg-gray-800 rounded-lg p-4 mb-4 text-left space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Total Due</span>
                <span className="text-lg font-bold text-green-400">${totalCost.toFixed(2)}</span>
              </div>

              {settings?.graceHours && (
                <p className="text-xs text-gray-500">
                  Please pay within {settings.graceHours} hours to keep your squares.
                </p>
              )}

              {settings?.paymentInstructions && (
                <p className="text-sm text-gray-300">{settings.paymentInstructions}</p>
              )}

              {enabledPayments.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-gray-700">
                  <p className="text-sm font-medium text-gray-300">Payment Methods</p>
                  {enabledPayments.map((pm, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{PAYMENT_LABELS[pm.type] || pm.type}</span>
                      <span className="text-white font-mono">{pm.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <Link href="/" className="btn-primary">
            Back to Grid
          </Link>
        </div>
      </div>
    );
  }

  const purchaseSquares = async () => {
    const res = await fetch('/api/squares', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        positions,
        guestName: session ? undefined : guestName,
        guestEmail: session ? undefined : guestEmail,
        notes,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Purchase failed');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // If creating an account (and not already signed in)
      if (mode === 'account' && !session) {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters');
        }

        // Create account
        const createRes = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: guestName,
            email: guestEmail,
            password,
          }),
        });

        if (!createRes.ok) {
          const data = await createRes.json();
          throw new Error(data.error || 'Account creation failed');
        }

        // Sign in with the new account
        const signInRes = await signIn('credentials', {
          redirect: false,
          email: guestEmail,
          password,
        });

        if (signInRes?.error) {
          throw new Error('Account created but sign-in failed. Please log in manually and try again.');
        }
      }

      // Purchase squares
      await purchaseSquares();
      notifySquaresChanged();

      // Fetch settings for payment info display
      try {
        const settingsRes = await fetch('/api/settings');
        if (settingsRes.ok) {
          const data = await settingsRes.json();
          setSettings(data);
        }
      } catch {
        // Non-critical — just won't show payment info
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">Purchase Squares</h1>
          <p className="text-gray-400 mt-1">
            Claiming {positions.length} square{positions.length !== 1 ? 's' : ''}: {positions.join(', ')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg px-4 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          {!session && (
            <>
              <div className="flex rounded-lg overflow-hidden border border-gray-700">
                <button
                  type="button"
                  onClick={() => setMode('guest')}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    mode === 'guest'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Continue as Guest
                </button>
                <button
                  type="button"
                  onClick={() => setMode('account')}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    mode === 'account'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Create Account
                </button>
              </div>

              <Input
                id="guestName"
                label="Your Name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Full name"
                required
              />
              <Input
                id="guestEmail"
                label="Email"
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />

              {mode === 'account' && (
                <>
                  <Input
                    id="password"
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                  />
                  <Input
                    id="confirmPassword"
                    label="Confirm Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                  />
                </>
              )}
            </>
          )}

          {session && (
            <p className="text-sm text-gray-400">
              Purchasing as <strong>{session.user.name}</strong> ({session.user.email})
            </p>
          )}

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-300">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field resize-none"
              rows={3}
              placeholder="Any notes for the commissioner..."
              maxLength={500}
            />
          </div>

          <div className="flex gap-3">
            <Link href="/" className="btn-secondary flex-1 text-center">
              Cancel
            </Link>
            <Button type="submit" loading={loading} className="flex-1">
              {mode === 'account' && !session ? 'Create Account & Purchase' : 'Confirm Purchase'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>}>
      <SignupForm />
    </Suspense>
  );
}
