'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function ScoresPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [nfcFirst, setNfcFirst] = useState('');
  const [afcFirst, setAfcFirst] = useState('');
  const [nfcHalf, setNfcHalf] = useState('');
  const [afcHalf, setAfcHalf] = useState('');
  const [nfcThird, setNfcThird] = useState('');
  const [afcThird, setAfcThird] = useState('');
  const [nfcFinal, setNfcFinal] = useState('');
  const [afcFinal, setAfcFinal] = useState('');

  const [settings, setSettings] = useState<any>(null);
  const [winners, setWinners] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/scores').then((r) => r.json()),
      fetch('/api/settings').then((r) => r.json()),
    ]).then(([scoresData, settingsData]) => {
      setSettings(settingsData);
      if (scoresData.scores) {
        const s = scoresData.scores;
        setNfcFirst(s.nfcFirst?.toString() || '');
        setAfcFirst(s.afcFirst?.toString() || '');
        setNfcHalf(s.nfcHalf?.toString() || '');
        setAfcHalf(s.afcHalf?.toString() || '');
        setNfcThird(s.nfcThird?.toString() || '');
        setAfcThird(s.afcThird?.toString() || '');
        setNfcFinal(s.nfcFinal?.toString() || '');
        setAfcFinal(s.afcFinal?.toString() || '');
      }
      setWinners(scoresData.winners || null);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/scores', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nfcFirst: nfcFirst ? parseInt(nfcFirst) : null,
          afcFirst: afcFirst ? parseInt(afcFirst) : null,
          nfcHalf: nfcHalf ? parseInt(nfcHalf) : null,
          afcHalf: afcHalf ? parseInt(afcHalf) : null,
          nfcThird: nfcThird ? parseInt(nfcThird) : null,
          afcThird: afcThird ? parseInt(afcThird) : null,
          nfcFinal: nfcFinal ? parseInt(nfcFinal) : null,
          afcFinal: afcFinal ? parseInt(afcFinal) : null,
        }),
      });

      if (!res.ok) throw new Error('Save failed');
      const data = await res.json();
      setWinners(data.winners || null);
      setMessage('Scores saved and winners calculated!');
    } catch {
      setMessage('Failed to save scores');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-400">Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Game Scores</h1>
        <Button onClick={handleSave} loading={saving}>
          Save & Calculate Winners
        </Button>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${
          message.includes('saved') ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
        }`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-lg mb-4">Enter Scores</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm text-gray-400 mb-2">Q1 (End of First Quarter)</h3>
              <div className="grid grid-cols-2 gap-3">
                <Input id="nfcFirst" label={settings?.nfcTeam || 'NFC'} type="number" value={nfcFirst} onChange={(e) => setNfcFirst(e.target.value)} />
                <Input id="afcFirst" label={settings?.afcTeam || 'AFC'} type="number" value={afcFirst} onChange={(e) => setAfcFirst(e.target.value)} />
              </div>
            </div>
            <div>
              <h3 className="text-sm text-gray-400 mb-2">Q2 (Halftime)</h3>
              <div className="grid grid-cols-2 gap-3">
                <Input id="nfcHalf" label={settings?.nfcTeam || 'NFC'} type="number" value={nfcHalf} onChange={(e) => setNfcHalf(e.target.value)} />
                <Input id="afcHalf" label={settings?.afcTeam || 'AFC'} type="number" value={afcHalf} onChange={(e) => setAfcHalf(e.target.value)} />
              </div>
            </div>
            <div>
              <h3 className="text-sm text-gray-400 mb-2">Q3 (End of Third Quarter)</h3>
              <div className="grid grid-cols-2 gap-3">
                <Input id="nfcThird" label={settings?.nfcTeam || 'NFC'} type="number" value={nfcThird} onChange={(e) => setNfcThird(e.target.value)} />
                <Input id="afcThird" label={settings?.afcTeam || 'AFC'} type="number" value={afcThird} onChange={(e) => setAfcThird(e.target.value)} />
              </div>
            </div>
            <div>
              <h3 className="text-sm text-gray-400 mb-2">Final</h3>
              <div className="grid grid-cols-2 gap-3">
                <Input id="nfcFinal" label={settings?.nfcTeam || 'NFC'} type="number" value={nfcFinal} onChange={(e) => setNfcFinal(e.target.value)} />
                <Input id="afcFinal" label={settings?.afcTeam || 'AFC'} type="number" value={afcFinal} onChange={(e) => setAfcFinal(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {winners && (
          <div className="card">
            <h2 className="font-semibold text-lg mb-4">Winners</h2>
            <div className="space-y-3">
              {winners.first && (
                <div className="bg-green-900/30 border border-green-800 rounded-lg p-3">
                  <p className="text-sm text-green-400">Q1 Winner</p>
                  <p className="font-bold">{winners.first.name}</p>
                  <p className="text-xs text-gray-400">Square {winners.first.position}</p>
                </div>
              )}
              {winners.half && (
                <div className="bg-green-900/30 border border-green-800 rounded-lg p-3">
                  <p className="text-sm text-green-400">Q2 (Halftime) Winner</p>
                  <p className="font-bold">{winners.half.name}</p>
                  <p className="text-xs text-gray-400">Square {winners.half.position}</p>
                </div>
              )}
              {winners.third && (
                <div className="bg-green-900/30 border border-green-800 rounded-lg p-3">
                  <p className="text-sm text-green-400">Q3 Winner</p>
                  <p className="font-bold">{winners.third.name}</p>
                  <p className="text-xs text-gray-400">Square {winners.third.position}</p>
                </div>
              )}
              {winners.final && (
                <div className="bg-yellow-900/30 border border-yellow-800 rounded-lg p-3">
                  <p className="text-sm text-yellow-400">Final Winner</p>
                  <p className="font-bold">{winners.final.name}</p>
                  <p className="text-xs text-gray-400">Square {winners.final.position}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
