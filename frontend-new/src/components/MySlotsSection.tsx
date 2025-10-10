'use client';

import { useState } from 'react';
import { Calendar, Clock, User, Trash2, ChevronDown, ChevronUp, CheckCircle, Info } from 'lucide-react';

interface Slot {
  _id: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  bookedByStudent?: {
    name: string;
  };
  bookedForProject?: {
    title: string;
  };
  createdAt: string;
}

interface MySlotsSectionProps {
  slots: Slot[];
  onDeleteSlot: (slotId: string) => void;
  onCreateSlot: () => void;
}

export default function MySlotsSection({ slots, onDeleteSlot, onCreateSlot }: MySlotsSectionProps) {
  const [expandedSlots, setExpandedSlots] = useState<Record<string, boolean>>({});

  // Filtrer les slots qui ne sont pas encore expirés (1 heure après la fin)
  const activeSlots = slots.filter((slot) => {
    const slotEndTime = new Date(slot.endTime);
    const oneHourAfterEndTime = new Date(slotEndTime.getTime() + 60 * 60 * 1000);
    const currentTime = new Date();
    return currentTime < oneHourAfterEndTime;
  });

  const toggleSlotExpansion = (slotId: string) => {
    setExpandedSlots(prev => ({
      ...prev,
      [slotId]: !prev[slotId]
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

  if (activeSlots.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-emerald-600" />
            Mes Slots de Disponibilité
          </h2>
          <button
            onClick={onCreateSlot}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors"
          >
            Créer un slot
          </button>
        </div>
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Aucun slot de disponibilité créé</p>
          <button
            onClick={onCreateSlot}
            className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors"
          >
            Créer votre premier slot
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-emerald-600" />
          Mes Slots de Disponibilité
        </h2>
        <button
          onClick={onCreateSlot}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors"
        >
          Créer un slot
        </button>
      </div>

      <div className="space-y-4">
        {activeSlots.map((slot) => (
          <div key={slot._id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <Clock className="h-4 w-4 text-gray-500 mr-2" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatDate(slot.startTime)} de {formatTime(slot.startTime)} à {formatTime(slot.endTime)}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {slot.isBooked ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Réservé
                    </span>
                  ) : (
                    <button
                      onClick={() => onDeleteSlot(slot._id)}
                      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800 transition-colors"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Supprimer
                    </button>
                  )}
                  
                  <button
                    onClick={() => toggleSlotExpansion(slot._id)}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    {expandedSlots[slot._id] ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {expandedSlots[slot._id] && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                {slot.isBooked ? (
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <User className="h-4 w-4 text-gray-500 mr-2" />
                      <span className="text-gray-600 dark:text-gray-400">Réservé par:</span>
                      <span className="font-medium text-gray-900 dark:text-white ml-1">
                        {slot.bookedByStudent?.name || '[Utilisateur inconnu]'}
                      </span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Info className="h-4 w-4 text-gray-500 mr-2" />
                      <span className="text-gray-600 dark:text-gray-400">Pour le projet:</span>
                      <span className="font-medium text-gray-900 dark:text-white ml-1">
                        {slot.bookedForProject?.title || '[Projet inconnu]'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Ce slot est actuellement disponible.
                  </div>
                )}
                
                <div className="flex items-center text-sm mt-3 text-gray-500 dark:text-gray-400">
                  <Info className="h-4 w-4 mr-2" />
                  Créé le: {new Date(slot.createdAt).toLocaleString('fr-FR')}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
