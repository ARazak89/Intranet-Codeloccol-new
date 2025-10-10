'use client';

import { useRouter } from 'next/navigation';
import { 
  FolderOpen, 
  Clock, 
  CheckCircle, 
  XCircle, 
  User, 
  Hourglass,
  AlertCircle
} from 'lucide-react';

interface Project {
  _id: string;
  title: string;
  description?: string;
  status?: string;
  createdAt?: string;
  // Propriétés pour les projets assignés
  assignmentId?: string;
  assignmentStatus?: 'assigned' | 'submitted' | 'pending_review' | 'approved' | 'rejected';
  order?: number;
}

interface AssignedProjectsSectionProps {
  projects: Project[];
}

export default function AssignedProjectsSection({ projects }: AssignedProjectsSectionProps) {
  const router = useRouter();

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'submitted':
        return {
          text: 'Soumis (en attente d\'évaluation)',
          icon: Hourglass,
          className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
          iconClassName: 'text-amber-600'
        };
      case 'pending_review':
        return {
          text: 'En attente Staff',
          icon: User,
          className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
          iconClassName: 'text-blue-600'
        };
      case 'approved':
        return {
          text: 'Approuvé',
          icon: CheckCircle,
          className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
          iconClassName: 'text-green-600'
        };
      case 'rejected':
        return {
          text: 'Rejeté',
          icon: XCircle,
          className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
          iconClassName: 'text-red-600'
        };
      case 'assigned':
        return {
          text: 'Assigné',
          icon: Clock,
          className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
          iconClassName: 'text-purple-600'
        };
      default:
        return {
          text: 'Statut Inconnu',
          icon: AlertCircle,
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
          iconClassName: 'text-gray-600'
        };
    }
  };

  if (projects.length === 0) {
    return null; // Ne pas afficher la section s'il n'y a pas de projets
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center mb-4">
        <FolderOpen className="h-5 w-5 text-emerald-600 mr-2" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Mes Projets Assignés ({projects.length})
        </h2>
      </div>

      <div className="space-y-3">
        {projects.map((project) => {
          const status = project.assignmentStatus || project.status;
          const statusConfig = getStatusConfig(status);
          const StatusIcon = statusConfig.icon;

          return (
            <div 
              key={project._id} 
              className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
              onClick={() => router.push('/projects')}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <FolderOpen className="h-4 w-4 text-emerald-600 mr-2" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {project.title}
                    </span>
                    {project.order && (
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                        (Projet {project.order})
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.className}`}>
                      <StatusIcon className={`h-3 w-3 mr-1 ${statusConfig.iconClassName}`} />
                      {statusConfig.text}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
        <button
          onClick={() => router.push('/projects')}
          className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors"
        >
          Voir tous mes projets
        </button>
      </div>
    </div>
  );
}
