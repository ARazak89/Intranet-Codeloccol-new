'use client';

import { useState } from 'react';
import { Upload, X, Github, Users, Trophy, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface Hackathon {
  _id: string;
  title: string;
  description: string;
  status: string;
  startDate: string;
  endDate: string;
  teamSize?: number;
}

interface Team {
  _id: string;
  name: string;
  members: Array<{ _id: string; name: string }>;
}

interface HackathonSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  hackathon: Hackathon | null;
  team: Team | null;
  onSubmit: (repoUrl: string) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  success?: string | null;
}

export default function HackathonSubmissionModal({
  isOpen,
  onClose,
  hackathon,
  team,
  onSubmit,
  isLoading = false,
  error,
  success
}: HackathonSubmissionModalProps) {
  const [repoUrl, setRepoUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (repoUrl.trim()) {
      await onSubmit(repoUrl.trim());
    }
  };

  const handleClose = () => {
    setRepoUrl('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <Upload className="h-5 w-5 text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Soumettre le Projet
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                <span className="text-sm text-red-800 dark:text-red-200">{error}</span>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                <span className="text-sm text-green-800 dark:text-green-200">{success}</span>
              </div>
            </div>
          )}

          {/* Hackathon Info */}
          {hackathon && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center mb-2">
                <Trophy className="h-4 w-4 text-blue-600 mr-2" />
                <span className="font-medium text-blue-900 dark:text-blue-200">
                  {hackathon.title}
                </span>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {hackathon.description}
              </p>
            </div>
          )}

          {/* Team Info */}
          {team && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div className="flex items-center mb-2">
                <Users className="h-4 w-4 text-gray-600 mr-2" />
                <span className="font-medium text-gray-900 dark:text-white">
                  Votre équipe: {team.name}
                </span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Membres: {team.members.map(member => member.name).join(', ')}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label 
                htmlFor="repoUrl" 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                URL du Dépôt GitHub <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Github className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="url"
                  id="repoUrl"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/mon-equipe/mon-projet-hackathon"
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Veuillez fournir l'URL de votre dépôt GitHub pour le projet de hackathon.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !repoUrl.trim()}
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Soumission en cours...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Soumettre le Projet
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
