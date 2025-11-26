'use client';

import { useState } from 'react';
import { 
  CheckSquare, 
  Calendar, 
  Clock, 
  User, 
  Github, 
  ChevronDown, 
  ChevronUp,
  AlertTriangle,
  Users,
  RefreshCw
} from 'lucide-react';

interface Evaluation {
  _id: string;
  project: {
    _id: string;
    title: string;
    repoUrl?: string;
    status?: string;
  };
  student?: {
    name: string;
    email?: string;
  };
  evaluator?: {
    name: string;
    email: string;
  };
  slot?: {
    startTime: string;
    endTime: string;
  };
  status?: string;
  submissionDate?: string;
  studentName?: string;
}

interface User {
  _id: string;
  role: string;
}

interface UpcomingEvaluationsSectionProps {
  evaluations: Evaluation[];
  user: User | null;
  onOpenEvaluationModal: (evaluation: Evaluation) => void;
  onReassignEvaluation: (evaluationId: string) => void;
}

export default function UpcomingEvaluationsSection({ 
  evaluations, 
  user, 
  onOpenEvaluationModal,
  onReassignEvaluation 
}: UpcomingEvaluationsSectionProps) {
  const [expandedEvaluations, setExpandedEvaluations] = useState<Record<string, boolean>>({});
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  const toggleEvaluationExpansion = (evaluationId: string) => {
    setExpandedEvaluations(prev => ({
      ...prev,
      [evaluationId]: !prev[evaluationId]
    }));
  };

  const toggleProjectExpansion = (projectId: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getEvaluationStatus = (evaluation: Evaluation) => {
    const now = new Date();
    const evaluationStartTime = evaluation.slot ? new Date(evaluation.slot.startTime) : null;
    const evaluationEndTime = evaluation.slot ? new Date(evaluation.slot.endTime) : null;

    if (!evaluationStartTime || !evaluationEndTime) {
      return {
        status: 'error',
        text: 'Créneau manquant',
        className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        buttonText: 'Erreur',
        disabled: true
      };
    }

    const gracePeriodEnd = new Date(evaluationEndTime.getTime() + 60 * 60 * 1000);
    const isActive = now >= evaluationStartTime && now <= gracePeriodEnd;

    if (isActive) {
      return {
        status: 'active',
        text: 'Actif',
        className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        buttonText: 'Évaluer le projet',
        disabled: false
      };
    } else if (now < evaluationStartTime) {
      return {
        status: 'upcoming',
        text: `Actif à ${formatTime(evaluation.slot?.startTime || '')}`,
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        buttonText: 'En attente',
        disabled: true
      };
    } else {
      return {
        status: 'expired',
        text: 'Expiré',
        className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
        buttonText: 'Évaluation expirée',
        disabled: true
      };
    }
  };

  const getSubmissionStatus = (evaluation: Evaluation) => {
    const now = new Date();
    const evaluationEndTime = evaluation.slot ? new Date(evaluation.slot.endTime) : null;
    const submissionTime = evaluation.submissionDate ? new Date(evaluation.submissionDate) : null;

    if (!evaluationEndTime) return { text: 'N/A', className: 'bg-gray-100 text-gray-800' };

    const gracePeriodEnd = new Date(evaluationEndTime.getTime() + 60 * 60 * 1000);

    if (evaluation.status === 'accepted') {
      const timeStatus = submissionTime && submissionTime <= gracePeriodEnd ? 'Dans les temps' : 'En retard';
      return {
        text: 'Acceptée',
        className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        timeStatus
      };
    } else if (evaluation.status === 'rejected') {
      const timeStatus = submissionTime && submissionTime <= gracePeriodEnd ? 'Dans les temps' : 'En retard';
      return {
        text: 'Rejetée',
        className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        timeStatus
      };
    } else {
      return {
        text: 'En attente',
        className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
        timeStatus: now > gracePeriodEnd ? 'En retard' : 'En cours'
      };
    }
  };

  if (evaluations.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center mb-4">
          <CheckSquare className="h-5 w-5 text-blue-500 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Corrections à Venir
            {user?.role !== 'apprenant' && ' (Toutes les évaluations en attente)'}
          </h2>
        </div>
        <div className="text-center py-8">
          <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Aucune évaluation en attente pour le moment</p>
        </div>
      </div>
    );
  }

  // Pour les apprenants - affichage simple
  if (user?.role === 'apprenant') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center mb-4">
          <CheckSquare className="h-5 w-5 text-blue-500 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Corrections à Venir
          </h2>
        </div>

        <div className="space-y-4">
          {evaluations.map((evaluation) => {
            const status = getEvaluationStatus(evaluation);
            
            return (
              <div key={evaluation._id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <Calendar className="h-4 w-4 text-blue-500 mr-2" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        Projet: {evaluation.project.title}
                      </span>
                    </div>
                    
                    {evaluation.slot ? (
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-2">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>
                          Date: {formatDate(evaluation.slot.startTime)} de {formatTime(evaluation.slot.startTime)} à {formatTime(evaluation.slot.endTime)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center text-sm text-red-500 mb-2">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        <span>Erreur: Créneau horaire manquant</span>
                      </div>
                    )}

                    {evaluation.student && (
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-2">
                        <User className="h-4 w-4 mr-2" />
                        <span>Apprenant: {evaluation.student.name}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.className}`}>
                      {status.text}
                    </span>
                    
                    <button
                      onClick={() => toggleEvaluationExpansion(evaluation._id)}
                      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 transition-colors"
                    >
                      {expandedEvaluations[evaluation._id] ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>

                {expandedEvaluations[evaluation._id] && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <div className="space-y-3">
                      {evaluation.project.repoUrl && (
                        <div className="flex items-start">
                          <Github className="h-4 w-4 text-gray-500 mr-2 mt-0.5" />
                          <div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">Dépôt:</span>
                            <div>
                              <a
                                href={evaluation.project.repoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                              >
                                {evaluation.project.repoUrl}
                              </a>
                            </div>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => onOpenEvaluationModal(evaluation)}
                        disabled={status.disabled}
                        className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          status.disabled
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-amber-600 hover:bg-amber-700 text-white'
                        }`}
                      >
                        {status.buttonText}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Pour le staff/admin - affichage groupé par projet
  const groupedEvaluations = evaluations.reduce((acc, evaluation) => {
    const projectId = evaluation.project._id;
    if (!acc[projectId]) {
      acc[projectId] = {
        project: evaluation.project,
        evaluations: []
      };
    }
    acc[projectId].evaluations.push(evaluation);
    return acc;
  }, {} as Record<string, { project: any; evaluations: Evaluation[] }>);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center mb-4">
        <CheckSquare className="h-5 w-5 text-blue-500 mr-2" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Corrections à Venir (Toutes les évaluations en attente)
        </h2>
      </div>

      <div className="space-y-4">
        {Object.values(groupedEvaluations).map((projectGroup) => (
          <div key={projectGroup.project._id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <Users className="h-4 w-4 text-blue-500 mr-2" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    Projet: {projectGroup.project.title}
                  </span>
                </div>
                
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Soumis par: {projectGroup.evaluations[0]?.studentName || 'N/A'}
                </div>

                {projectGroup.project.status && (
                  <div className="flex items-center mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">Statut du projet:</span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {projectGroup.project.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}

                {projectGroup.project.repoUrl && (
                  <div className="flex items-start">
                    <Github className="h-4 w-4 text-gray-500 mr-2 mt-0.5" />
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Dépôt:</span>
                      <div>
                        <a
                          href={projectGroup.project.repoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                        >
                          {projectGroup.project.repoUrl}
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => toggleProjectExpansion(projectGroup.project._id)}
                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 transition-colors"
              >
                {expandedProjects[projectGroup.project._id] ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
            </div>

            {expandedProjects[projectGroup.project._id] && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <div className="space-y-3">
                  <div className="font-medium text-gray-900 dark:text-white">Évaluations des pairs :</div>
                  
                  {projectGroup.evaluations.map((evaluation) => {
                    const submissionStatus = getSubmissionStatus(evaluation);
                    
                    return (
                      <div key={evaluation._id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-500 mr-2" />
                          <span className="text-sm text-gray-900 dark:text-white">
                            Évaluateur: <strong>{evaluation.evaluator?.name}</strong> ({evaluation.evaluator?.email})
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${submissionStatus.className}`}>
                            {submissionStatus.text}
                          </span>
                          
                          {submissionStatus.timeStatus && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                              {submissionStatus.timeStatus}
                            </span>
                          )}

                          {(evaluation.status === 'rejected' || 
                            (evaluation.status === 'pending' && submissionStatus.timeStatus === 'En retard')) && (
                            <button
                              onClick={() => onReassignEvaluation(evaluation._id)}
                              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800 transition-colors"
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Réassigner
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
