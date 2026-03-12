'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  _count: { squares: number };
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('PLAYER');
  const [error, setError] = useState('');

  // Reset password modal
  const [resetModal, setResetModal] = useState(false);
  const [resetUserId, setResetUserId] = useState('');
  const [resetUserName, setResetUserName] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const fetchUsers = () => {
    fetch('/api/users')
      .then((res) => res.json())
      .then(setUsers)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async () => {
    setError('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          password: newPassword,
          role: newRole,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }

      setCreateModal(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('PLAYER');
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleChangeRole = async (userId: string, role: string) => {
    await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    fetchUsers();
  };

  const openResetModal = (user: User) => {
    setResetUserId(user.id);
    setResetUserName(user.name);
    setResetPassword('');
    setResetError('');
    setResetModal(true);
  };

  const handleResetPassword = async () => {
    setResetError('');
    if (resetPassword.length < 8) {
      setResetError('Password must be at least 8 characters');
      return;
    }
    setResetLoading(true);
    try {
      const res = await fetch(`/api/users/${resetUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResetError(data.error || 'Failed to reset password');
      } else {
        setResetModal(false);
      }
    } catch {
      setResetError('Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    await fetch(`/api/users/${userId}`, { method: 'DELETE' });
    fetchUsers();
  };

  if (loading) return <p className="text-gray-400">Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Button onClick={() => setCreateModal(true)}>Create User</Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-800">
              <th className="pb-2 pr-4">Name</th>
              <th className="pb-2 pr-4">Email</th>
              <th className="pb-2 pr-4">Role</th>
              <th className="pb-2 pr-4">Squares</th>
              <th className="pb-2 pr-4">Joined</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                <td className="py-2 pr-4 font-medium">{user.name}</td>
                <td className="py-2 pr-4 text-gray-400">{user.email}</td>
                <td className="py-2 pr-4">
                  <select
                    value={user.role}
                    onChange={(e) => handleChangeRole(user.id, e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="COMMISSIONER">Commissioner</option>
                    <option value="PLAYER">Player</option>
                  </select>
                </td>
                <td className="py-2 pr-4">{user._count.squares}</td>
                <td className="py-2 pr-4 text-gray-400">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="py-2 flex gap-2">
                  <button
                    onClick={() => openResetModal(user)}
                    className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
                  >
                    Reset PW
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="text-xs bg-red-800 hover:bg-red-700 px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={resetModal} onClose={() => setResetModal(false)} title={`Reset Password — ${resetUserName}`}>
        <div className="space-y-4">
          {resetError && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg px-4 py-2 text-sm text-red-300">
              {resetError}
            </div>
          )}
          <Input
            id="resetPassword"
            label="New Password"
            type="password"
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
            placeholder="Min 8 characters"
          />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setResetModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleResetPassword} loading={resetLoading} className="flex-1">
              Reset Password
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Create User">
        <div className="space-y-4">
          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg px-4 py-2 text-sm text-red-300">
              {error}
            </div>
          )}
          <Input id="newName" label="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Input id="newEmail" label="Email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
          <Input id="newPassword" label="Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 characters" />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-300">Role</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="input-field"
            >
              <option value="PLAYER">Player</option>
              <option value="COMMISSIONER">Commissioner</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setCreateModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleCreateUser} className="flex-1">
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
