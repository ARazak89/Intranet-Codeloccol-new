"use client";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import frLocale from "@fullcalendar/core/locales/fr";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getAuthToken } from "../utils/auth";
import styles from "../styles/calendar.module.css";
import CreateEventModal from "../components/CreateEventModal";
import EventDetailsModal from "../components/EventDetailsModal";
import Loader from "../components/Loader";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export default function Calendar() {
  const [events, setEvents] = useState([]);
  const [user, setUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const token = getAuthToken();
  const router = useRouter();

  const handleDateSelect = (selectInfo) => {
    selectInfo.view.calendar.changeView("dayGridDay", selectInfo.start);
  };

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }

    // Détecter si on est en mode mobile
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Récupérer les informations de l'utilisateur
    const fetchUser = async () => {
      try {
        const res = await fetch(`${API}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch (e) {
        console.error("Error fetching user:", e);
      }
    };

    // Récupérer les événements
    const fetchEvents = async () => {
      try {
        const res = await fetch(`${API}/events`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const formattedEvents = data.map((event) => ({
            id: event._id,
            title: event.title,
            start: event.startDate,
            end: event.endDate,
            allDay: event.isAllDay,
            backgroundColor: event.color || getEventColor(event.type),
            borderColor: event.color || getEventColor(event.type),
            extendedProps: {
              description: event.description,
              type: event.type,
              location: event.location,
              status: event.status,
              createdBy: event.createdBy,
              responsables: event.responsables || [],
            },
            className: `event-${event.type}`,
          }));
          setEvents(formattedEvents);
        }
      } catch (e) {
        console.error("Error fetching events:", e);
      }
    };

    fetchUser();
    fetchEvents();

    return () => window.removeEventListener('resize', handleResize);
  }, [token, router]);

  const getEventColor = (type) => {
    const colors = {
      hackathon: '#179349',
      evaluation: '#F36F35',
      formation: '#0d6efd',
      reunion: '#6f42c1',
      deadline: '#dc3545',
      autre: '#6c757d',
    };
    return colors[type] || colors.autre;
  };

  const handleCreateEvent = async (eventData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(eventData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Échec de la création de l\'événement');
      }

      const data = await res.json();
      setSuccess('Événement créé avec succès ! Tous les utilisateurs ont été notifiés.');
      
      // Ajouter le nouvel événement à la liste
      const newEvent = {
        id: data.event._id,
        title: data.event.title,
        start: data.event.startDate,
        end: data.event.endDate,
        allDay: data.event.isAllDay,
        backgroundColor: data.event.color || getEventColor(data.event.type),
        borderColor: data.event.color || getEventColor(data.event.type),
        extendedProps: {
          description: data.event.description,
          type: data.event.type,
          location: data.event.location,
          status: data.event.status,
          createdBy: data.event.createdBy,
          responsables: data.event.responsables || [],
        },
        className: `event-${data.event.type}`,
      };
      
      setEvents([...events, newEvent]);
      setShowCreateModal(false);

      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      console.error('Error creating event:', e);
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditEvent = async (eventId, eventData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API}/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(eventData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Échec de la modification de l\'événement');
      }

      const data = await res.json();
      setSuccess('Événement modifié avec succès !');
      
      // Mettre à jour l'événement dans la liste
      setEvents(events.map(ev => {
        if (ev.id === eventId) {
          return {
            ...ev,
            title: data.event.title,
            start: data.event.startDate,
            end: data.event.endDate,
            allDay: data.event.isAllDay,
            backgroundColor: data.event.color || getEventColor(data.event.type),
            borderColor: data.event.color || getEventColor(data.event.type),
            extendedProps: {
              description: data.event.description,
              type: data.event.type,
              location: data.event.location,
              status: data.event.status,
              createdBy: data.event.createdBy,
              responsables: data.event.responsables || [],
            },
            className: `event-${data.event.type}`,
          };
        }
        return ev;
      }));

      setShowDetailsModal(false);
      setSelectedEvent(null);

      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      console.error('Error editing event:', e);
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`${API}/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Échec de la suppression de l\'événement');
      }

      setSuccess('Événement supprimé avec succès !');
      
      // Retirer l'événement de la liste
      setEvents(events.filter(ev => ev.id !== eventId));
      
      setShowDetailsModal(false);
      setSelectedEvent(null);

      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      console.error('Error deleting event:', e);
      setError(e.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEventClick = (clickInfo) => {
    setSelectedEvent(clickInfo.event);
    setShowDetailsModal(true);
  };

  const renderEventContent = (eventInfo) => {
    return (
      <div className="fc-content p-1">
        <div className="fw-bold" style={{ fontSize: '12px' }}>
          {eventInfo.event.title}
        </div>
        {eventInfo.event.extendedProps.location && (
          <div style={{ fontSize: '11px', opacity: 0.9 }}>
            <i className="bi bi-geo-alt me-1"></i>
            {eventInfo.event.extendedProps.location}
          </div>
        )}
      </div>
    );
  };

  const canCreateEvents = user && (user.role === 'admin' || user.role === 'staff');

  if (!user) {
    return <Loader message="Chargement du calendrier..." />;
  }

  return (
    <div className="container-fluid mt-4 pt-5 px-4">
      {success && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <i className="bi bi-check-circle me-2"></i>
          {success}
          <button type="button" className="btn-close" onClick={() => setSuccess(null)}></button>
        </div>
      )}
      
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      <div className={styles.calendarContainer}>
        <div className={styles.calendarHeader}>
          <h1 className={styles.calendarTitle}>
            <i className="bi bi-calendar3"></i>
            Calendrier des Événements
          </h1>
          
          {canCreateEvents && (
            <button className={styles.addEventBtn} onClick={() => setShowCreateModal(true)}>
              <i className="bi bi-plus-circle"></i>
              Ajouter un événement
            </button>
          )}
        </div>

        <div className={styles.customCalendar}>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={isMobile ? "timeGridDay" : "dayGridMonth"}
            weekends={true}
            navLinks
            buttonText={{
              today: "Aujourd'hui",
              month: "Mois",
              week: "Semaine",
              day: "Jour",
            }}
            headerToolbar={
              isMobile
                ? {
                    left: "prev,next",
                    center: "title",
                    right: "today",
                  }
                : {
                    left: "prev today next",
                    center: "title",
                    right: "dayGridMonth,timeGridWeek,timeGridDay",
                  }
            }
            locale={frLocale}
            selectable={canCreateEvents}
            selectMirror
            select={handleDateSelect}
            dayMaxEvents={3}
            events={events}
            eventContent={renderEventContent}
            height="auto"
            eventClick={handleEventClick}
          />
        </div>

        {/* Légende des types d'événements */}
        <div className={styles.eventLegend}>
          <div className={styles.legendItem}>
            <div className={styles.legendColor} style={{ background: '#179349' }}></div>
            <span className={styles.legendText}>Hackathon</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendColor} style={{ background: '#F36F35' }}></div>
            <span className={styles.legendText}>Évaluation</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendColor} style={{ background: '#0d6efd' }}></div>
            <span className={styles.legendText}>Formation</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendColor} style={{ background: '#6f42c1' }}></div>
            <span className={styles.legendText}>Réunion</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendColor} style={{ background: '#dc3545' }}></div>
            <span className={styles.legendText}>Deadline</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendColor} style={{ background: '#6c757d' }}></div>
            <span className={styles.legendText}>Autre</span>
          </div>
        </div>
      </div>

      {/* Modal de création d'événement */}
      {showCreateModal && (
        <CreateEventModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateEvent}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Modal de détails/édition d'événement */}
      {showDetailsModal && selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedEvent(null);
          }}
          onEdit={handleEditEvent}
          onDelete={handleDeleteEvent}
          canEdit={canCreateEvents}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
