import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function BalancePage() {
  const [squares, settings] = await Promise.all([
    prisma.square.findMany({
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.gameSettings.findUnique({ where: { id: 'singleton' } }),
  ]);

  const betAmount = settings?.betAmount || 10;

  // Group squares by player
  const playerMap = new Map<string, {
    name: string;
    email: string;
    squareCount: number;
    confirmed: number;
    pending: number;
    wins: number;
  }>();

  for (const sq of squares) {
    const name = sq.user?.name || sq.guestName;
    if (!name) continue;

    const email = sq.user?.email || sq.guestEmail || '';
    const key = `${name}|${email}`;

    if (!playerMap.has(key)) {
      playerMap.set(key, { name, email, squareCount: 0, confirmed: 0, pending: 0, wins: 0 });
    }

    const player = playerMap.get(key)!;
    player.squareCount++;
    if (sq.confirmed) player.confirmed++;
    else player.pending++;

    if (sq.firstWin || sq.halfWin || sq.thirdWin || sq.finalWin) {
      player.wins++;
    }
  }

  const players = Array.from(playerMap.values()).sort(
    (a, b) => b.squareCount - a.squareCount
  );

  const totalPot = squares.filter((s) => s.userId || s.guestName).length * betAmount;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Balance Sheet</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <p className="text-sm text-gray-400">Total Pot</p>
          <p className="text-2xl font-bold text-green-400">${totalPot.toFixed(2)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400">Players</p>
          <p className="text-2xl font-bold">{players.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400">Bet Amount</p>
          <p className="text-2xl font-bold">${betAmount.toFixed(2)}/sq</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-800">
              <th className="pb-2 pr-4">Player</th>
              <th className="pb-2 pr-4">Email</th>
              <th className="pb-2 pr-4 text-center">Squares</th>
              <th className="pb-2 pr-4 text-center">Confirmed</th>
              <th className="pb-2 pr-4 text-center">Pending</th>
              <th className="pb-2 pr-4 text-right">Amount Due</th>
              <th className="pb-2 pr-4 text-right">Confirmed Paid</th>
              <th className="pb-2 text-center">Wins</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, idx) => {
              const totalDue = player.squareCount * betAmount;
              const confirmedPaid = player.confirmed * betAmount;

              return (
                <tr key={idx} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                  <td className="py-2 pr-4 font-medium">{player.name}</td>
                  <td className="py-2 pr-4 text-gray-400">{player.email}</td>
                  <td className="py-2 pr-4 text-center">{player.squareCount}</td>
                  <td className="py-2 pr-4 text-center text-green-400">{player.confirmed}</td>
                  <td className="py-2 pr-4 text-center text-yellow-400">{player.pending}</td>
                  <td className="py-2 pr-4 text-right">${totalDue.toFixed(2)}</td>
                  <td className="py-2 pr-4 text-right text-green-400">${confirmedPaid.toFixed(2)}</td>
                  <td className="py-2 text-center">
                    {player.wins > 0 && (
                      <span className="text-yellow-400 font-bold">{player.wins}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-700 font-bold">
              <td className="pt-2 pr-4">Totals</td>
              <td></td>
              <td className="pt-2 pr-4 text-center">
                {players.reduce((s, p) => s + p.squareCount, 0)}
              </td>
              <td className="pt-2 pr-4 text-center text-green-400">
                {players.reduce((s, p) => s + p.confirmed, 0)}
              </td>
              <td className="pt-2 pr-4 text-center text-yellow-400">
                {players.reduce((s, p) => s + p.pending, 0)}
              </td>
              <td className="pt-2 pr-4 text-right">${totalPot.toFixed(2)}</td>
              <td className="pt-2 pr-4 text-right text-green-400">
                ${(players.reduce((s, p) => s + p.confirmed, 0) * betAmount).toFixed(2)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
