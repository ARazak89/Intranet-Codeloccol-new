import { useState } from 'react';
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

export default function EventDetailsModal({ 
  event, 
  onClose, 
  onEdit, 
  onDelete, 
  canEdit,
  isDeleting 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: event.title || '',
    description: event.extendedProps?.description || '',
    startDate: event.start ? dayjs(event.start).tz(TIMEZONE).format('YYYY-MM-DD') : '',
    startTime: event.start && !event.allDay ? dayjs(event.start).tz(TIMEZONE).format('HH:mm') : '',
    endDate: event.end ? dayjs(event.end).tz(TIMEZONE).format('YYYY-MM-DD') : '',
    endTime: event.end && !event.allDay ? dayjs(event.end).tz(TIMEZONE).format('HH:mm') : '',
    type: event.extendedProps?.type || 'autre',
    location: event.extendedProps?.location || '',
    isAllDay: event.allDay || false,
    responsables: event.extendedProps?.responsables ? event.extendedProps.responsables.map(r => r._id || r) : [],
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Construire les dates complètes
    const startDateTime = formData.isAllDay 
      ? dayjs.tz(`${formData.startDate}T00:00:00`, TIMEZONE).utc().toISOString()
      : dayjs.tz(`${formData.startDate}T${formData.startTime || '09:00'}:00`, TIMEZONE).utc().toISOString();

    const endDateTime = formData.isAllDay 
      ? dayjs.tz(`${formData.endDate}T23:59:59`, TIMEZONE).utc().toISOString()
      : dayjs.tz(`${formData.endDate}T${formData.endTime || '18:00'}:00`, TIMEZONE).utc().toISOString();

    await onEdit(event.id, {
      ...formData,
      startDate: startDateTime,
      endDate: endDateTime,
    });

    setIsSubmitting(false);
    setIsEditing(false);
  };

  const handleDeleteClick = () => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'événement "${event.title}" ?`)) {
      onDelete(event.id);
    }
  };

  const getEventTypeIcon = (type) => {
    const eventType = EVENT_TYPES.find(t => t.value === type);
    return eventType ? eventType.icon : 'bi-calendar-event';
  };

  const getEventTypeLabel = (type) => {
    const eventType = EVENT_TYPES.find(t => t.value === type);
    return eventType ? eventType.label : 'Autre';
  };

  const getResponsableLabel = (type) => {
    const labels = {
      evaluation: 'Évaluateurs',
      formation: 'Formateurs',
      hackathon: 'Organisateurs',
      reunion: 'Animateurs',
      deadline: 'Responsables',
      autre: 'Responsables',
    };
    return labels[type] || 'Responsables';
  };

  const getResponsableIcon = (type) => {
    const icons = {
      evaluation: 'bi-clipboard-check',
      formation: 'bi-mortarboard',
      hackathon: 'bi-trophy',
      reunion: 'bi-people',
      deadline: 'bi-person-badge',
      autre: 'bi-person-badge',
    };
    return icons[type] || 'bi-person-badge';
  };

  const formatDate = (date) => {
    if (!date) return '';
    return dayjs(date).tz(TIMEZONE).format('dddd D MMMM YYYY');
  };

  const formatTime = (date) => {
    if (!date) return '';
    return dayjs(date).tz(TIMEZONE).format('HH[h]mm');
  };

  return (
    <div className={styles.eventModalOverlay} onClick={onClose}>
      <div className={styles.eventDetailsModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.eventModalHeader}>
          <h5>
            <i className={`bi ${getEventTypeIcon(event.extendedProps?.type)} me-2`}></i>
            {isEditing ? 'Modifier l\'événement' : 'Détails de l\'événement'}
          </h5>
          <button className={styles.closeBtn} onClick={onClose}>
            <i className="bi bi-x" style={{ fontSize: '24px', color: 'white' }}></i>
          </button>
        </div>

        <div className={styles.eventModalBody}>
          {!isEditing ? (
            /* Mode Affichage */
            <>
              <div className={styles.eventDetailSection}>
                <h3 className={styles.eventDetailTitle}>{event.title}</h3>
                <div className={`${styles.eventTypeBadge} ${styles[`type-${event.extendedProps?.type}`]}`}>
                  <i className={`bi ${getEventTypeIcon(event.extendedProps?.type)} me-2`}></i>
                  {getEventTypeLabel(event.extendedProps?.type)}
                </div>
              </div>

              <div className="row g-3">
                {/* Date et Heure - Carte principale */}
                <div className="col-12">
                  <div className={`${styles.detailItem} ${styles.orange}`}>
                    <div className={styles.detailLabel}>
                      <i className="bi bi-calendar-check"></i>
                      Date et Heure
                    </div>
                    <div className={styles.dateTimeCard}>
                      {event.allDay ? (
                        <>
                          <div className={styles.detailValue}>
                            <span className={styles.dateEmoji}>📅</span>
                            {formatDate(event.start)}
                          </div>
                          {event.end && dayjs(event.end).tz(TIMEZONE).format('YYYY-MM-DD') !== dayjs(event.start).tz(TIMEZONE).format('YYYY-MM-DD') && (
                            <div className={styles.detailValue}>
                              <span className={styles.dateEmoji}>→</span>
                              {formatDate(event.end)}
                            </div>
                          )}
                          <div className={styles.allDayBadge}>
                            <i className="bi bi-calendar-day me-1"></i>Toute la journée
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Vérifier si l'événement s'étend sur plusieurs jours */}
                          {event.start && event.end && dayjs(event.start).tz(TIMEZONE).format('YYYY-MM-DD') === dayjs(event.end).tz(TIMEZONE).format('YYYY-MM-DD') ? (
                            // Même jour
                            <>
                              <div className={styles.detailValue}>
                                <span className={styles.dateEmoji}>📅</span>
                                {formatDate(event.start)}
                              </div>
                              <div className={styles.detailValue} style={{ marginTop: '8px' }}>
                                <span className={styles.dateEmoji}>⏰</span>
                                De {formatTime(event.start)} à {formatTime(event.end)}
                              </div>
                            </>
                          ) : (
                            // Plusieurs jours
                            <>
                              <div className={styles.detailValue}>
                                <span className={styles.dateEmoji}>📅</span>
                                Début : {formatDate(event.start)} à {formatTime(event.start)}
                              </div>
                              <div className={styles.detailValue} style={{ marginTop: '8px' }}>
                                <span className={styles.dateEmoji}>📅</span>
                                Fin : {formatDate(event.end)} à {formatTime(event.end)}
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                {event.extendedProps?.description && (
                  <div className="col-12">
                    <div className={`${styles.detailItem} ${styles.orange}`}>
                      <div className={styles.detailLabel}>
                        <i className="bi bi-text-paragraph"></i>
                        Description
                      </div>
                      <div className={styles.detailValue} style={{ textAlign: 'justify' }}>
                        {event.extendedProps.description}
                      </div>
                    </div>
                  </div>
                )}

                {/* Lieu */}
                {event.extendedProps?.location && (
                  <div className="col-12">
                    <div className={`${styles.detailItem} ${styles.orange}`}>
                      <div className={styles.detailLabel}>
                        <i className="bi bi-geo-alt"></i>
                        Lieu
                      </div>
                      <div className={styles.detailValue}>
                        <i className="bi bi-pin-map me-2" style={{ color: '#F36F35' }}></i>
                        {event.extendedProps.location}
                      </div>
                    </div>
                  </div>
                )}

                {/* Responsables (Évaluateurs, Formateurs, Organisateurs, etc.) - Visible pour tous */}
                {event.extendedProps?.responsables && event.extendedProps.responsables.length > 0 && (
                  <div className="col-12">
                    <div className={`${styles.detailItem} ${styles.orange}`}>
                      <div className={styles.detailLabel}>
                        <i className={`bi ${getResponsableIcon(event.extendedProps.type)}`}></i>
                        {getResponsableLabel(event.extendedProps.type)}
                      </div>
                      <div className={styles.responsablesList}>
                        {event.extendedProps.responsables.map((resp, index) => (
                          <div key={index} className={styles.responsableItem}>
                            <i className="bi bi-person-fill me-2" style={{ color: '#F36F35' }}></i>
                            <span className={styles.responsableName}>{resp.name}</span>
                            {resp.role === 'evaluator' && <span className={styles.responsableRole}>🎯 Évaluateur</span>}
                            {resp.role === 'staff' && <span className={styles.responsableRole}>👨‍💼 Staff</span>}
                            {resp.role === 'admin' && <span className={styles.responsableRole}>👑 Admin</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Créé par - Visible uniquement pour admin/staff */}
                {canEdit && event.extendedProps?.createdBy && (
                  <div className="col-12">
                    <div className={`${styles.detailItem} ${styles.orange}`}>
                      <div className={styles.detailLabel}>
                        <i className="bi bi-person-circle"></i>
                        Créé par
                      </div>
                      <div className={styles.detailValue}>
                        <i className="bi bi-person-badge me-2" style={{ color: '#F36F35' }}></i>
                        {event.extendedProps.createdBy.name || 'Administrateur'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {canEdit && (
                <div className="d-flex gap-3 mt-4">
                  <button
                    className={styles.editBtn}
                    onClick={() => setIsEditing(true)}
                  >
                    <i className="bi bi-pencil"></i>
                    Modifier
                  </button>
                  <button
                    className={styles.deleteBtn}
                    onClick={handleDeleteClick}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Suppression...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-trash"></i>
                        Supprimer
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Mode Édition */
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
                  <label className={styles.formLabel}>Date de début *</label>
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
                  <label className={styles.formLabel}>Date de fin *</label>
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
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle"></i>
                      Enregistrer les modifications
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setIsEditing(false)}
                  disabled={isSubmitting}
                >
                  <i className="bi bi-x-circle"></i>
                  Annuler
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

