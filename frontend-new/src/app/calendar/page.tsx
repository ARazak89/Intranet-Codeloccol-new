'use client';

import ProtectedRoute from '@/components/ProtectedRoute';

export default function CalendarPage() {
  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendrier d'activité</h1>
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-12 text-center text-gray-600 dark:text-gray-400">
          Placeholder calendrier — à intégrer (slots, événements, évaluations).
        </div>
      </div>
    </ProtectedRoute>
  );
}


