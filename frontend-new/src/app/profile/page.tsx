'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [uploading, setUploading] = useState(false);
  const [changing, setChanging] = useState(false);

  const handlePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('profilePicture', file);
      const resp = await api.users.updateProfilePicture(form);
      updateUser({ profilePicture: resp.profilePicture });
    } catch (err) {
      console.error('Profile picture upload failed', err);
    } finally {
      setUploading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChanging(true);
    try {
      await api.users.updatePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      console.error('Password change failed', err);
    } finally {
      setChanging(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mon Profil</h1>
          <p className="text-gray-600 dark:text-gray-400">Gère tes informations de compte</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Photo de profil</h2>
            <div className="flex items-center space-x-4">
              <img
                src={user?.profilePicture ? `${process.env.NEXT_PUBLIC_STATIC_ASSETS_BASE_URL || 'http://localhost:4000'}${user.profilePicture}` : '/default-avatar.jpg'}
                alt="Avatar"
                className="w-20 h-20 rounded-full border"
              />
              <label className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer">
                {uploading ? 'Téléversement...' : 'Changer'}
                <input type="file" className="hidden" accept="image/*" onChange={handlePictureChange} />
              </label>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Mot de passe</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Mot de passe actuel</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 rounded-lg bg-white/70 dark:bg-gray-700/70 border border-gray-200/40 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#2D9349]"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 rounded-lg bg-white/70 dark:bg-gray-700/70 border border-gray-200/40 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#2D9349]"
                />
              </div>
              <button
                type="submit"
                disabled={changing}
                className="inline-flex items-center px-4 py-2 bg-[#2D9349] hover:bg-[#247a3d] text-white rounded-lg disabled:opacity-50"
              >
                {changing ? 'Modification...' : 'Changer le mot de passe'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}


