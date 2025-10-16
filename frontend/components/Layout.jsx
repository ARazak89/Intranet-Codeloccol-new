import React from "react";
import Head from "next/head";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link"; // Importez Link
import { getAuthToken, removeAuthToken } from "../utils/auth"; // Importer la fonction getAuthToken

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import BootstrapClient from "../utils/BoostrapClient";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Loader from "./Loader";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
// const STATIC_ASSETS_BASE_URL = process.env.NEXT_PUBLIC_STATIC_ASSETS_BASE_URL || '/static';
const STATIC_ASSETS_BASE_URL = API.replace("/api", "");

const Layout = ({ children, isDark, toggleTheme, boxRef }) => {
  const [user, setUser] = useState(null);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [notifications, setNotifications] = useState([]); // Déplacé de Dashboard
  const [expandedNotifications, setExpandedNotifications] = useState({}); // Déplacé de Dashboard
  const [notificationsCount, setNotificationsCount] = useState(0);
  const [showNotificationModal, setShowNotificationModal] = useState(false); // État pour afficher/masquer le modal de notification
  const [currentNotification, setCurrentNotification] = useState(null); // Notification actuellement affichée dans le modal
  const router = useRouter();
  const [token, setToken] = useState(null); // Gérer le token localement
  const [loading, setLoading] = useState(true); // Nouvel état de chargement
  const [showSidebar, setShowSidebar] = useState(false); // État pour afficher/masquer la sidebar sur mobile
  // const [isDark, setIsDark] = useState(false); // Supprimé, maintenant reçu via props

  // Fonction pour changer le thème (supprimée, maintenant reçue via props)
  // const boxRef = useRef(null); // Supprimé, maintenant reçu via props
  // const toggleTheme = () => {
  //   setIsDark(!isDark);
  //   if (boxRef.current) {
  //     boxRef.current.classList.toggle("light");
  //     console.log("theme switched");
  //   }
  // };
  // Fonctions pour la gestion des notifications
  const handleOpenNotificationModal = (notification) => {
    setCurrentNotification(notification);
    setShowNotificationModal(true);
  };

  const handleCloseNotificationModal = async () => {
    // Marquer la notification comme lue sur le backend
    if (currentNotification && token) {
      try {
        await fetch(`${API}/notifications/${currentNotification._id}/read`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        });
        // Recharger les notifications après en avoir marqué une comme lue
        if (user && token) {
          const notifRes = await fetch(`${API}/notifications/mine`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (notifRes.ok) {
            const notifData = await notifRes.json();
            setNotifications(notifData); // Stocker toutes les notifications
            setNotificationsCount(
              notifData.filter((notif) => !notif.read).length
            ); // Mettre à jour le compteur avec les non lues
          }
        }
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    }
    setShowNotificationModal(false);
    setCurrentNotification(null);
  };

  useEffect(() => {
    // Au premier chargement, essayer de récupérer le token depuis localStorage
    if (!token && typeof window !== "undefined") {
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        setToken(storedToken);
      } else {
        // Si aucun token, définir l'état comme chargé et rediriger
        setLoading(false);
        if (router.pathname !== "/login") {
          // Ne rediriger que si l'utilisateur n'est pas déjà sur la page de connexion
          router.push("/login");
        }
        return;
      }
    }

    if (token) {
      const fetchUserData = async () => {
        try {
          const res = await fetch(`${API}/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) {
            // Si le token est invalide, le supprimer et rediriger
            localStorage.removeItem("token");
            router.push("/login");
            return;
          }
          const data = await res.json();
          setUser(data);
          setDaysRemaining(data.daysRemaining || 0);
          setLoading(false); // Fin du chargement après la récupération des données
        } catch (e) {
          console.error("Error fetching user data:", e);
          localStorage.removeItem("token"); // S'assurer que le token invalide est supprimé
          router.push("/login");
          setLoading(false);
        }
      };

      const fetchNotifications = async () => {
        // Renommé et adapté pour récupérer toutes les notifications
        try {
          const res = await fetch(`${API}/notifications/mine`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error("Failed to fetch notifications");
          const notifData = await res.json();
          setNotifications(notifData); // Stocker toutes les notifications
          setNotificationsCount(
            notifData.filter((notif) => !notif.read).length
          ); // Mettre à jour le compteur avec les non lues
        } catch (e) {
          console.error("Error fetching notifications:", e);
        }
      };

      const handleToggleNotification = async (notificationId) => {
        setExpandedNotifications((prev) => ({
          ...prev,
          [notificationId]: !prev[notificationId],
        }));
        const notificationToMark = notifications.find(
          (n) => n._id === notificationId
        );
        if (notificationToMark && !notificationToMark.read) {
          await handleMarkNotificationAsRead(notificationId);
        }
      };

      const handleMarkNotificationAsRead = async (notificationId) => {
        try {
          await fetch(`${API}/notifications/${notificationId}/read`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
          });
          setNotifications(
            (prevNotifs) =>
              prevNotifs.map((notif) =>
                notif._id === notificationId ? { ...notif, read: true } : notif
              ) // Ne plus filtrer ici, juste marquer comme lue
          );
          setNotificationsCount((prevCount) => Math.max(0, prevCount - 1));
        } catch (e) {
          console.error("Error marking notification as read:", e);
        }
      };

      fetchUserData();
      fetchNotifications(); // Appeler la nouvelle fonction de récupération des notifications

      const interval = setInterval(() => {
        fetchUserData();
        fetchNotifications(); // Mettre à jour les notifications dans l'intervalle
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [token, router]); // Supprimer notifications des dépendances

  const handleLogout = () => {
    removeAuthToken(); // Utiliser la fonction d'aide
    setToken(null); // Réinitialiser l'état du token
    router.push("/login");
  };

  if (loading) {
    return (
      <div
        ref={boxRef}
        className="d-flex justify-content-center align-items-center vh-100 themed"
      >
        {/* <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
        <p className="ms-2">Chargement de l'application...</p> */}
        <Loader message="Chargement de l'application..." />
      </div>
    );
  }

  if (!user) {
    // Si pas d'utilisateur après chargement (par ex. redirection vers login), ne rien afficher
    return null;
  }

  return (
    <div ref={boxRef} className={`d-flex flex-column min-vh-100 themed ${isDark ? '' : 'light'}`}>
      <Head>
        <title>CodeLoccol Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Navbar */}
      <Navbar
        user={user}
        daysRemaining={daysRemaining}
        notifications={notifications}
        notificationsCount={notificationsCount}
        showNotificationModal={showNotificationModal}
        currentNotification={currentNotification}
        handleOpenNotificationModal={handleOpenNotificationModal}
        handleCloseNotificationModal={handleCloseNotificationModal}
        handleLogout={handleLogout}
        showSidebar={showSidebar}
        setShowSidebar={setShowSidebar}
        isDark={isDark}
        toggleTheme={toggleTheme}
      />

      <div className="d-flex flex-grow-1 h-100 overflow-hidden pt-5">
        {/* Sidebar */}
        <Sidebar
          user={user}
          showSidebar={showSidebar}
          setShowSidebar={setShowSidebar}
        />

        {/* Main Content */}
        <main className="col-md-9 ms-sm-auto col-lg-10 px-md-4 min-vh-100 overflow-auto mt-3">
          {children}
        </main>
      </div>

      <footer className="footer mt-auto py-3 thm-bg text-white text-center shadow-lg">
        <div className="container">
          <p className="">Copyright &copy; CodeLoccol 2025</p>
        </div>
      </footer>

      {/* Script Bootstrap JS pour les fonctionnalités interactives (navbar toggler, dropdowns) */}
      <BootstrapClient />
    </div>
  );
};

export default Layout;
