import { useState, useEffect } from 'react';
import UserSelector from './UserSelector';
import styles from '../styles/calendar.module.css';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = 'Africa/Niamey';

const EVENT_TYPES = [
  { value: 'hackathon', label: 'Hackathon', icon: 'bi-trophy' },
  { value: 'evaluation', label: 'Évaluation', icon: 'bi-clipboard-check' },
  { value: 'formation', label: 'Formation', icon: 'bi-book' },
  { value: 'reunion', label: 'Réunion', icon: 'bi-people' },
  { value: 'deadline', label: 'Deadline', icon: 'bi-alarm' },
  { value: 'autre', label: 'Autre', icon: 'bi-calendar-event' },
];

export default function CreateEventModal({ onClose, onSubmit, isSubmitting }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    type: 'autre',
    location: '',
    isAllDay: false,
    responsables: [],
  });

  const [error, setError] = useState(null);

  useEffect(() => {
    if (formData.startDate && formData.startTime) {
      let processedStartTime = formData.startTime.replace('h', ':');
      
      // Tenter de compléter l'heure si elle est partielle
      let [hours, minutes] = processedStartTime.split(':');
      if (hours && !minutes) {
        minutes = '00'; // Si seulement les heures sont fournies (ex: "12"), ajouter ":00"
      }
      if (hours) {
        hours = hours.padStart(2, '0');
      }
      processedStartTime = `${hours || ''}:${minutes || ''}`; // Reconstruire l'heure

      const timeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

      if (!timeRegex.test(processedStartTime)) {
        setFormData(prev => ({ ...prev, endDate: '', endTime: '' }));
        return; 
      }

      const startDateTimeString = `${formData.startDate}T${processedStartTime}:00`;
      const start = dayjs.tz(startDateTimeString, TIMEZONE);
      
      if (start.isValid()) {
        const end = start.add(30, 'minutes');
        const endDate = end.format('YYYY-MM-DD');
        const endTime = end.format('HH:mm');

        setFormData(prev => ({
          ...prev,
          endDate: endDate,
          endTime: endTime,
        }));
      } else {
          // Si la date de début est invalide, réinitialiser la date et l'heure de fin
          setFormData(prev => ({ ...prev, endDate: '', endTime: '' }));
      }
    } else {
        // Si startDate ou startTime sont manquants, effacer endDate et endTime
        if (formData.endDate || formData.endTime) {
            setFormData(prev => ({ ...prev, endDate: '', endTime: '' }));
        }
    }
  }, [formData.startDate, formData.startTime]);

  const handleChange = (field, value) => {
    if (field === 'startTime') {
      let correctedValue = value.replace('h', ':');
      // Ne pas valider le format ici, laisser useEffect s'en charger pour le calcul.
      // Accepter la valeur corrigée même si elle est partielle (ex: "12:")
      setFormData(prev => ({ ...prev, [field]: correctedValue }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    setError(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.title.trim()) {
      setError('Le titre est requis');
      return;
    }

    if (!formData.startDate) {
      setError('La date de début est requise');
      return;
    }

    if (!formData.endDate) {
      setError('La date de fin est requise');
      return;
    }

    // Construire les dates complètes
    const startDateTime = formData.isAllDay 
      ? dayjs.tz(`${formData.startDate}T00:00:00`, TIMEZONE).utc().toISOString()
      : dayjs.tz(`${formData.startDate}T${formData.startTime || '09:00'}:00`, TIMEZONE).utc().toISOString();

    const endDateTime = formData.isAllDay 
      ? dayjs.tz(`${formData.endDate}T23:59:59`, TIMEZONE).utc().toISOString()
      : dayjs.tz(`${formData.endDate}T${formData.endTime || '18:00'}:00`, TIMEZONE).utc().toISOString();

    // Vérifier que la date de fin est après la date de début
    if (dayjs(endDateTime).isSameOrBefore(dayjs(startDateTime))) {
      setError('La date de fin doit être après la date de début');
      return;
    }

    onSubmit({
      ...formData,
      startDate: startDateTime,
      endDate: endDateTime,
    });
  };

  return (
    <div className={styles.eventModalOverlay} onClick={onClose}>
      <div className={styles.eventModalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.eventModalHeader}>
          <h5>
            <i className="bi bi-calendar-plus me-2"></i>
            Créer un événement
          </h5>
          <button className={styles.closeBtn} onClick={onClose}>
            <i className="bi bi-x" style={{ fontSize: '24px' }}></i>
          </button>
        </div>

        <div className={styles.eventModalBody}>
          {error && (
            <div className="alert alert-danger mb-3" role="alert">
              <i className="bi bi-exclamation-circle me-2"></i>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Titre */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <i className="bi bi-card-text me-2" style={{ color: '#179349' }}></i>
                Titre de l'événement *
              </label>
              <input
                type="text"
                className={styles.formControl}
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Ex: Hackathon de fin de module"
                required
              />
            </div>

            {/* Description */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <i className="bi bi-text-paragraph me-2" style={{ color: '#F36F35' }}></i>
                Description
              </label>
              <textarea
                className={styles.formControl}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Détails de l'événement..."
                rows="3"
              />
            </div>

            {/* Type d'événement */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <i className="bi bi-tag me-2" style={{ color: '#179349' }}></i>
                Type d'événement
              </label>
              <div className={styles.eventTypeSelector}>
                {EVENT_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    className={`${styles.eventTypeBtn} ${formData.type === type.value ? styles.active : ''}`}
                    onClick={() => handleChange('type', type.value)}
                  >
                    <i className={`bi ${type.icon} ${styles.eventTypeBtnIcon}`}></i>
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Toute la journée */}
            <div className={styles.checkboxContainer}>
              <input
                type="checkbox"
                id="isAllDay"
                checked={formData.isAllDay}
                onChange={(e) => handleChange('isAllDay', e.target.checked)}
              />
              <label htmlFor="isAllDay" className={styles.checkboxLabel}>
                <i className="bi bi-calendar-day me-2"></i>
                Événement sur toute la journée
              </label>
            </div>

            {/* Dates */}
            <div className={styles.formRow}>
              <div className={styles.formCol}>
                <label className={styles.formLabel}>
                  Date de début *
                </label>
                <input
                  type="date"
                  className={styles.formControl}
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  required
                />
                {!formData.isAllDay && (
                  <input
                    type="text" // Changé de "time" à "text"
                    className={`${styles.formControl} mt-2`}
                    value={formData.startTime} // formData.startTime est maintenant toujours au bon format
                    onChange={(e) => handleChange('startTime', e.target.value)}
                    placeholder="HH:mm" // Ajout d'un placeholder pour guider l'utilisateur
                  />
                )}
              </div>

              <div className={styles.formCol}>
                <label className={styles.formLabel}>
                  Date de fin *
                </label>
                <input
                  type="date"
                  className={styles.formControl}
                  value={formData.endDate}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                  required
                  readOnly
                />
                {!formData.isAllDay && (
                  <input
                    type="text" // Changé de "time" à "text"
                    className={`${styles.formControl} mt-2`}
                    value={formData.endTime}
                    // Supprimé onChange car le champ est readOnly et la valeur est calculée
                    readOnly
                    placeholder="HH:mm" // Ajout d'un placeholder
                  />
                )}
              </div>
            </div>

            {/* Lieu */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <i className="bi bi-geo-alt me-2" style={{ color: '#F36F35' }}></i>
                Lieu
              </label>
              <input
                type="text"
                className={styles.formControl}
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="Ex: Salle de formation, En ligne, etc."
              />
            </div>

            {/* Responsables/Organisateurs */}
            <UserSelector
              selectedUsers={formData.responsables}
              onChange={(users) => handleChange('responsables', users)}
              eventType={formData.type}
            />

            {/* Boutons d'action */}
            <div className="d-flex gap-3 mt-4">
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Création...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle"></i>
                    Créer l'événement
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

