import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const [squares, users, settings] = await Promise.all([
    prisma.square.findMany(),
    prisma.user.count(),
    prisma.gameSettings.findUnique({ where: { id: 'singleton' } }),
  ]);

  const totalSquares = squares.length;
  const claimed = squares.filter((s) => s.userId || s.guestName).length;
  const confirmed = squares.filter((s) => s.confirmed).length;
  const pending = claimed - confirmed;
  const available = totalSquares - claimed;

  const totalPot = claimed * (settings?.betAmount || 10);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <p className="text-sm text-gray-400">Total Pot</p>
          <p className="text-3xl font-bold text-green-400">${totalPot.toFixed(2)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400">Squares Claimed</p>
          <p className="text-3xl font-bold">{claimed}/100</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400">Confirmed / Pending</p>
          <p className="text-3xl font-bold">
            <span className="text-green-400">{confirmed}</span>
            {' / '}
            <span className="text-yellow-400">{pending}</span>
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400">Registered Users</p>
          <p className="text-3xl font-bold">{users}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="font-semibold mb-3">Grid Status</h2>
          <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden">
            <div className="flex h-full">
              <div
                className="bg-green-500 h-full"
                style={{ width: `${(confirmed / totalSquares) * 100}%` }}
              />
              <div
                className="bg-yellow-500 h-full"
                style={{ width: `${(pending / totalSquares) * 100}%` }}
              />
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span className="text-green-400">{confirmed} confirmed</span>
            <span className="text-yellow-400">{pending} pending</span>
            <span>{available} available</span>
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-3">Payout Distribution</h2>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Q1 ({settings?.winFirstPct || 20}%)</span>
              <span>${(totalPot * (settings?.winFirstPct || 20) / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Q2 ({settings?.winSecondPct || 20}%)</span>
              <span>${(totalPot * (settings?.winSecondPct || 20) / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Q3 ({settings?.winThirdPct || 20}%)</span>
              <span>${(totalPot * (settings?.winThirdPct || 20) / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Final ({settings?.winFinalPct || 30}%)</span>
              <span>${(totalPot * (settings?.winFinalPct || 30) / 100).toFixed(2)}</span>
            </div>
            {(settings?.donationPct || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Donation ({settings?.donationPct}%)</span>
                <span>${(totalPot * (settings?.donationPct || 0) / 100).toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
