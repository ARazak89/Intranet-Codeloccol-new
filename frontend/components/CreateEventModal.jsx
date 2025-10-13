import { useState } from 'react';
import UserSelector from './UserSelector';
import styles from '../styles/calendar.module.css';

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

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
      ? `${formData.startDate}T00:00:00`
      : `${formData.startDate}T${formData.startTime || '09:00'}:00`;

    const endDateTime = formData.isAllDay 
      ? `${formData.endDate}T23:59:59`
      : `${formData.endDate}T${formData.endTime || '18:00'}:00`;

    // Vérifier que la date de fin est après la date de début
    if (new Date(endDateTime) <= new Date(startDateTime)) {
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
                    type="time"
                    className={`${styles.formControl} mt-2`}
                    value={formData.startTime}
                    onChange={(e) => handleChange('startTime', e.target.value)}
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
                />
                {!formData.isAllDay && (
                  <input
                    type="time"
                    className={`${styles.formControl} mt-2`}
                    value={formData.endTime}
                    onChange={(e) => handleChange('endTime', e.target.value)}
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

