'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

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
          <Link href="/" className="btn-secondary text-sm">
            Back to Grid
          </Link>
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
    </div>
  );
}
