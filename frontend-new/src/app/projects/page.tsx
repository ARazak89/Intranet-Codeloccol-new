'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { FolderOpen, Clock, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface StudentProject {
  _id: string;
  title?: string;
  projectTitle?: string;
  description?: string;
  projectDescription?: string;
  status?: string;
  module?: string;
  order?: number;
  createdAt?: string;
  assignmentId?: string;
  assignmentStatus?: string | null;
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<StudentProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitForProject, setSubmitForProject] = useState<StudentProject | null>(null);
  const [repoUrl, setRepoUrl] = useState('');
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isEvaluator = user?.role === 'evaluator';

  const fetchProjects = async () => {
    try {
      if (user?.role === 'evaluator') {
        const data = await api.projects.getAll();
        const templates = (Array.isArray(data) ? data : []).map((p: any) => ({
          ...p,
          assignmentStatus: null,
        }));
        setProjects(templates);
      } else {
        const data = await api.projects.getMine();
        setProjects(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Error loading projects', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const groupedByModule = useMemo(() => {
    const sorted = [...projects].sort((a, b) => (a.order || 0) - (b.order || 0));
    return sorted.reduce<Record<string, StudentProject[]>>((acc, project) => {
      const moduleName = project.module || 'Sans module';
      if (!acc[moduleName]) acc[moduleName] = [];
      acc[moduleName].push(project);
      return acc;
    }, {});
  }, [projects]);

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        </div>
      </ProtectedRoute>
    );
  }

  const displayTitle = (p: StudentProject) => p.title || p.projectTitle || 'Projet';
  const displayDescription = (p: StudentProject) => p.description || p.projectDescription;

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEvaluator ? 'Projets' : 'Mes Projets'}
          </h1>
        </div>

        {isEvaluator ? (
          selectedModule ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setSelectedModule(null)}
                className="inline-flex items-center text-sm text-gray-600 dark:text-gray-300 hover:text-emerald-600"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Retour aux Modules
              </button>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Projets du module : {selectedModule}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {(groupedByModule[selectedModule] || []).map((p) => (
                  <div
                    key={p._id}
                    className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                        <FolderOpen className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                      </div>
                      <div className="ml-4 flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">
                          {displayTitle(p)}
                        </h3>
                        {displayDescription(p) && (
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {displayDescription(p)}
                          </p>
                        )}
                        <div className="mt-3">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                            Aperçu
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {Object.keys(groupedByModule).length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">Aucun projet disponible pour le moment.</p>
              ) : (
                Object.keys(groupedByModule).map((moduleName) => (
                  <button
                    key={moduleName}
                    type="button"
                    onClick={() => setSelectedModule(moduleName)}
                    className="text-left bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 hover:border-emerald-500 transition-colors"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{moduleName}</h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {groupedByModule[moduleName].length} projet(s)
                    </p>
                  </button>
                ))
              )}
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {projects.map((p) => (
              <div key={p._id} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-start">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                    <FolderOpen className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">{displayTitle(p)}</h3>
                    {displayDescription(p) && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{displayDescription(p)}</p>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        p.status === 'completed' || p.assignmentStatus === 'approved'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}>
                        {p.assignmentStatus || p.status || 'pending'}
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
        )}

        {showSubmitModal && submitForProject && !isEvaluator && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowSubmitModal(false)} />
            <div className="relative z-10 w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Soumettre le projet</h2>
              {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await api.projects.submitSolution(submitForProject._id, {
                      assignmentId: submitForProject.assignmentId || submitForProject._id,
                      repoUrl,
                      selectedSlotIds,
                    });
                    toast.success('Projet soumis');
                    setShowSubmitModal(false);
                    setRepoUrl('');
                    setSelectedSlotIds([]);
                    fetchProjects();
                  } catch (err: any) {
                    setError(err?.message || 'Échec de la soumission');
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm mb-1">URL du dépôt</label>
                  <input
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Créneaux (2 requis)</label>
                  <div className="max-h-40 overflow-auto space-y-2">
                    {availableSlots.map((slot: any) => (
                      <label key={slot._id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedSlotIds.includes(slot._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSlotIds((prev) => [...prev, slot._id].slice(0, 2));
                            } else {
                              setSelectedSlotIds((prev) => prev.filter((id) => id !== slot._id));
                            }
                          }}
                        />
                        {slot.evaluator?.name || 'Évaluateur'} — {new Date(slot.startTime).toLocaleString()}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowSubmitModal(false)} className="px-3 py-2 text-sm rounded-lg border">
                    Annuler
                  </button>
                  <button type="submit" className="px-3 py-2 text-sm rounded-lg bg-[#2D9349] text-white">
                    Confirmer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
