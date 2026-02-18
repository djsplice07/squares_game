'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface ChatMessage {
  id: string;
  message: string;
  guestName: string | null;
  deleted: boolean;
  createdAt: string;
  user: { name: string } | null;
}

interface BlacklistWord {
  id: string;
  word: string;
}

export default function ChatModerationPage() {
  const [tab, setTab] = useState<'messages' | 'blacklist'>('messages');

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Chat Moderation</h1>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('messages')}
          className={`px-4 py-2 rounded-lg text-sm ${
            tab === 'messages' ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400'
          }`}
        >
          Messages
        </button>
        <button
          onClick={() => setTab('blacklist')}
          className={`px-4 py-2 rounded-lg text-sm ${
            tab === 'blacklist' ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400'
          }`}
        >
          Blacklist
        </button>
      </div>

      {tab === 'messages' && <MessagesTab />}
      {tab === 'blacklist' && <BlacklistTab />}
    </div>
  );
}

function MessagesTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = () => {
    fetch('/api/chat')
      .then((r) => r.json())
      .then((data) => setMessages(data.messages || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleDelete = async (id: string) => {
    await fetch('/api/chat', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: id }),
    });
    fetchMessages();
  };

  if (loading) return <p className="text-gray-400">Loading...</p>;

  return (
    <div className="card">
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-gray-500 text-sm">No messages yet</p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2 text-sm p-2 rounded ${
              msg.deleted ? 'opacity-40' : ''
            }`}
          >
            <div className="flex-1">
              <span className="font-medium text-primary-400">
                {msg.user?.name || msg.guestName || 'Anonymous'}
              </span>{' '}
              <span className="text-gray-300">{msg.message}</span>
              <span className="text-[10px] text-gray-600 ml-2">
                {new Date(msg.createdAt).toLocaleString()}
              </span>
            </div>
            {!msg.deleted && (
              <button
                onClick={() => handleDelete(msg.id)}
                className="text-xs bg-red-800 hover:bg-red-700 px-2 py-1 rounded flex-shrink-0"
              >
                Delete
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BlacklistTab() {
  const [words, setWords] = useState<BlacklistWord[]>([]);
  const [newWord, setNewWord] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchBlacklist = () => {
    fetch('/api/chat?type=blacklist')
      .then((r) => r.json())
      .then((data) => setWords(data.words || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBlacklist();
  }, []);

  const handleAdd = async () => {
    if (!newWord.trim()) return;
    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'blacklist', word: newWord.trim() }),
    });
    setNewWord('');
    fetchBlacklist();
  };

  const handleRemove = async (id: string) => {
    await fetch('/api/chat', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'blacklist', wordId: id }),
    });
    fetchBlacklist();
  };

  if (loading) return <p className="text-gray-400">Loading...</p>;

  return (
    <div className="card max-w-lg">
      <h3 className="font-semibold mb-4">Blacklisted Words</h3>

      <div className="flex gap-2 mb-4">
        <Input
          id="newWord"
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
          placeholder="Add a word..."
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="flex-1"
        />
        <Button onClick={handleAdd}>Add</Button>
      </div>

      <div className="space-y-2">
        {words.map((w) => (
          <div key={w.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
            <span className="font-mono text-sm">{w.word}</span>
            <button
              onClick={() => handleRemove(w.id)}
              className="text-red-400 hover:text-red-300 text-sm"
            >
              Remove
            </button>
          </div>
        ))}
        {words.length === 0 && (
          <p className="text-gray-500 text-sm">No blacklisted words</p>
        )}
      </div>
    </div>
  );
}
