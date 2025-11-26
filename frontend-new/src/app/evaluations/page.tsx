'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { api } from '@/lib/api';
import { CheckSquare, Calendar, Users, RefreshCcw, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { evaluationsCanceled, evaluationsForStafs } from '@/actions/evaluations';

interface EvaluationItem {
  _id: string;
  status?: string;
  createdAt?: string;
  project?: { title?: string; description?: string; repoUrl?: string };
  studentName?: string;
  evaluator?: { name?: string };
  slot?: { startTime?: string; endTime?: string };
}

export default function EvaluationsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evaluations, setEvaluations] = useState<EvaluationItem[]>([]);
  const [cancelledProjects, setCancelledProjects] = useState<any[]>([]);

  // reassign modal
  const [showReassign, setShowReassign] = useState(false);
  const [evaluationToReassign, setEvaluationToReassign] = useState<EvaluationItem | null>(null);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);

  const isStaff = user && (user.role === 'staff' || user.role === 'admin');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (isStaff) {
          const [allEvals, cancelled] = await Promise.all([
            evaluationsForStafs(),
            evaluationsCanceled(),
          ]);
          setEvaluations(Array.isArray(allEvals) ? allEvals : []);
          setCancelledProjects(Array.isArray(cancelled) ? cancelled : []);
        } else {
          const mine = await api.evaluations.getMine();
          setEvaluations(Array.isArray(mine) ? mine : []);
        }
      } catch (e: any) {
        setError(e.message || 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isStaff]);

  const openReassignModal = async (evaluation: EvaluationItem) => {
    setEvaluationToReassign(evaluation);
    setShowReassign(true);
    try {
      const slots = await api.request('/availability/all-available-slots');
      setAvailableSlots(Array.isArray(slots) ? slots : []);
    } catch {
      setAvailableSlots([]);
    }
  };

  const submitReassign = async () => {
    if (!evaluationToReassign || selectedSlots.length !== 2) return;
    setError(null);
    try {
      await api.request(`/evaluations/${evaluationToReassign._id}/reassign`, {
        method: 'PUT',
        body: JSON.stringify({ newSlotIds: selectedSlots }),
      });
      setShowReassign(false);
      setSelectedSlots([]);
      // refresh
      const allEvals = await api.request('/evaluations/all-for-staff');
      setEvaluations(Array.isArray(allEvals) ? allEvals : []);
    } catch (e: any) {
      setError(e.message || 'Erreur de réassignation');
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isStaff ? 'Gestion des Évaluations' : 'Mes Évaluations'}</h1>
        </div>

        {isStaff && cancelledProjects.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
            <p className="font-semibold text-yellow-800 dark:text-yellow-200">Projets annulés nécessitant réassignation: {cancelledProjects.length}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {evaluations.map((e) => (
            <div key={e._id} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-start">
                <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
                  <CheckSquare className="h-5 w-5 text-green-600 dark:text-green-300" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">{e.project?.title || 'Évaluation'}</h3>
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                    {e.slot?.startTime && (
                      <span className="flex items-center"><Calendar className="h-4 w-4 mr-1" />{new Date(e.slot.startTime).toLocaleString()}</span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      e.status === 'accepted' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : e.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : e.status === 'cancelled' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }`}>{e.status || 'pending'}</span>
                    {isStaff && (
                      <button onClick={() => openReassignModal(e)} className="inline-flex items-center px-3 py-2 bg-[#ED6826] hover:bg-orange-600 text-white rounded-lg">
                        <RefreshCcw className="h-4 w-4 mr-1" /> Réassigner
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {evaluations.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
            <p className="text-gray-600 dark:text-gray-400">Aucune évaluation à afficher.</p>
          </div>
        )}

        {/* Reassign Modal (Staff/Admin) */}
        {isStaff && showReassign && evaluationToReassign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowReassign(false)} />
            <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Réassigner l'évaluation</h2>
                <button onClick={() => setShowReassign(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="h-4 w-4" /></button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Sélectionner deux slots de disponibilité</p>
              <div className="space-y-2 max-h-72 overflow-auto">
                {availableSlots.map((s: any) => (
                  <label key={s._id} className={`flex items-center justify-between p-2 rounded-lg border ${selectedSlots.includes(s._id) ? 'border-[#2D9349] bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                    <div className="text-sm text-gray-800 dark:text-gray-200">{new Date(s.startTime).toLocaleString()} → {new Date(s.endTime).toLocaleString()}</div>
                    <input type="checkbox" checked={selectedSlots.includes(s._id)} onChange={() => setSelectedSlots(prev => prev.includes(s._id) ? prev.filter(id => id !== s._id) : (prev.length < 2 ? [...prev, s._id] : prev))} />
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button onClick={() => setShowReassign(false)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600">Annuler</button>
                <button onClick={submitReassign} disabled={selectedSlots.length !== 2} className="px-4 py-2 rounded-lg bg-[#2D9349] hover:bg-[#247a3d] text-white disabled:opacity-50">Confirmer</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}


