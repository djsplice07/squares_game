import { prisma } from '@/lib/prisma';
import { PrintTrigger } from '@/components/PrintTrigger';

export const dynamic = 'force-dynamic';

export default async function PrintPage() {
  const settings = await prisma.gameSettings.findUnique({
    where: { id: 'singleton' },
  });

  const squares = await prisma.square.findMany({
    include: { user: { select: { name: true } } },
    orderBy: { position: 'asc' },
  });

  const gridNumbers = await prisma.gridNumber.findMany({
    orderBy: { position: 'asc' },
  });

  const hasNumbers = gridNumbers.length === 10;
  const nfcNumbers = hasNumbers ? gridNumbers.map((g) => g.nfcNumber) : Array(10).fill('?');
  const afcNumbers = hasNumbers ? gridNumbers.map((g) => g.afcNumber) : Array(10).fill('?');

  // Build 10x10 grid
  const grid: { name: string | null; confirmed: boolean }[][] = [];
  for (let row = 0; row < 10; row++) {
    grid[row] = [];
    for (let col = 0; col < 10; col++) {
      const sq = squares.find((s) => s.position === `${row}${col}`);
      const rawName = sq?.user?.name || sq?.guestName || null;
      // First name only to fit in cell
      const name = rawName ? rawName.split(' ')[0] : null;
      grid[row][col] = { name, confirmed: sq?.confirmed ?? false };
    }
  }

  const nfcTeam = settings?.nfcTeam || 'NFC';
  const afcTeam = settings?.afcTeam || 'AFC';
  const nfcLogo = settings?.nfcLogo || null;
  const afcLogo = settings?.afcLogo || null;
  const sbLogo = settings?.sbLogo || null;
  const eventName = settings?.eventName || 'Super Bowl Squares';
  const eventDate = settings?.eventDate || '';

  const CELL = 62; // px per cell
  const NUM_CELL = 28; // px for number header/side column
  const LOGO = 48;

  return (
    <>
      <PrintTrigger />
      <style>{`
        @page { size: 11in 8.5in landscape; margin: 0.4in; }
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; background: white; color: black; font-family: Arial, sans-serif; }
        @media screen {
          body { background: #f3f4f6; display: flex; justify-content: center; padding: 24px; }
          #print-root { background: white; padding: 24px; box-shadow: 0 4px 24px rgba(0,0,0,0.15); }
        }
      `}</style>

      <div id="print-root">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          {/* AFC team */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 160 }}>
            {afcLogo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={afcLogo} alt={afcTeam} width={LOGO} height={LOGO} style={{ objectFit: 'contain' }} />
            )}
            <span style={{ fontSize: 18, fontWeight: 700 }}>{afcTeam}</span>
          </div>

          {/* Centre: SB logo + title */}
          <div style={{ textAlign: 'center' }}>
            {sbLogo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sbLogo} alt="Super Bowl" width={60} height={60} style={{ objectFit: 'contain', display: 'block', margin: '0 auto 4px' }} />
            )}
            <div style={{ fontSize: 14, fontWeight: 700 }}>{eventName}</div>
            {eventDate && <div style={{ fontSize: 11, color: '#555' }}>{eventDate}</div>}
          </div>

          {/* NFC team */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', minWidth: 160 }}>
            <span style={{ fontSize: 18, fontWeight: 700 }}>{nfcTeam}</span>
            {nfcLogo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={nfcLogo} alt={nfcTeam} width={LOGO} height={LOGO} style={{ objectFit: 'contain' }} />
            )}
          </div>
        </div>

        {/* Grid */}
        <div style={{ display: 'flex' }}>
          {/* NFC vertical label + number column */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Top-left spacer */}
            <div style={{ height: NUM_CELL + 20, display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 9, color: '#888', writingMode: 'vertical-rl', transform: 'rotate(180deg)', paddingRight: 2 }}>
                {nfcTeam}
              </span>
            </div>
            {/* NFC number cells */}
            {nfcNumbers.map((n, i) => (
              <div key={i} style={{
                width: NUM_CELL, height: CELL,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#1e3a5f', color: 'white',
                fontSize: 13, fontWeight: 700,
                border: '1px solid #ccc',
              }}>
                {n}
              </div>
            ))}
          </div>

          {/* Main grid area */}
          <div>
            {/* AFC label + number row */}
            <div style={{ display: 'flex', alignItems: 'center', height: NUM_CELL + 20 }}>
              {afcNumbers.map((n, i) => (
                <div key={i} style={{
                  width: CELL, height: NUM_CELL,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#7b1c1c', color: 'white',
                  fontSize: 13, fontWeight: 700,
                  border: '1px solid #ccc',
                  alignSelf: 'flex-end',
                }}>
                  {n}
                </div>
              ))}
              <div style={{ width: 60, textAlign: 'center', fontSize: 9, color: '#888', alignSelf: 'flex-end', paddingBottom: 4, paddingLeft: 4 }}>
                {afcTeam}
              </div>
            </div>

            {/* Square rows */}
            {grid.map((row, rowIdx) => (
              <div key={rowIdx} style={{ display: 'flex' }}>
                {row.map((cell, colIdx) => {
                  const taken = !!cell.name;
                  const bg = taken
                    ? cell.confirmed ? '#d1fae5' : '#fef9c3'
                    : '#f9fafb';
                  const textColor = taken ? '#111' : '#ccc';
                  return (
                    <div key={colIdx} style={{
                      width: CELL, height: CELL,
                      border: '1px solid #ccc',
                      background: bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: taken ? 600 : 400,
                      color: textColor,
                      textAlign: 'center',
                      overflow: 'hidden',
                      padding: 2,
                      lineHeight: 1.2,
                    }}>
                      {cell.name || `${rowIdx}${colIdx}`}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div style={{ marginTop: 8, display: 'flex', gap: 16, fontSize: 9, color: '#555' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 12, height: 12, background: '#d1fae5', border: '1px solid #ccc' }} />
            Confirmed
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 12, height: 12, background: '#fef9c3', border: '1px solid #ccc' }} />
            Pending payment
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 12, height: 12, background: '#f9fafb', border: '1px solid #ccc' }} />
            Available
          </div>
        </div>
      </div>
    </>
  );
}
