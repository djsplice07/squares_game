'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useWebSocket } from '@/lib/ws';

interface Square {
  id: string;
  position: string;
  userId: string | null;
  guestName: string | null;
  guestEmail: string | null;
  notes: string | null;
  confirmed: boolean;
  signupDate: string | null;
  user: { name: string; email: string } | null;
}

export default function SquaresManagementPage() {
  const [squares, setSquares] = useState<Square[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'available'>('all');
  const [editModal, setEditModal] = useState<Square | null>(null);
  const [reserveModal, setReserveModal] = useState(false);
  const [reservePosition, setReservePosition] = useState('');
  const [reserveName, setReserveName] = useState('');
  const [reserveEmail, setReserveEmail] = useState('');
  const { notifySquaresChanged } = useWebSocket();

  const fetchSquares = () => {
    fetch('/api/squares')
      .then((res) => res.json())
      .then(setSquares)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSquares();
  }, []);

  const handleAction = async (position: string, action: string, extra?: any) => {
    await fetch('/api/squares', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ position, action, ...extra }),
    });
    fetchSquares();
    notifySquaresChanged();
  };

  const handleConfirmAll = async () => {
    const pendingSquares = squares.filter(
      (s) => (s.userId || s.guestName) && !s.confirmed
    );
    for (const sq of pendingSquares) {
      await handleAction(sq.position, 'confirm');
    }
  };

  const parsePositions = (input: string): string[] => {
    const positions: string[] = [];
    const parts = input.split(',').map((s) => s.trim()).filter(Boolean);
    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-').map((s) => s.trim());
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end) && start <= end && start >= 0 && end <= 99) {
          for (let i = start; i <= end; i++) {
            positions.push(String(i).padStart(2, '0'));
          }
        }
      } else {
        const num = parseInt(part, 10);
        if (!isNaN(num) && num >= 0 && num <= 99) {
          positions.push(String(num).padStart(2, '0'));
        }
      }
    }
    // Deduplicate
    return Array.from(new Set(positions));
  };

  const handleBulkReserve = async () => {
    const positions = parsePositions(reservePosition);
    if (positions.length === 0) return;

    await fetch('/api/squares', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'bulk-reserve',
        positions,
        guestName: reserveName || 'Reserved',
        guestEmail: reserveEmail || undefined,
      }),
    });

    setReserveModal(false);
    setReservePosition('');
    setReserveName('');
    setReserveEmail('');
    fetchSquares();
    notifySquaresChanged();
  };

  const filteredSquares = squares.filter((s) => {
    const isTaken = s.userId || s.guestName;
    if (filter === 'pending') return isTaken && !s.confirmed;
    if (filter === 'confirmed') return s.confirmed;
    if (filter === 'available') return !isTaken;
    return true;
  });

  if (loading) return <p className="text-gray-400">Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Manage Squares</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setReserveModal(true)}>
            Reserve Squares
          </Button>
          <Button size="sm" variant="success" onClick={handleConfirmAll}>
            Confirm All Pending
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {(['all', 'pending', 'confirmed', 'available'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-lg text-sm ${
              filter === f ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Squares table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-800">
              <th className="pb-2 pr-4">Pos</th>
              <th className="pb-2 pr-4">Name</th>
              <th className="pb-2 pr-4">Email</th>
              <th className="pb-2 pr-4">Status</th>
              <th className="pb-2 pr-4">Date</th>
              <th className="pb-2 pr-4">Notes</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSquares.map((sq) => {
              const name = sq.user?.name || sq.guestName;
              const email = sq.user?.email || sq.guestEmail;
              const isTaken = !!name;

              return (
                <tr key={sq.position} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                  <td className="py-2 pr-4 font-mono font-bold">{sq.position}</td>
                  <td className="py-2 pr-4">{name || <span className="text-gray-600">Available</span>}</td>
                  <td className="py-2 pr-4 text-gray-400">{email || '-'}</td>
                  <td className="py-2 pr-4">
                    {isTaken ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        sq.confirmed ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'
                      }`}>
                        {sq.confirmed ? 'Confirmed' : 'Pending'}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-600">-</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-gray-400">
                    {sq.signupDate
                      ? new Date(sq.signupDate).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="py-2 pr-4 text-gray-400 max-w-[150px] truncate" title={sq.notes || ''}>
                    {sq.notes || '-'}
                  </td>
                  <td className="py-2">
                    {isTaken && (
                      <div className="flex gap-1">
                        {!sq.confirmed && (
                          <button
                            onClick={() => handleAction(sq.position, 'confirm')}
                            className="text-xs bg-green-800 hover:bg-green-700 px-2 py-1 rounded"
                          >
                            Confirm
                          </button>
                        )}
                        <button
                          onClick={() => handleAction(sq.position, 'release')}
                          className="text-xs bg-red-800 hover:bg-red-700 px-2 py-1 rounded"
                        >
                          Release
                        </button>
                        <button
                          onClick={() => setEditModal({
                            ...sq,
                            guestName: sq.user?.name || sq.guestName || '',
                            guestEmail: sq.user?.email || sq.guestEmail || '',
                          })}
                          className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      <Modal
        open={!!editModal}
        onClose={() => setEditModal(null)}
        title={`Edit Square ${editModal?.position}`}
      >
        {editModal && (
          <div className="space-y-4">
            <Input
              id="editName"
              label="Name"
              value={editModal.guestName || ''}
              onChange={(e) => {
                setEditModal({ ...editModal, guestName: e.target.value });
              }}
            />
            <Input
              id="editEmail"
              label="Email"
              value={editModal.guestEmail || ''}
              onChange={(e) => {
                setEditModal({ ...editModal, guestEmail: e.target.value });
              }}
            />
            <Input
              id="editNotes"
              label="Notes"
              value={editModal.notes || ''}
              onChange={(e) => {
                setEditModal({ ...editModal, notes: e.target.value });
              }}
            />
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setEditModal(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  handleAction(editModal.position, 'edit', {
                    guestName: editModal.guestName,
                    guestEmail: editModal.guestEmail,
                    notes: editModal.notes,
                  });
                  setEditModal(null);
                }}
                className="flex-1"
              >
                Save
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reserve modal */}
      <Modal
        open={reserveModal}
        onClose={() => setReserveModal(false)}
        title="Reserve Squares"
      >
        <div className="space-y-4">
          <Input
            id="reservePosition"
            label="Positions"
            value={reservePosition}
            onChange={(e) => setReservePosition(e.target.value)}
            placeholder="e.g. 20-35 or 40,41,35,25"
          />
          <p className="text-xs text-gray-500 -mt-2">
            Supports ranges (20-35) and comma-separated (40,41,35)
          </p>
          <Input
            id="reserveName"
            label="Name"
            value={reserveName}
            onChange={(e) => setReserveName(e.target.value)}
          />
          <Input
            id="reserveEmail"
            label="Email (optional)"
            value={reserveEmail}
            onChange={(e) => setReserveEmail(e.target.value)}
          />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setReserveModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleBulkReserve}
              className="flex-1"
            >
              Reserve
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
