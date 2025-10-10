'use client';

import { Trophy, Calendar, Users, Upload, CheckCircle, XCircle, ExternalLink } from 'lucide-react';

interface Hackathon {
  _id: string;
  title: string;
  description: string;
  status: string;
  startDate: string;
  endDate: string;
  teamSize?: number;
  teams?: Array<{
    members: Array<{ _id: string }>;
    repoUrl?: string;
  }>;
}

interface User {
  _id: string;
  role: string;
}

interface HackathonListProps {
  hackathons: Hackathon[];
  user: User | null;
  onShowSubmitHackathonModal: (hackathon: Hackathon, team: any) => void;
}

export default function HackathonList({ hackathons, user, onShowSubmitHackathonModal }: HackathonListProps) {
  if (!hackathons || hackathons.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center mb-4">
          <Trophy className="h-5 w-5 text-amber-500 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Mes Hackathons</h2>
        </div>
        <div className="text-center py-8">
          <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Aucun hackathon en cours</p>
        </div>
      </div>
    );
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          text: 'Actif',
          className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
          icon: CheckCircle
        };
      case 'finished':
        return {
          text: 'Terminé',
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
          icon: XCircle
        };
      default:
        return {
          text: 'À venir',
          className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
          icon: Calendar
        };
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center mb-4">
        <Trophy className="h-5 w-5 text-amber-500 mr-2" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Mes Hackathons</h2>
      </div>

      <div className="space-y-4">
        {hackathons.map((hackathon) => {
          const statusConfig = getStatusConfig(hackathon.status);
          const StatusIcon = statusConfig.icon;

          // Trouver l'équipe de l'utilisateur pour ce hackathon
          const myTeam = hackathon.teams?.find((team) =>
            team.members.some((member) => member._id === user?._id)
          );

          const now = new Date();
          const hackathonEndDate = new Date(hackathon.endDate);
          const isSubmissionPeriodActive = now < hackathonEndDate;

          return (
            <div key={hackathon._id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900 dark:text-white">{hackathon.title}</h3>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.className}`}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig.text}
                </span>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{hackathon.description}</p>

              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-3">
                <Calendar className="h-4 w-4 mr-2" />
                <span>
                  Début: {new Date(hackathon.startDate).toLocaleDateString('fr-FR')} - 
                  Fin: {new Date(hackathon.endDate).toLocaleDateString('fr-FR')}
                </span>
              </div>

              {hackathon.teamSize && (
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-3">
                  <Users className="h-4 w-4 mr-2" />
                  <span>Taille d'équipe: {hackathon.teamSize}</span>
                </div>
              )}

              {/* Actions pour l'utilisateur apprenant */}
              {user?.role === 'apprenant' && myTeam && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  {!myTeam.repoUrl && isSubmissionPeriodActive ? (
                    <button
                      onClick={() => onShowSubmitHackathonModal(hackathon, myTeam)}
                      className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Soumettre le Projet de Hackathon
                    </button>
                  ) : myTeam.repoUrl ? (
                    <div className="flex items-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 mr-2">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Projet Soumis
                      </span>
                      <a
                        href={myTeam.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Voir
                      </a>
                    </div>
                  ) : !isSubmissionPeriodActive ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                      <XCircle className="h-3 w-3 mr-1" />
                      Période de soumission terminée
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
