'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface Square {
  position: string;
  confirmed: boolean;
  firstWin: boolean;
  halfWin: boolean;
  thirdWin: boolean;
  finalWin: boolean;
  signupDate: string | null;
}

export default function MySquaresPage() {
  const { data: session } = useSession();
  const [squares, setSquares] = useState<Square[]>([]);
  const [loading, setLoading] = useState(true);

  // Password change modal state
  const [pwModal, setPwModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    fetch('/api/squares')
      .then((res) => res.json())
      .then((data) => {
        const mySquares = data.filter(
          (s: any) => s.userId === (session?.user as any)?.id
        );
        setSquares(mySquares);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [session]);

  const handleChangePassword = async () => {
    setPwError('');
    setPwSuccess('');

    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPwError('New password must be at least 8 characters');
      return;
    }

    setPwLoading(true);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwError(data.error || 'Failed to change password');
      } else {
        setPwSuccess('Password changed successfully. A confirmation email has been sent.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setPwError('Failed to change password');
    } finally {
      setPwLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My Squares</h1>
          <div className="flex gap-2">
            <button onClick={() => { setPwModal(true); setPwError(''); setPwSuccess(''); }} className="btn-secondary text-sm">
              Change Password
            </button>
            <Link href="/" className="btn-secondary text-sm">
              Back to Grid
            </Link>
          </div>
        </div>

        {squares.length === 0 ? (
          <div className="card text-center">
            <p className="text-gray-400">You haven&apos;t purchased any squares yet.</p>
            <Link href="/" className="btn-primary mt-4 inline-block">
              Go to Grid
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {squares.map((sq) => {
              const wins = [];
              if (sq.firstWin) wins.push('Q1');
              if (sq.halfWin) wins.push('Q2');
              if (sq.thirdWin) wins.push('Q3');
              if (sq.finalWin) wins.push('Final');

              return (
                <div key={sq.position} className="card flex items-center justify-between">
                  <div>
                    <span className="text-lg font-bold">Square {sq.position}</span>
                    <span
                      className={`ml-3 text-xs px-2 py-0.5 rounded-full ${
                        sq.confirmed
                          ? 'bg-green-900 text-green-300'
                          : 'bg-yellow-900 text-yellow-300'
                      }`}
                    >
                      {sq.confirmed ? 'Confirmed' : 'Pending'}
                    </span>
                  </div>
                  {wins.length > 0 && (
                    <span className="text-yellow-400 font-bold text-sm">
                      Winner: {wins.join(', ')}
                    </span>
                  )}
                </div>
              );
            })}
            <p className="text-sm text-gray-500 text-center mt-4">
              {squares.length} square{squares.length !== 1 ? 's' : ''} total
            </p>
          </div>
        )}
      </div>

      <Modal open={pwModal} onClose={() => setPwModal(false)} title="Change Password">
        <div className="space-y-4">
          {pwError && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg px-4 py-2 text-sm text-red-300">
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div className="bg-green-900/50 border border-green-700 rounded-lg px-4 py-2 text-sm text-green-300">
              {pwSuccess}
            </div>
          )}
          <Input
            id="currentPassword"
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Input
            id="newPassword"
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min 8 characters"
          />
          <Input
            id="confirmPassword"
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setPwModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleChangePassword} loading={pwLoading} className="flex-1">
              Change Password
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
