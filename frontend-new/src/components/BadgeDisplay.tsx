'use client';

import { Award, Star, Trophy, Medal, Shield, Zap } from 'lucide-react';

interface Badge {
  _id: string;
  name: string;
  description: string;
  icon?: string;
}

interface BadgeDisplayProps {
  badges: Badge[];
}

export default function BadgeDisplay({ badges }: BadgeDisplayProps) {
  const getBadgeIcon = (iconName?: string) => {
    const iconMap: Record<string, any> = {
      'bi-patch-check': Award,
      'bi-star': Star,
      'bi-trophy': Trophy,
      'bi-medal': Medal,
      'bi-shield': Shield,
      'bi-lightning': Zap,
    };

    return iconMap[iconName || 'bi-patch-check'] || Award;
  };

  if (!badges || badges.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center mb-4">
          <Award className="h-5 w-5 text-amber-500 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Mes Badges</h2>
        </div>
        <div className="text-center py-8">
          <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Aucun badge obtenu pour l'instant</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center mb-4">
        <Award className="h-5 w-5 text-amber-500 mr-2" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Mes Badges</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {badges.map((badge) => {
          const IconComponent = getBadgeIcon(badge.icon);
          
          return (
            <div 
              key={badge._id} 
              className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="flex flex-col items-center justify-center h-full">
                <IconComponent className="h-8 w-8 text-amber-500 mb-2" />
                <h3 className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                  {badge.name}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                  {badge.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

