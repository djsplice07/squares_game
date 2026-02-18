'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import Image from 'next/image';

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Admin account fields
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');

  // Game settings fields
  const [title, setTitle] = useState('Super Bowl Squares');
  const [commissioner, setCommissioner] = useState('');
  const [eventName, setEventName] = useState('Super Bowl');
  const [betAmount, setBetAmount] = useState('10');

  const handleSubmit = async () => {
    if (step === 1) {
      if (!adminName || !adminEmail || !adminPassword) {
        setError('All fields are required');
        return;
      }
      if (adminPassword !== adminConfirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (adminPassword.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
      setError('');
      setStep(2);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin: { name: adminName, email: adminEmail, password: adminPassword },
          settings: {
            title,
            commissioner,
            eventName,
            betAmount: parseFloat(betAmount) || 10,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Setup failed');
      }

      router.push('/login');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image
            src="/images/superbowlnumber.png"
            alt="Super Bowl"
            width={80}
            height={80}
            className="mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold">Welcome!</h1>
          <p className="text-gray-400 mt-2">Let&apos;s set up your Super Bowl Squares game</p>
        </div>

        <div className="card">
          {/* Progress */}
          <div className="flex items-center gap-2 mb-6">
            <div className={`h-1 flex-1 rounded ${step >= 1 ? 'bg-primary-500' : 'bg-gray-700'}`} />
            <div className={`h-1 flex-1 rounded ${step >= 2 ? 'bg-primary-500' : 'bg-gray-700'}`} />
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg px-4 py-2 mb-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Create Admin Account</h2>
              <Input
                id="adminName"
                label="Name"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="Your name"
              />
              <Input
                id="adminEmail"
                label="Email"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@example.com"
              />
              <Input
                id="adminPassword"
                label="Password"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
              <Input
                id="adminConfirmPassword"
                label="Confirm Password"
                type="password"
                value={adminConfirmPassword}
                onChange={(e) => setAdminConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
              />
              <Button onClick={handleSubmit} className="w-full">
                Next
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Game Settings</h2>
              <Input
                id="title"
                label="Page Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Super Bowl Squares"
              />
              <Input
                id="commissioner"
                label="Commissioner Name"
                value={commissioner}
                onChange={(e) => setCommissioner(e.target.value)}
                placeholder="Your name"
              />
              <Input
                id="eventName"
                label="Event Name"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Super Bowl LIX"
              />
              <Input
                id="betAmount"
                label="Bet Amount ($)"
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                placeholder="10"
              />
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleSubmit} loading={loading} className="flex-1">
                  Complete Setup
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
