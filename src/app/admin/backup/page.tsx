'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';

export default function BackupPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async (type: 'config' | 'full') => {
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch(`/api/backup?type=${type}`);
      if (!res.ok) throw new Error('Export failed');

      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `superbowl-${type}-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setMessage(`${type === 'config' ? 'Config' : 'Full'} backup exported!`);
    } catch {
      setMessage('Export failed');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('This will overwrite existing data. Are you sure you want to restore from this backup?')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Import failed');
      }

      setMessage('Backup restored successfully!');
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Backup & Restore</h1>

      {message && (
        <div className={`mb-6 px-4 py-2 rounded-lg text-sm ${
          message.includes('success') || message.includes('exported') || message.includes('restored')
            ? 'bg-green-900/50 text-green-300'
            : 'bg-red-900/50 text-red-300'
        }`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-lg">Export Backup</h2>

          <div className="space-y-3">
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="font-medium mb-1">Config Only</h3>
              <p className="text-sm text-gray-400 mb-3">
                Exports game settings, payment methods, email settings, and email templates.
              </p>
              <Button
                variant="secondary"
                onClick={() => handleExport('config')}
                loading={loading}
              >
                Export Config
              </Button>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="font-medium mb-1">Full Backup</h3>
              <p className="text-sm text-gray-400 mb-3">
                Exports everything: settings, squares, grid numbers, scores, chat messages, and users (passwords excluded).
              </p>
              <Button
                onClick={() => handleExport('full')}
                loading={loading}
              >
                Export Full Backup
              </Button>
            </div>
          </div>
        </div>

        {/* Import */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-lg">Restore Backup</h2>
          <p className="text-sm text-gray-400">
            Upload a backup JSON file to restore. This will overwrite existing data.
          </p>
          <div className="bg-gray-800 rounded-lg p-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-600 file:text-white hover:file:bg-primary-700"
            />
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            <p>Supported backup types:</p>
            <ul className="list-disc list-inside">
              <li>Config-only backups (settings, templates)</li>
              <li>Full backups (all game data)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
