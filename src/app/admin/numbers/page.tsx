'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

interface GridNumber {
  position: number;
  nfcNumber: number;
  afcNumber: number;
}

export default function NumbersPage() {
  const [gridNumbers, setGridNumbers] = useState<GridNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [canGenerate, setCanGenerate] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/numbers').then((r) => r.json()),
      fetch('/api/squares').then((r) => r.json()),
    ]).then(([numbers, squares]) => {
      setGridNumbers(numbers.gridNumbers || []);
      const claimed = squares.filter(
        (s: any) => s.userId || s.guestName
      ).length;
      setCanGenerate(claimed === 100 && (!numbers.gridNumbers || numbers.gridNumbers.length === 0));
      setLoading(false);
    });
  }, []);

  const handleGenerate = async () => {
    if (!confirm('This will randomly assign numbers 0-9 to the grid. This cannot be undone. Continue?')) {
      return;
    }

    setGenerating(true);
    setMessage('');

    try {
      const res = await fetch('/api/numbers', {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Generation failed');
      }

      const data = await res.json();
      setGridNumbers(data.gridNumbers);
      setCanGenerate(false);
      setMessage('Numbers generated successfully!');
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <p className="text-gray-400">Loading...</p>;

  const hasNumbers = gridNumbers.length === 10;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Number Assignment</h1>
        {!hasNumbers && (
          <Button onClick={handleGenerate} loading={generating} disabled={!canGenerate}>
            {canGenerate ? 'Generate Numbers' : 'All 100 squares must be filled'}
          </Button>
        )}
      </div>

      {message && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${
          message.includes('success') ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
        }`}>
          {message}
        </div>
      )}

      {hasNumbers ? (
        <div className="card">
          <h2 className="font-semibold mb-4">Assigned Numbers</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="pb-2 text-left">Position</th>
                  {gridNumbers
                    .sort((a, b) => a.position - b.position)
                    .map((g) => (
                      <th key={g.position} className="pb-2 text-center w-12">
                        {g.position}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-800/50">
                  <td className="py-2 font-medium text-primary-400">NFC</td>
                  {gridNumbers
                    .sort((a, b) => a.position - b.position)
                    .map((g) => (
                      <td key={g.position} className="py-2 text-center font-mono font-bold">
                        {g.nfcNumber}
                      </td>
                    ))}
                </tr>
                <tr>
                  <td className="py-2 font-medium text-red-400">AFC</td>
                  {gridNumbers
                    .sort((a, b) => a.position - b.position)
                    .map((g) => (
                      <td key={g.position} className="py-2 text-center font-mono font-bold">
                        {g.afcNumber}
                      </td>
                    ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card text-center py-12">
          <p className="text-gray-400 text-lg">Numbers have not been generated yet.</p>
          <p className="text-gray-500 text-sm mt-2">
            All 100 squares must be filled before numbers can be assigned.
          </p>
        </div>
      )}
    </div>
  );
}
