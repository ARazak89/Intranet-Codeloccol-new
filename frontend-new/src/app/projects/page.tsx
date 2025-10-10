'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { FolderOpen, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface StudentProject {
  _id: string;
  projectTitle: string;
  projectDescription?: string;
  status?: string;
  createdAt?: string;
  assignmentId?: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<StudentProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitForProject, setSubmitForProject] = useState<StudentProject | null>(null);
  const [repoUrl, setRepoUrl] = useState('');
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      const data = await api.projects.getMine();
      setProjects(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error loading projects', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mes Projets</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {projects.map((p) => (
            <div key={p._id} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-start">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                  <FolderOpen className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">{p.projectTitle}</h3>
                  {p.projectDescription && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{p.projectDescription}</p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      p.status === 'completed'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    }`}>
                      {p.status || 'pending'}
                    </span>
                    {p.createdAt && (
                      <span className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="h-4 w-4 mr-1" />
                        {new Date(p.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex justify-end">
                  <button onClick={async () => {
                      setError(null);
                      setSubmitForProject(p);
                      setShowSubmitModal(true);
                      try {
                        const slots = await api.request(`/availability/available-for-project/${p._id}/${p.assignmentId}`);
                        setAvailableSlots(Array.isArray(slots) ? slots : []);
                      } catch {
                        setAvailableSlots([]);
                      }
                    }} className="px-3 py-2 text-sm rounded-lg bg-[#2D9349] hover:bg-[#247a3d] text-white">Soumettre</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {projects.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
            <p className="text-gray-600 dark:text-gray-400">Aucun projet assigné pour le moment.</p>
          </div>
        )}

        {/* Submit Solution Modal */}
        {showSubmitModal && submitForProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowSubmitModal(false)} />
            <div className="relative z-10 w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Soumettre la solution</h2>
              {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">URL du dépôt</label>
                  <input value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/username/repo" className="w-full px-4 py-2 rounded-lg bg-white/70 dark:bg-gray-700/70 border border-gray-200/40 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#2D9349]" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Sélectionner 2 créneaux d'évaluation</label>
                  <div className="space-y-2 max-h-56 overflow-auto">
                    {availableSlots.map((s: any) => (
                      <label key={s._id} className={`flex items-center justify-between p-2 rounded-lg border ${selectedSlotIds.includes(s._id) ? 'border-[#2D9349] bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                        <div className="text-sm text-gray-800 dark:text-gray-200">{new Date(s.startTime).toLocaleString()} → {new Date(s.endTime).toLocaleString()}</div>
                        <input type="checkbox" checked={selectedSlotIds.includes(s._id)} onChange={() => setSelectedSlotIds(prev => prev.includes(s._id) ? prev.filter(id => id !== s._id) : (prev.length < 2 ? [...prev, s._id] : prev))} />
                      </label>
                    ))}
                    {availableSlots.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">Aucun slot disponible pour ce projet.</p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setShowSubmitModal(false)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600">Annuler</button>
                  <button onClick={async () => {
                    setError(null);
                    if (!repoUrl || selectedSlotIds.length !== 2) {
                      setError('Renseignez le dépôt et choisissez 2 créneaux');
                      return;
                    }
                    try {
                      await api.projects.submitSolution(submitForProject._id, { assignmentId: submitForProject.assignmentId || '', repoUrl, selectedSlotIds });
                      toast.success('Soumission effectuée');
                      setShowSubmitModal(false);
                      setRepoUrl('');
                      setSelectedSlotIds([]);
                      setSubmitForProject(null);
                      setAvailableSlots([]);
                      setLoading(true);
                      await fetchProjects();
                    } catch (e: any) {
                      const msg = e?.message || 'Échec de la soumission';
                      setError(msg);
                      toast.error(msg);
                    }
                  }} className="px-4 py-2 rounded-lg bg-[#2D9349] hover:bg-[#247a3d] text-white">Soumettre</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}


