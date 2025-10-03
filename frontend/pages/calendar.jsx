"use client";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import frLocale from "@fullcalendar/core/locales/fr";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getAuthToken } from "../utils/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export default function Calendar() {
  const [events, setEvents] = useState([]);
  const token = getAuthToken();
  const router = useRouter();

  const handleDateSelect = (selectInfo) => {
    selectInfo.view.calendar.changeView("dayGridDay", selectInfo.start);
  };

  const organizedData = (data) => {
    //dans cahque activitie ya tous les info il faut jsut choisir celui qui sera renvoyer au calendar afficahge pernalisable dans la function jsx renderEventContent en bas
    return data.map((activitie) => ({
      title: activitie.description,
      start: activitie.createdAt,
      action: activitie.action,
    }));
  };

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchUserActivities = async () => {
      try {
        const res = await fetch(`${API}/activities/my-activities`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch user profile.");
        const { data } = await res.json();

        setEvents(organizedData(data));
      } catch (e) {
        console.error("Error fetching user profile:", e);
      }
    };

    fetchUserActivities();
  }, [token, router]);

  const renderEventContent = (eventInfo) => {
    //les class peuvent etre changer dynamique en function de l'action dans evenInfo.event.action
    return (
      <div className="fc-content">
        <span className="fc-title">{eventInfo.event.title}</span>
      </div>
    );
  };

  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      initialView="dayGridMonth"
      weekends={true}
      navLinks
      buttonText={{
        today: "Aujourd'hui",
        month: "Mois",
        week: "Semaine",
        day: "Jour",
      }}
      headerToolbar={{
        left: "prev today next",
        center: "title",
        right: "dayGridDay dayGridWeek dayGridMonth",
      }}
      locale={frLocale}
      selectable
      selectMirror
      select={handleDateSelect}
      dayMaxEvents
      events={events}
      eventContent={renderEventContent}
    />
  );
}
