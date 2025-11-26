'use client';

import { useState } from 'react';
import { 
  Clock, 
  FileText, 
  User, 
  Github, 
  Calendar, 
  ChevronDown, 
  ChevronUp,
  Users,
  UserCheck
} from 'lucide-react';

interface Project {
  _id: string;
  title: string;
  description?: string;
  status?: string;
  createdAt?: string;
  // Propriétés optionnelles pour les projets en cours d'évaluation
  assignmentId?: string;
  assignmentStatus?: 'submitted' | 'pending_review';
  peerEvaluators?: Array<{ name: string } | string>;
  repoUrl?: string;
  submissionDate?: string;
}

interface PendingProjectsSectionProps {
  projects: Project[];
}

export default function PendingProjectsSection({ projects }: PendingProjectsSectionProps) {
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  // Filtrer les projets en cours d'évaluation
  const pendingProjects = projects.filter(
    (project) =>
      project.assignmentStatus === 'submitted' ||
      project.assignmentStatus === 'pending_review' ||
      project.status === 'submitted' ||
      project.status === 'pending_review'
  );

  const toggleProjectExpansion = (projectId: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  const getStatusBadge = (project: Project) => {
    const status = project.assignmentStatus || project.status;
    if (status === 'submitted') {
      return {
        text: 'En attente d\'évaluation',
      };
    } else if (status === 'pending_review') {
      return {
        text: 'En Attente Staff',
      };
    }
    return { text: status || 'En cours' };
  };

  if (pendingProjects.length === 0) {
    return null; // Ne pas afficher la section s'il n'y a pas de projets en attente
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center mb-4">
        <Clock className="h-5 w-5 text-amber-500 mr-2" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Projets en Cours d'Évaluation
        </h2>
      </div>

      <div className="space-y-4">
        {pendingProjects.map((project) => (
          <div 
            key={project._id} 
            className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <FileText className="h-4 w-4 text-blue-500 mr-2" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {project.title}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    (project.assignmentStatus || project.status) === 'submitted' 
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  }`}>
                    <Clock className="h-3 w-3 mr-1" />
                    {getStatusBadge(project).text}
                  </span>
                  
                  <button
                    onClick={() => toggleProjectExpansion(project._id)}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 transition-colors"
                  >
                    {expandedProjects[project._id] ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {expandedProjects[project._id] && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <div className="space-y-3">
                  {/* Évaluateurs */}
                  <div className="flex items-start">
                    <UserCheck className="h-4 w-4 text-gray-500 mr-2 mt-0.5" />
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Évaluateurs:</span>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {project.peerEvaluators && project.peerEvaluators.length > 0
                          ? project.peerEvaluators
                              .map((evaluator) => 
                                typeof evaluator === 'string' ? evaluator : evaluator.name
                              )
                              .join(', ')
                          : 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Dépôt GitHub */}
                  {project.repoUrl && (
                    <div className="flex items-start">
                      <Github className="h-4 w-4 text-gray-500 mr-2 mt-0.5" />
                      <div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Dépôt:</span>
                        <div>
                          <a
                            href={project.repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                          >
                            {project.repoUrl}
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Date de soumission */}
                  {project.submissionDate && (
                    <div className="flex items-start">
                      <Calendar className="h-4 w-4 text-gray-500 mr-2 mt-0.5" />
                      <div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Date de soumission:</span>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {new Date(project.submissionDate).toLocaleString('fr-FR')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
