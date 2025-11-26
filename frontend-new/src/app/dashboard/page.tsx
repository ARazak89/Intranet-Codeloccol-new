'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { 
  FolderOpen, 
  Trophy, 
  CheckSquare, 
  Calendar,
  Users,
  TrendingUp,
  Clock,
  Star
} from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import MySlotsSection from '@/components/MySlotsSection';
import PendingProjectsSection from '@/components/PendingProjectsSection';
import AssignedProjectsSection from '@/components/AssignedProjectsSection';
import HackathonsBadgesSection from '@/components/HackathonsBadgesSection';
import HackathonSubmissionModal from '@/components/HackathonSubmissionModal';
import UpcomingEvaluationsSection from '@/components/UpcomingEvaluationsSection';
import { getMineProjects } from '@/actions/projects';
import { getHackathons } from '@/actions/hackathons';
import { getMineNotifications } from '@/actions/notifications';
import { evaluationsForStafs, getMineEvaluations } from '@/actions/evaluations';
import { slotMine } from '@/actions/slot';
import StaffReviewSection from '@/components/StaffReviewSection';
import SlotList from '@/components/SlotList';


interface Project {
  _id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
}

interface Hackathon {
  _id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface Notification {
  _id: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [evaluationsMine, setEvaluationsMine] = useState<any[]>([]);
  const [slotsMine, setSlotsMine] = useState<any[]>([]);
  const [pendingForStaff, setPendingForStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create slot modal state


  // Hackathon submission modal state
  const [showHackathonSubmission, setShowHackathonSubmission] = useState(false);
  const [currentHackathon, setCurrentHackathon] = useState<any>(null);
  const [currentTeam, setCurrentTeam] = useState<any>(null);
  const [hackathonSubmissionLoading, setHackathonSubmissionLoading] = useState(false);
  const [hackathonSubmissionError, setHackathonSubmissionError] = useState<string | null>(null);
  const [hackathonSubmissionSuccess, setHackathonSubmissionSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const requests = [
        getMineProjects(),
        getHackathons(),
        getMineNotifications(),
        getMineEvaluations(),
        slotMine(),
        evaluationsForStafs(),
      ];

   

      const [projectsData, hackathonsData, notificationsData, evaluationsData, slotsData, pendingEvals] = await Promise.all(requests);

      setProjects(projectsData);
      setHackathons(hackathonsData);
      setNotifications(notificationsData);
      setEvaluationsMine(evaluationsData);
      setSlotsMine(slotsData);
      setPendingForStaff(pendingEvals);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };





  // Hackathon submission functions
  const handleShowSubmitHackathonModal = (hackathon: any, team: any) => {
    setCurrentHackathon(hackathon);
    setCurrentTeam(team);
    setShowHackathonSubmission(true);
    setHackathonSubmissionError(null);
    setHackathonSubmissionSuccess(null);
  };

  const handleCloseHackathonSubmissionModal = () => {
    setShowHackathonSubmission(false);
    setCurrentHackathon(null);
    setCurrentTeam(null);
    setHackathonSubmissionError(null);
    setHackathonSubmissionSuccess(null);
  };

  const handleSubmitHackathonProject = async (repoUrl: string) => {
    setHackathonSubmissionLoading(true);
    setHackathonSubmissionError(null);
    setHackathonSubmissionSuccess(null);

    try {
      // TODO: Implement hackathon project submission API call
      // await api.hackathons.submitProject(currentHackathon._id, currentTeam._id, repoUrl);
      
      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setHackathonSubmissionSuccess('Projet soumis avec succès !');
      
      // Close modal after success
      setTimeout(() => {
        handleCloseHackathonSubmissionModal();
      }, 2000);
      
    } catch (error: any) {
      setHackathonSubmissionError(error.message || 'Erreur lors de la soumission du projet');
    } finally {
      setHackathonSubmissionLoading(false);
    }
  };

  // Evaluation functions
  const handleOpenEvaluationModal = (evaluation: any) => {
    // TODO: Implement evaluation modal
    console.log('Opening evaluation modal for:', evaluation);
  };

  const handleReassignEvaluation = async (evaluationId: string) => {
    try {
      // TODO: Implement evaluation reassignment API call
      // await api.evaluations.reassign(evaluationId);
      console.log('Reassigning evaluation:', evaluationId);
    } catch (error: any) {
      console.error('Error reassigning evaluation:', error);
    }
  };

  const handleApproveProject = async (projectId: string, assignmentId: string) => {
    console.log('Approving project:', projectId, assignmentId);
  };

  const handleRejectProject = async (projectId: string, assignmentId: string) => {
    console.log('Rejecting project:', projectId, assignmentId);
  };

  const stats = [
    {
      name: 'Projets',
      value: projects.length,
      icon: FolderOpen,
      color: 'bg-blue-500',
    },
    {
      name: 'Hackathons',
      value: hackathons.length,
      icon: Trophy,
      color: 'bg-yellow-500',
    }, 
    {
      name: 'Notifications',
      value: notifications.filter(n => !n.read).length,
      icon: CheckSquare,
      color: 'bg-green-500',
    },
    {
      name: 'Jours restants',
      value: user?.daysRemaining || 0,
      icon: Clock,
      color: 'bg-purple-500',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        {/* Welcome section */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">
            Bienvenue, {user?.name} !
          </h1>
          <p className="text-emerald-100">
            Voici un aperçu de votre activité sur la plateforme CodeLoccol.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.name} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {stat.name}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stat.value}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

     

        {/* Pending Projects Section - Only for apprenants */}
        {user?.role === 'apprenant' && (
          <PendingProjectsSection projects={projects} />
        )}

        {/* Assigned Projects Section - Only for apprenants */}
        {user?.role === 'apprenant' && (
          <AssignedProjectsSection projects={projects} />
        )}

        {/* Hackathons and Badges Section - Only for apprenants */}
        {user?.role === 'apprenant' && (
          <HackathonsBadgesSection 
            hackathons={hackathons}
            badges={[]} // TODO: Add badges data when available
            user={user}
            onShowSubmitHackathonModal={handleShowSubmitHackathonModal}
          />
        )}

        {/* Upcoming Evaluations Section - For all roles */}
        <UpcomingEvaluationsSection 
          evaluations={pendingForStaff || []}
          user={user}
          onOpenEvaluationModal={handleOpenEvaluationModal}
          onReassignEvaluation={handleReassignEvaluation}
        />

        <StaffReviewSection
          projects={pendingForStaff || []}
          user={user}
          onApprove={handleApproveProject}
          onReject={handleRejectProject}
        />

        {/* Create Slot Modal */}
        {/* {showCreateSlot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreateSlot(false)} />
            <div className="relative z-10 w-full max-w-md bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Créer un créneau</h2>
              {slotError && <p className="text-red-500 text-sm mb-3">{slotError}</p>}
              <form onSubmit={handleCreateSlot} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Date</label>
                  <input type="date" value={slotDate} onChange={(e) => setSlotDate(e.target.value)} required className="w-full px-4 py-2 rounded-lg bg-white/70 dark:bg-gray-700/70 border border-gray-200/40 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#2D9349]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Début</label>
                    <input type="time" value={slotStartTime} onChange={(e) => setSlotStartTime(e.target.value)} required className="w-full px-4 py-2 rounded-lg bg-white/70 dark:bg-gray-700/70 border border-gray-200/40 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#2D9349]" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Fin</label>
                    <input type="time" value={slotEndTime} onChange={(e) => setSlotEndTime(e.target.value)} required className="w-full px-4 py-2 rounded-lg bg-white/70 dark:bg-gray-700/70 border border-gray-200/40 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#2D9349]" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowCreateSlot(false)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600">Annuler</button>
                  <button type="submit" className="px-4 py-2 rounded-lg bg-[#2D9349] hover:bg-[#247a3d] text-white">Créer</button>
                </div>
              </form>
            </div>
          </div>
        )} */}

        <SlotList slots={slotsMine || []} />


       
      </div>

      {/* Hackathon Submission Modal */}
      <HackathonSubmissionModal
        isOpen={showHackathonSubmission}
        onClose={handleCloseHackathonSubmissionModal}
        hackathon={currentHackathon}
        team={currentTeam}
        onSubmit={handleSubmitHackathonProject}
        isLoading={hackathonSubmissionLoading}
        error={hackathonSubmissionError}
        success={hackathonSubmissionSuccess}
      />
    </ProtectedRoute>
  );
}
