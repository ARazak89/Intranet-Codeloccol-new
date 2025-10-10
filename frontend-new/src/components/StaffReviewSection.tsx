'use client';

import { useState } from 'react';
import { 
  FileCheck, 
  User, 
  Github, 
  Calendar, 
  ChevronDown, 
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  XCircle
} from 'lucide-react';

interface Student {
  name: string;
  email?: string;
}

interface Project {
  _id: string;
  projectId: string;
  assignmentId: string;
  title: string;
  repoUrl?: string;
  submissionDate: string;
  student: Student;
}

interface User {
  _id: string;
  role: string;
}

interface StaffReviewSectionProps {
  projects: Project[];
  user: User | null;
  onApprove: (projectId: string, assignmentId: string) => void;
  onReject: (projectId: string, assignmentId: string) => void;
}

export default function StaffReviewSection({ 
  projects, 
  user, 
  onApprove,
  onReject 
}: StaffReviewSectionProps) {
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  const toggleProjectExpansion = (projectId: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Vérifier si l'utilisateur a les permissions
  if (!user || (user.role !== 'staff' && user.role !== 'admin')) {
    return null;
  }

  // Aucun projet en attente
  if (projects.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center mb-4">
        <FileCheck className="h-5 w-5 text-amber-500 mr-2" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Projets en Attente de Révision Finale (Personnel)
        </h2>
      </div>

      <div className="space-y-4">
        {projects.map((project) => (
          <div 
            key={project._id} 
            className="border border-amber-200 dark:border-amber-800 rounded-lg p-4 bg-amber-50 dark:bg-amber-950"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mr-2" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    Projet: {project.title}
                  </span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <User className="h-4 w-4 mr-2" />
                  <span>Soumis par: <strong>{project.student.name}</strong></span>
                </div>

                <div className="flex items-center mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">Statut actuel:</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    En Attente Staff
                  </span>
                </div>

                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Date de soumission: {formatDate(project.submissionDate)}</span>
                </div>
              </div>

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

            {expandedProjects[project._id] && (
              <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-800">
                <div className="space-y-3">
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

                  {project.student.email && (
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <User className="h-4 w-4 mr-2" />
                      <span>Email de l'étudiant: {project.student.email}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <button
                      onClick={() => onApprove(project.projectId, project.assignmentId)}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white transition-colors"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Approuver
                    </button>
                    
                    <button
                      onClick={() => onReject(project.projectId, project.assignmentId)}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-colors"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Rejeter
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}