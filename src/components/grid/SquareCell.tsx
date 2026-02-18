'use client';

interface SquareCellProps {
  square: {
    position: string;
    userId: string | null;
    guestName: string | null;
    confirmed: boolean;
    firstWin: boolean;
    halfWin: boolean;
    thirdWin: boolean;
    finalWin: boolean;
    user: { name: string } | null;
  };
  isOwn: boolean;
  isSelected: boolean;
  onSelect?: () => void;
}

export function SquareCell({ square, isOwn, isSelected, onSelect }: SquareCellProps) {
  const name = square.user?.name || square.guestName;
  const isTaken = !!name;
  const isWinner = square.firstWin || square.halfWin || square.thirdWin || square.finalWin;

  let bgColor = 'bg-gray-800/60 hover:bg-gray-700/80 cursor-pointer shadow-inner'; // available
  if (isTaken && square.confirmed) {
    bgColor = 'bg-green-900/40 border-green-600/50 shadow-[inset_0_0_12px_rgba(34,197,94,0.08)]'; // confirmed
  } else if (isTaken && !square.confirmed) {
    bgColor = 'bg-yellow-900/30 border-yellow-600/50 shadow-[inset_0_0_12px_rgba(234,179,8,0.08)]'; // pending
  }
  if (isOwn) {
    bgColor = 'bg-primary-900/50 border-primary-500/60 ring-1 ring-primary-500/40 shadow-[inset_0_0_12px_rgba(59,130,246,0.1)]'; // own square
  }
  if (isSelected) {
    bgColor = 'bg-primary-600 border-primary-400 shadow-[0_0_12px_rgba(59,130,246,0.3)]'; // selected for purchase
  }
  if (isWinner) {
    bgColor += ' ring-2 ring-yellow-400/80 shadow-[0_0_10px_rgba(250,204,21,0.2)]';
  }

  const winLabels = [];
  if (square.firstWin) winLabels.push('Q1');
  if (square.halfWin) winLabels.push('Q2');
  if (square.thirdWin) winLabels.push('Q3');
  if (square.finalWin) winLabels.push('F');

  return (
    <div
      className={`${bgColor} border border-gray-700/60 rounded-md aspect-square flex flex-col items-center justify-center text-center transition-all duration-150`}
      onClick={!isTaken ? onSelect : undefined}
    >
      {name ? (
        <>
          <span className="text-[10px] font-medium break-words leading-tight overflow-hidden w-full px-0.5">
            {name}
          </span>
          {!square.confirmed && (
            <span className="text-[9px] text-yellow-400/90">Pending</span>
          )}
          {winLabels.length > 0 && (
            <span className="text-[9px] text-yellow-300 font-bold">
              {winLabels.join(',')}
            </span>
          )}
        </>
      ) : (
        <span className="text-[10px] text-gray-600">{square.position}</span>
      )}
    </div>
  );
}
