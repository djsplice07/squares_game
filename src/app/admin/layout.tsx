'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: '~' },
  { href: '/admin/squares', label: 'Squares', icon: '#' },
  { href: '/admin/numbers', label: 'Numbers', icon: '?' },
  { href: '/admin/scores', label: 'Scores', icon: 'S' },
  { href: '/admin/balance', label: 'Balance', icon: '$' },
  { href: '/admin/settings', label: 'Settings', icon: '*' },
  { href: '/admin/users', label: 'Users', icon: 'U' },
  { href: '/admin/email', label: 'Email', icon: '@' },
  { href: '/admin/chat', label: 'Chat', icon: 'C' },
  { href: '/admin/backup', label: 'Backup', icon: 'B' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  // Viewer can't access certain pages
  const viewerRestricted = ['/admin/settings', '/admin/users', '/admin/backup'];
  const filteredNav = role === 'COMMISSIONER'
    ? navItems.filter((item) => !viewerRestricted.includes(item.href))
    : navItems;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <Link href="/" className="text-lg font-bold text-primary-400">
            SB Squares
          </Link>
          <p className="text-xs text-gray-500 mt-1">
            {role === 'COMMISSIONER' ? 'Commissioner' : 'Admin Panel'}
          </p>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {filteredNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname === item.href
                  ? 'bg-primary-900/50 text-primary-300'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <span className="w-5 text-center font-mono text-xs">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800 space-y-2">
          <Link href="/my-squares" className="block text-sm text-gray-400 hover:text-white">
            Change Password
          </Link>
          <Link href="/" className="block text-sm text-gray-400 hover:text-white">
            &larr; Back to Grid
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
