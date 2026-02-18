'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';
import { SquareCell } from './SquareCell';
import { useWebSocket } from '@/lib/ws';
import Link from 'next/link';

interface Square {
  id: string;
  position: string;
  userId: string | null;
  guestName: string | null;
  confirmed: boolean;
  firstWin: boolean;
  halfWin: boolean;
  thirdWin: boolean;
  finalWin: boolean;
  user: { name: string; id: string } | null;
}

interface GridNumber {
  position: number;
  nfcNumber: number;
  afcNumber: number;
}

interface Winner {
  position: string;
  name: string;
}

interface SquareGridProps {
  squares: Square[];
  gridNumbers: GridNumber[];
  settings: {
    nfcTeam: string;
    nfcLogo: string;
    afcTeam: string;
    afcLogo: string;
    betAmount: number;
    winFirstPct: number;
    winSecondPct: number;
    winThirdPct: number;
    winFinalPct: number;
  } | null;
  scores: {
    nfcFirst: number | null;
    afcFirst: number | null;
    nfcHalf: number | null;
    afcHalf: number | null;
    nfcThird: number | null;
    afcThird: number | null;
    nfcFinal: number | null;
    afcFinal: number | null;
  } | null;
  winners: Record<string, Winner> | null;
}

export function SquareGrid({ squares: initialSquares, gridNumbers, settings, scores, winners }: SquareGridProps) {
  const { data: session } = useSession();
  const [selectedSquares, setSelectedSquares] = useState<string[]>([]);
  const [squares, setSquares] = useState<Square[]>(initialSquares);
  const { squaresVersion } = useWebSocket();
  const prevVersion = useRef(squaresVersion);

  // Re-fetch squares when WS notifies of changes
  useEffect(() => {
    if (squaresVersion !== prevVersion.current) {
      prevVersion.current = squaresVersion;
      fetch('/api/squares')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setSquares(data);
        })
        .catch(() => {});
    }
  }, [squaresVersion]);

  const hasNumbers = gridNumbers.length === 10;

  // Build grid: rows are NFC (0-9), cols are AFC (0-9)
  const grid: Square[][] = [];
  for (let row = 0; row < 10; row++) {
    grid[row] = [];
    for (let col = 0; col < 10; col++) {
      const pos = `${row}${col}`;
      const square = squares.find((s) => s.position === pos);
      if (square) grid[row][col] = square;
    }
  }

  const toggleSelect = (position: string) => {
    setSelectedSquares((prev) =>
      prev.includes(position)
        ? prev.filter((p) => p !== position)
        : prev.length < 10
        ? [...prev, position]
        : prev
    );
  };

  const nfcNumbers = hasNumbers
    ? gridNumbers.sort((a, b) => a.position - b.position).map((g) => g.nfcNumber)
    : [];
  const afcNumbers = hasNumbers
    ? gridNumbers.sort((a, b) => a.position - b.position).map((g) => g.afcNumber)
    : [];

  const totalPot = (settings?.betAmount || 0) * 100;

  const quarterInfo = [
    { label: 'Q1', key: 'first', nfc: scores?.nfcFirst, afc: scores?.afcFirst, pct: settings?.winFirstPct || 0 },
    { label: 'Q2', key: 'half', nfc: scores?.nfcHalf, afc: scores?.afcHalf, pct: settings?.winSecondPct || 0 },
    { label: 'Q3', key: 'third', nfc: scores?.nfcThird, afc: scores?.afcThird, pct: settings?.winThirdPct || 0 },
    { label: 'Final', key: 'final', nfc: scores?.nfcFinal, afc: scores?.afcFinal, pct: settings?.winFinalPct || 0 },
  ];

  return (
    <div className="space-y-4">
      {/* Score display */}
      {scores && (scores.nfcFirst !== null || scores.nfcHalf !== null || scores.nfcThird !== null || scores.nfcFinal !== null) && (
        <div className="card-elevated border-l-4 border-l-primary-500">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Scores</h3>
          <div className="grid grid-cols-4 gap-3 text-center text-sm">
            {quarterInfo.map((q) => {
              const winner = winners?.[q.key];
              const payout = totalPot * q.pct / 100;
              return (
                <div key={q.label} className="bg-gray-800/50 rounded-lg p-2">
                  <div className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1">{q.label}</div>
                  <div className="text-gray-200">{settings?.nfcTeam} {q.nfc ?? '-'}</div>
                  <div className="text-gray-200">{settings?.afcTeam} {q.afc ?? '-'}</div>
                  {winner && (
                    <div className="mt-1 border-t border-gray-700 pt-1">
                      <div className="text-yellow-300 text-xs font-bold">{winner.name}</div>
                      <div className="text-green-400 text-xs">${payout.toFixed(0)}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="card-elevated overflow-x-auto">
        {/* AFC axis label */}
        <div className="text-center text-sm font-semibold text-gray-400 mb-1">
          {settings?.afcTeam || 'AFC'}
        </div>
        <div className="flex">
          {/* NFC axis label */}
          <div className="flex items-center justify-center mr-1">
            <span
              className="text-sm font-semibold text-gray-400"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              {settings?.nfcTeam || 'NFC'}
            </span>
          </div>
          <table className="w-full border-collapse table-fixed">
            <colgroup>
              {Array.from({ length: 11 }, (_, i) => (
                <col key={i} className="w-[9.09%]" />
              ))}
            </colgroup>
            <thead>
              <tr>
                {/* Corner cell - empty */}
                <th className="p-0.5">
                  <div className="aspect-square" />
                </th>
                {/* AFC numbers across top */}
                {Array.from({ length: 10 }, (_, i) => (
                  <th key={i} className="p-0.5 text-center">
                    <div className="bg-gray-800/80 rounded-md aspect-square flex items-center justify-center text-sm font-bold">
                      {hasNumbers ? afcNumbers[i] : '?'}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {/* NFC number on left side */}
                  <td className="p-0.5">
                    <div className="bg-gray-800/80 rounded-md aspect-square flex items-center justify-center text-sm font-bold">
                      {hasNumbers ? nfcNumbers[rowIdx] : '?'}
                    </div>
                  </td>
                  {row.map((square, colIdx) => (
                    <td key={colIdx} className="p-0.5">
                      <SquareCell
                        square={square}
                        isOwn={
                          session?.user
                            ? square.userId === (session.user as any).id
                            : false
                        }
                        isSelected={selectedSquares.includes(square.position)}
                        onSelect={
                          !square.userId && !square.guestName
                            ? () => toggleSelect(square.position)
                            : undefined
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Purchase selected squares */}
      {selectedSquares.length > 0 && (
        <div className="card-elevated flex items-center justify-between">
          <div>
            <p className="font-medium">
              {selectedSquares.length} square{selectedSquares.length !== 1 ? 's' : ''} selected
            </p>
            <p className="text-sm text-gray-400">
              Total: ${((settings?.betAmount || 10) * selectedSquares.length).toFixed(2)}
            </p>
          </div>
          <Link
            href={`/signup?squares=${selectedSquares.join(',')}`}
            className="btn-primary"
          >
            Purchase Squares
          </Link>
        </div>
      )}
    </div>
  );
}
