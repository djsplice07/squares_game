'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';

interface GridHeaderProps {
  settings: {
    title: string;
    commissioner: string;
    eventName: string;
    eventDate: string;
    eventTime: string;
    sbLogo: string;
    nfcTeam: string;
    nfcLogo: string;
    afcTeam: string;
    afcLogo: string;
    betAmount: number;
    rulesText: string;
  } | null;
}

export function GridHeader({ settings }: GridHeaderProps) {
  const { data: session } = useSession();
  const [rulesOpen, setRulesOpen] = useState(false);
  const s = settings;

  return (
    <>
      <header className="bg-gray-900/90 border-b border-gray-800/60 shadow-lg shadow-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Top row: title left, nav right */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">{s?.title || 'Super Bowl Squares'}</h1>
              <p className="text-gray-400 text-sm">
                {s?.eventName}
                {s?.eventDate && ` - ${s.eventDate}`}
                {s?.eventTime && ` at ${s.eventTime}`}
              </p>
              {s?.commissioner && (
                <p className="text-gray-500 text-xs">Commissioner: {s.commissioner}</p>
              )}
            </div>

            <nav className="flex items-center gap-3">
              <a
                href="/print"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-sm"
              >
                Print
              </a>
              <button
                onClick={() => setRulesOpen(true)}
                className="btn-secondary text-sm"
              >
                Rules
              </button>
              {session?.user ? (
                <>
                  <span className="text-sm text-gray-400">Hi, {session.user.name}</span>
                  {(session.user as any).role === 'PLAYER' && (
                    <Link href="/my-squares" className="btn-secondary text-sm">
                      My Squares
                    </Link>
                  )}
                  {((session.user as any).role === 'ADMIN' || (session.user as any).role === 'VIEWER') && (
                    <Link href="/admin" className="btn-secondary text-sm">
                      Admin
                    </Link>
                  )}
                  <button onClick={() => signOut({ callbackUrl: window.location.origin + '/' })} className="text-sm text-gray-400 hover:text-white">
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="btn-secondary text-sm">
                    Log In
                  </Link>
                  <Link href="/register" className="btn-primary text-sm">
                    Register
                  </Link>
                </>
              )}
            </nav>
          </div>

          {/* Matchup banner - centered */}
          <div className="flex flex-col items-center gap-3">
            {s?.sbLogo && (
              <Image
                src={s.sbLogo}
                alt="Super Bowl"
                width={200}
                height={200}
                className="object-contain"
              />
            )}
            <div className="flex items-center gap-6 text-xl font-bold">
              {s?.afcLogo && (
                <Image src={s.afcLogo} alt={s?.afcTeam || 'AFC'} width={80} height={80} className="object-contain" />
              )}
              <span className="text-2xl">{s?.afcTeam || 'AFC'}</span>
              <span className="text-gray-500 text-lg">vs.</span>
              <span className="text-2xl">{s?.nfcTeam || 'NFC'}</span>
              {s?.nfcLogo && (
                <Image src={s.nfcLogo} alt={s?.nfcTeam || 'NFC'} width={80} height={80} className="object-contain" />
              )}
            </div>
          </div>
        </div>
      </header>

      <Modal open={rulesOpen} onClose={() => setRulesOpen(false)} title="Game Rules">
        {s?.rulesText ? (
          <div className="text-gray-300 text-sm whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
            {s.rulesText}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No rules have been posted yet.</p>
        )}
      </Modal>
    </>
  );
}
