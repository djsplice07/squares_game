'use client';

import { useSession } from 'next-auth/react';
import { useWebSocket } from '@/lib/ws';
import { useState, useRef, useEffect } from 'react';

export function ChatWindow() {
  const { data: session } = useSession();
  const { messages, connected, sendMessage, deleteMessage } = useWebSocket();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isAdmin =
    (session?.user as any)?.role === 'ADMIN' ||
    (session?.user as any)?.role === 'VIEWER';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const userId = (session?.user as any)?.id;

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input.trim(), userId);
    setInput('');
  };

  if (!session?.user) {
    return (
      <div className="card h-full flex flex-col">
        <div className="bg-gradient-to-r from-primary-900/40 to-gray-900 -m-6 mb-4 p-4 rounded-t-xl border-b border-gray-800/60">
          <h3 className="font-bold text-lg">Live Chat</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
          <p>Log in to participate in the chat</p>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {messages.slice(-20).map((msg) => (
            <div key={msg.id} className="text-sm">
              <span className="font-medium text-primary-400">{msg.userName}</span>{' '}
              <span className="text-gray-300">{msg.message}</span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
    );
  }

  return (
    <div className="card h-[600px] flex flex-col">
      <div className="bg-gradient-to-r from-primary-900/40 to-gray-900 -mx-6 -mt-6 mb-3 px-4 py-3 rounded-t-xl border-b border-gray-800/60 flex items-center justify-between">
        <h3 className="font-bold text-lg">Live Chat</h3>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            connected ? 'bg-green-900/60 text-green-300' : 'bg-red-900/60 text-red-300'
          }`}
        >
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 mb-3 pr-1">
        {messages.map((msg) => (
          <div key={msg.id} className="group text-sm flex items-start gap-1">
            <div className="flex-1">
              <span className="font-medium text-primary-400">{msg.userName}</span>{' '}
              <span className="text-gray-300">{msg.message}</span>
              <span className="text-[10px] text-gray-600 ml-1">
                {new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            {isAdmin && (
              <button
                onClick={() => {
                  deleteMessage(msg.id, userId);
                }}
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-xs"
              >
                x
              </button>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
          placeholder="Type a message..."
          className="input-field flex-1 text-sm"
          maxLength={500}
        />
        <button onClick={handleSend} className="btn-primary text-sm">
          Send
        </button>
      </div>
    </div>
  );
}
