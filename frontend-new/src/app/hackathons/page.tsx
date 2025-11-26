'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { api } from '@/lib/api';
import { Trophy, Calendar, Plus, Users, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Hackathon {
  _id: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export default function HackathonsPage() {
  const { user } = useAuth();
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [specifications, setSpecifications] = useState('');
  const [teamSize, setTeamSize] = useState(1);

  // constitute teams modal
  const [showTeams, setShowTeams] = useState(false);
  const [selectedHackathonId, setSelectedHackathonId] = useState<string | null>(null);
  const [availableLearners, setAvailableLearners] = useState<any[]>([]);
  const [teamName, setTeamName] = useState('');
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [teamsDraft, setTeamsDraft] = useState<Array<{ name: string; members: string[] }>>([]);
  const [currentTeams, setCurrentTeams] = useState<any[]>([]);
  const [selectedTeamForAdd, setSelectedTeamForAdd] = useState<string>('');
  const [selectedLearnerForAdd, setSelectedLearnerForAdd] = useState<string>('');

  useEffect(() => {
    const fetchHackathons = async () => {
      try {
        const data = await api.hackathons.list();
        setHackathons(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Error loading hackathons', e);
        setError('Impossible de charger les hackathons');
      } finally {
        setLoading(false);
      }
    };
    fetchHackathons();
  }, []);

  const isStaff = user && (user.role === 'staff' || user.role === 'admin');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.hackathons.create({ title, description, startDate, endDate, specifications, teamSize });
      setShowCreate(false);
      setTitle(''); setDescription(''); setStartDate(''); setEndDate(''); setSpecifications(''); setTeamSize(1);
      const refreshed = await api.hackathons.list();
      setHackathons(Array.isArray(refreshed) ? refreshed : []);
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la création');
    }
  };

  const openTeamsModal = async (hackathonId: string) => {
    setSelectedHackathonId(hackathonId);
    setShowTeams(true);
    try {
      const learners = await api.hackathons.availableLearners();
      setAvailableLearners(Array.isArray(learners) ? learners : []);
      const teams = await api.teams.byHackathon(hackathonId);
      setCurrentTeams(Array.isArray(teams) ? teams : []);
    } catch (e) {
      setAvailableLearners([]);
      setCurrentTeams([]);
    }
  };

  const addTeamToDraft = () => {
    if (!teamName.trim() || teamMembers.length === 0) return;
    setTeamsDraft(prev => [...prev, { name: teamName.trim(), members: teamMembers }]);
    setTeamName('');
    setTeamMembers([]);
  };

  const submitTeams = async () => {
    if (!selectedHackathonId || teamsDraft.length === 0) return;
    setError(null);
    try {
      await api.hackathons.constituteTeams(selectedHackathonId, teamsDraft);
      setShowTeams(false);
      setTeamsDraft([]);
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la constitution');
    }
  };

  const refreshTeams = async () => {
    if (!selectedHackathonId) return;
    try {
      const teams = await api.teams.byHackathon(selectedHackathonId);
      setCurrentTeams(Array.isArray(teams) ? teams : []);
    } catch {
      setCurrentTeams([]);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    try {
      await api.teams.delete(teamId);
      await refreshTeams();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveMember = async (teamId: string, memberId: string) => {
    try {
      await api.teams.removeMember(teamId, memberId);
      await refreshTeams();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddMember = async () => {
    if (!selectedTeamForAdd || !selectedLearnerForAdd) return;
    try {
      await api.teams.addMember(selectedTeamForAdd, selectedLearnerForAdd);
      setSelectedTeamForAdd('');
      setSelectedLearnerForAdd('');
      await refreshTeams();
    } catch (e) {
      console.error(e);
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hackathons</h1>
          {isStaff && (
            <div className="flex items-center gap-2">
              <button onClick={() => setShowCreate(true)} className="inline-flex items-center px-3 py-2 bg-[#2D9349] hover:bg-[#247a3d] text-white rounded-lg">
                <Plus className="h-4 w-4 mr-1" /> Nouveau
              </button>
              <button onClick={() => openTeamsModal(hackathons[0]?._id || '')} disabled={hackathons.length === 0} className="inline-flex items-center px-3 py-2 bg-[#ED6826] hover:bg-orange-600 text-white rounded-lg disabled:opacity-50">
                <Users className="h-4 w-4 mr-1" /> Constituer équipes
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {hackathons.map((h) => (
            <div key={h._id} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-start">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg">
                  <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-300" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">{h.title}</h3>
                  {h.description && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{h.description}</p>
                  )}
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {h.startDate ? new Date(h.startDate).toLocaleDateString() : '—'}
                      {h.endDate ? ` → ${new Date(h.endDate).toLocaleDateString()}` : ''}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      h.status === 'completed'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }`}>
                      {h.status || 'active'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {hackathons.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
            <p className="text-gray-600 dark:text-gray-400">Aucun hackathon disponible.</p>
          </div>
        )}

        {/* Create Hackathon Modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreate(false)} />
            <div className="relative z-10 w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Créer un Hackathon</h2>
                <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Titre</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full px-4 py-2 rounded-lg bg-white/70 dark:bg-gray-700/70 border border-gray-200/40 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#2D9349]" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-4 py-2 rounded-lg bg-white/70 dark:bg-gray-700/70 border border-gray-200/40 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#2D9349]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Début</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className="w-full px-4 py-2 rounded-lg bg-white/70 dark:bg-gray-700/70 border border-gray-200/40 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#2D9349]" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Fin</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required className="w-full px-4 py-2 rounded-lg bg-white/70 dark:bg-gray-700/70 border border-gray-200/40 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#2D9349]" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Spécifications (optionnel)</label>
                  <textarea value={specifications} onChange={(e) => setSpecifications(e.target.value)} rows={2} className="w-full px-4 py-2 rounded-lg bg-white/70 dark:bg-gray-700/70 border border-gray-200/40 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#2D9349]" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Taille d'équipe (1-5)</label>
                  <input type="number" min={1} max={5} value={teamSize} onChange={(e) => setTeamSize(Math.max(1, Math.min(5, parseInt(e.target.value || '1', 10))))} required className="w-full px-4 py-2 rounded-lg bg-white/70 dark:bg-gray-700/70 border border-gray-200/40 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#2D9349]" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600">Annuler</button>
                  <button type="submit" className="px-4 py-2 rounded-lg bg-[#2D9349] hover:bg-[#247a3d] text-white">Créer</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Constitute Teams Modal */}
        {showTeams && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowTeams(false)} />
            <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Constituer des équipes</h2>
                <button onClick={() => setShowTeams(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Nom d'équipe</label>
                    <input value={teamName} onChange={(e) => setTeamName(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-white/70 dark:bg-gray-700/70 border border-gray-200/40 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#2D9349]" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Membres</label>
                    <select multiple value={teamMembers} onChange={(e) => setTeamMembers(Array.from(e.target.selectedOptions).map(o => o.value))} className="w-full px-3 py-2 rounded-lg bg-white/70 dark:bg-gray-700/70 border border-gray-200/40 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#2D9349] h-32">
                      {availableLearners.map((l: any) => (
                        <option key={l._id} value={l._id}>{l.name} ({l.email})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button onClick={addTeamToDraft} className="px-4 py-2 rounded-lg bg-[#ED6826] hover:bg-orange-600 text-white">Ajouter l'équipe</button>
                </div>

                {teamsDraft.length > 0 && (
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Brouillon d'équipes</h3>
                    <ul className="list-disc ml-5 text-sm text-gray-700 dark:text-gray-300">
                      {teamsDraft.map((t, idx) => (
                        <li key={idx}>{t.name} — {t.members.length} membre(s)</li>
                      ))}
                    </ul>
                  </div>
                )}

                {currentTeams.length > 0 && (
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Équipes existantes</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                      <select value={selectedTeamForAdd} onChange={(e) => setSelectedTeamForAdd(e.target.value)} className="px-3 py-2 rounded-lg bg-white/70 dark:bg-gray-700/70 border border-gray-200/40 dark:border-white/10">
                        <option value="">Sélectionner une équipe</option>
                        {currentTeams.map((t: any) => (
                          <option key={t._id} value={t._id}>{t.name}</option>
                        ))}
                      </select>
                      <select value={selectedLearnerForAdd} onChange={(e) => setSelectedLearnerForAdd(e.target.value)} className="px-3 py-2 rounded-lg bg-white/70 dark:bg-gray-700/70 border border-gray-200/40 dark:border-white/10">
                        <option value="">Sélectionner un apprenant</option>
                        {availableLearners.map((l: any) => (
                          <option key={l._id} value={l._id}>{l.name} ({l.email})</option>
                        ))}
                      </select>
                      <button onClick={handleAddMember} className="px-4 py-2 rounded-lg bg-[#2D9349] hover:bg-[#247a3d] text-white">Ajouter</button>
                    </div>
                    <ul className="space-y-2">
                      {currentTeams.map((team: any) => (
                        <li key={team._id} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{team.name}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-300">{team.members?.length || 0} membre(s)</p>
                            </div>
                            <button onClick={() => handleDeleteTeam(team._id)} className="px-3 py-1 text-sm rounded-md bg-red-600 hover:bg-red-700 text-white">Supprimer</button>
                          </div>
                          {team.members?.length > 0 && (
                            <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {team.members.map((m: any) => (
                                <li key={m._id} className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded-md border border-gray-200 dark:border-gray-700">
                                  <span className="text-sm text-gray-800 dark:text-gray-200">{m.name} ({m.email})</span>
                                  <button onClick={() => handleRemoveMember(team._id, m._id)} className="px-2 py-1 text-xs rounded-md bg-red-500 hover:bg-red-600 text-white">Retirer</button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setShowTeams(false)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600">Annuler</button>
                  <button onClick={submitTeams} className="px-4 py-2 rounded-lg bg-[#2D9349] hover:bg-[#247a3d] text-white">Valider les équipes</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}



