import React, { useState } from 'react';
import { User, Save, Key } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { AdminUser } from '../services/adminService';

interface AdminProfileProps {
  adminUser: AdminUser;
  onUpdate: () => void;
}

export const AdminProfile: React.FC<AdminProfileProps> = ({ adminUser, onUpdate }) => {
  const [newUsername, setNewUsername] = useState(adminUser.email);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!currentPassword) {
      setError('Current password is required');
      setLoading(false);
      return;
    }

    const { data: user } = await supabase
      .from('admin_users')
      .select('password_hash')
      .eq('id', adminUser.id)
      .maybeSingle();

    if (!user || user.password_hash !== currentPassword) {
      setError('Current password is incorrect');
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('admin_users')
      .update({ email: newUsername })
      .eq('id', adminUser.id);

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess('Username updated successfully');
      setCurrentPassword('');
      onUpdate();
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!currentPassword) {
      setError('Current password is required');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    if (newPassword.length < 4) {
      setError('New password must be at least 4 characters');
      setLoading(false);
      return;
    }

    const { data: user } = await supabase
      .from('admin_users')
      .select('password_hash')
      .eq('id', adminUser.id)
      .maybeSingle();

    if (!user || user.password_hash !== currentPassword) {
      setError('Current password is incorrect');
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('admin_users')
      .update({ password_hash: newPassword })
      .eq('id', adminUser.id);

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onUpdate();
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-500/10 rounded-lg">
            <User className="text-blue-400" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Admin Profile</h2>
            <p className="text-slate-400 text-sm">Manage your account settings</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded text-red-300 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-500 rounded text-emerald-300 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleUpdateUsername} className="space-y-4 pb-6 border-b border-slate-700">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <User size={18} />
            Update Username
          </h3>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              New Username
            </label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-400"
              placeholder="Enter new username"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-400"
              placeholder="Confirm with current password"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading || newUsername === adminUser.email}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded transition-colors"
          >
            <Save size={18} className="mr-2" />
            Update Username
          </button>
        </form>

        <form onSubmit={handleUpdatePassword} className="space-y-4 pt-6">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Key size={18} />
            Change Password
          </h3>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-400"
              placeholder="Enter current password"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-400"
              placeholder="Enter new password"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-400"
              placeholder="Confirm new password"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded transition-colors"
          >
            <Key size={18} className="mr-2" />
            Change Password
          </button>
        </form>
      </div>
    </div>
  );
};
