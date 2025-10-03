import React from 'react';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link'; // Importez Link
import Script from 'next/script'; // Importez Script
import { getAuthToken, removeAuthToken } from '../utils/auth'; // Importer la fonction getAuthToken

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
// const STATIC_ASSETS_BASE_URL = process.env.NEXT_PUBLIC_STATIC_ASSETS_BASE_URL || '/static';
const STATIC_ASSETS_BASE_URL = API.replace('/api', '');

const Layout = ({ children }) => {
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
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        });
        // Recharger les notifications après en avoir marqué une comme lue
        if (user && token) {
          const notifRes = await fetch(`${API}/notifications/mine`, { headers: { Authorization: `Bearer ${token}` } });
          if (notifRes.ok) {
            const notifData = await notifRes.json();
            setNotifications(notifData); // Stocker toutes les notifications
            setNotificationsCount(notifData.filter(notif => !notif.read).length); // Mettre à jour le compteur avec les non lues
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
    if (!token && typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
      } else {
        // Si aucun token, définir l'état comme chargé et rediriger
        setLoading(false);
        if (router.pathname !== '/login') { // Ne rediriger que si l'utilisateur n'est pas déjà sur la page de connexion
          router.push('/login');
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
            localStorage.removeItem('token');
            router.push('/login');
            return;
          }
          const data = await res.json();
          setUser(data);
          setDaysRemaining(data.daysRemaining || 0);
          setLoading(false); // Fin du chargement après la récupération des données
        } catch (e) {
          console.error('Error fetching user data:', e);
          localStorage.removeItem('token'); // S'assurer que le token invalide est supprimé
          router.push('/login');
          setLoading(false);
        }
      };

      const fetchNotifications = async () => { // Renommé et adapté pour récupérer toutes les notifications
        try {
          const res = await fetch(`${API}/notifications/mine`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error('Failed to fetch notifications');
          const notifData = await res.json();
          setNotifications(notifData); // Stocker toutes les notifications
          setNotificationsCount(notifData.filter(notif => !notif.read).length); // Mettre à jour le compteur avec les non lues
        } catch (e) {
          console.error('Error fetching notifications:', e);
        }
      };

      const handleToggleNotification = async (notificationId) => {
        setExpandedNotifications(prev => ({
          ...prev,
          [notificationId]: !prev[notificationId]
        }));
        const notificationToMark = notifications.find(n => n._id === notificationId);
        if (notificationToMark && !notificationToMark.read) {
          await handleMarkNotificationAsRead(notificationId);
        }
      };

      const handleMarkNotificationAsRead = async (notificationId) => {
        try {
          await fetch(`${API}/notifications/${notificationId}/read`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` },
          });
          setNotifications(prevNotifs =>
            prevNotifs.map(notif =>
              notif._id === notificationId ? { ...notif, read: true } : notif
            ) // Ne plus filtrer ici, juste marquer comme lue
          );
          setNotificationsCount(prevCount => Math.max(0, prevCount - 1));
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
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
        <p className="ms-2">Chargement de l'application...</p>
      </div>
    );
  }

  if (!user) {
    // Si pas d'utilisateur après chargement (par ex. redirection vers login), ne rien afficher
    return null;
  }

  return (
    <div className="d-flex flex-column min-vh-100">
      <Head>
        <title>CodeLoccol Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" />
      </Head>

      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark fixed-top shadow-lg">
        <div className="container-fluid">
          <Link href="/dashboard" className="navbar-brand d-flex align-items-center fw-bold">
            <i className="bi bi-code-slash fs-4 me-2"></i>
            CodeLoccol
          </Link>
          {/* Bouton Hamburger pour mobile */}
          <button className="btn btn-outline-light d-md-none" onClick={() => setShowSidebar(!showSidebar)} aria-controls="sidebarMenu" aria-expanded={showSidebar}>
            <i className="bi bi-list fs-4"></i>
          </button>
          {/* Ancien bouton navbar-toggler de Bootstrap - Supprimé ou commenté si nous gérons la sidebar manuellement */}
          {/* <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button> */}
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              {/* Future Navbar items */}
            </ul>
            {/* Chrono au centre (pour l'exemple, simple texte) */}
            <div className="d-flex justify-content-center flex-grow-1">
              <span className="navbar-text text-light me-3 fw-bold p-2 rounded-pill bg-secondary bg-opacity-50">
                <i className="bi bi-hourglass-split me-1"></i> Jours restants: {daysRemaining}
              </span>
            </div>
            {/* Notifications à droite */}
            <ul className="navbar-nav">
              <li className="nav-item dropdown">
                <a className="nav-link dropdown-toggle position-relative" href="#" id="navbarNotifications" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                  <i className="bi bi-bell-fill fs-5"></i>
                  {notificationsCount > 0 && (
                    <span className="badge bg-danger rounded-circle position-absolute top-0 start-100 translate-middle animate-ping-once" style={{ fontSize: '0.7em' }}>
                      {notificationsCount}
                    </span>
                  )}
                </a>
                <ul className="dropdown-menu dropdown-menu-end shadow-lg border-0" aria-labelledby="navbarNotifications" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <li key={notification._id}>
                        <a
                          className="dropdown-item d-flex align-items-center"
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handleOpenNotificationModal(notification);
                          }}
                        >
                          <span className="me-2"><i className={`bi bi-${notification.read ? 'bell' : 'bell-fill'}`}></i></span>
                          <div>
                            <p className={`mb-0 ${notification.read ? 'text-muted' : 'fw-bold'}`}>{notification.message.substring(0, 50)}{notification.message.length > 50 ? '...' : ''}</p>
                            <small className="text-muted">{new Date(notification.createdAt).toLocaleString()}</small>
                          </div>
                        </a>
                      </li>
                    ))
                  ) : (
                    <li>
                      <span className="dropdown-item text-muted">Aucune notification.</span>
                    </li>
                  )}
                </ul>
              </li>
              <li className="nav-item dropdown ms-2">
                <a className="nav-link dropdown-toggle d-flex align-items-center" href="#" id="navbarDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                  <img
                    src={user.profilePicture ? `${STATIC_ASSETS_BASE_URL}${user.profilePicture}` : '/default-avatar.jpg'}
                    alt="Avatar"
                    className="rounded-circle me-2 border border-light"
                    style={{ width: '30px', height: '30px', objectFit: 'cover' }}
                  />
                  {user.name}
                </a>
                <ul className="dropdown-menu dropdown-menu-end shadow-lg border-0" aria-labelledby="navbarDropdown">
                  <li><Link href="/profile" className="dropdown-item d-flex align-items-center"><i className="bi bi-person-circle me-2"></i> Profil</Link></li>
                  <li><hr className="dropdown-divider" /></li>
                  <li><button className="dropdown-item d-flex align-items-center text-danger" onClick={handleLogout}><i className="bi bi-box-arrow-right me-2"></i> Déconnexion</button></li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <div className="d-flex flex-grow-1 h-100 overflow-hidden pt-5">
        {/* Sidebar */}
        <nav id="sidebarMenu" className={`col-md-3 col-lg-2 bg-light sidebar position-fixed top-0 bottom-0 h-100 overflow-auto pt-5 shadow-sm ${showSidebar ? 'sidebar-open' : ''}`} >
          <div className="position-sticky pt-3">
            <ul className="nav flex-column">
              <li className="nav-item">
                <Link href="/dashboard" className={`nav-link fs-5 ${
                  router.pathname === '/dashboard' ? 'active text-primary fw-bold bg-light-blue rounded' : ''
                  }`} aria-current="page" onClick={() => setShowSidebar(false)}>
                  <i className="bi bi-house-door-fill me-2"></i>
                  Tableau de bord
                </Link>
              </li>
              <li className="nav-item">
                <Link href="/projects" className={`nav-link fs-5 ${
                  router.pathname === '/projects' ? 'active text-primary fw-bold bg-light-blue rounded' : ''
                }`} onClick={() => setShowSidebar(false)}>
                  <i className="bi bi-folder-fill me-2"></i>
                  Mes Projets
                </Link>
              </li>
              <li className="nav-item">
                <Link href="/hackathons" className={`nav-link fs-5 ${
                  router.pathname === '/hackathons' ? 'active text-primary fw-bold bg-light-blue rounded' : ''
                }`} onClick={() => setShowSidebar(false)}>
                  <i className="bi bi-cup-fill me-2"></i>
                  Hackathons
                </Link>
              </li>
              {/* Ajout des liens pour d'autres pages comme la gestion de profil, etc. */}
              <li className="nav-item">
                <Link href="/profile" className={`nav-link fs-5 ${
                  router.pathname === '/profile' ? 'active text-primary fw-bold bg-light-blue rounded' : ''
                }`} onClick={() => setShowSidebar(false)}>
                  <i className="bi bi-person-circle me-2"></i>
                  Mon Profil
                </Link>
              </li>
              <li className="nav-item">
                <Link href="/evaluations" className={`nav-link fs-5 ${
                  router.pathname === '/evaluations' ? 'active text-primary fw-bold bg-light-blue rounded' : ''
                }`} onClick={() => setShowSidebar(false)}>
                  <i className="bi bi-check2-square me-2"></i>
                  Évaluations
                </Link>
              </li>
              {user && (user.role === 'staff' || user.role === 'admin') && (
                <li className="nav-item">
                  <Link href="/admin/users" className={`nav-link fs-5 ${
                    router.pathname === '/admin/users' ? 'active text-primary fw-bold bg-light-blue rounded' : ''
                  }`} onClick={() => setShowSidebar(false)}>
                    <i className="bi bi-people-fill me-2"></i>
                    Gestion des Utilisateurs
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </nav>

        {/* Main Content */}
        <main className="col-md-9 ms-sm-auto col-lg-10 px-md-4 h-100 overflow-auto pt-5">
          <div className="container-fluid">
            {children}
          </div>
        </main>
      </div>

      {showSidebar && <div className="sidebar-overlay d-md-none" onClick={() => setShowSidebar(false)}></div>}

      <footer className="footer mt-auto py-3 bg-dark text-white text-center shadow-lg">
        <div className="container">
          <span className="text-muted">Copyright &copy; CodeLoccol 2025</span>
        </div>
      </footer>

      {/* Script Bootstrap JS pour les fonctionnalités interactives (navbar toggler, dropdowns) */}
      <Script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossOrigin="anonymous"></Script>

      {/* Modal pour afficher le détail de la notification */}
      {showNotificationModal && currentNotification && (
        <div className="modal" tabIndex="-1" style={{ display: 'block' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-gradient bg-info text-white">
                <h5 className="modal-title"><i className="bi bi-bell me-2"></i> Détail de la Notification</h5>
                <button type="button" className="btn-close" onClick={handleCloseNotificationModal}></button>
              </div>
              <div className="modal-body">
                <p><strong>Type:</strong> {currentNotification.type.replace(/_/g, ' ')}</p>
                <p><strong>Message:</strong> {currentNotification.message}</p>
                <p><strong>Date:</strong> {new Date(currentNotification.createdAt).toLocaleString()}</p>
                {currentNotification.link && (
                  <p><strong>Lien:</strong> <a href={currentNotification.link} target="_blank" rel="noopener noreferrer" className="text-primary text-decoration-none">{currentNotification.link}</a></p>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseNotificationModal}>Fermer</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showNotificationModal && <div className="modal-backdrop fade show"></div>}
    </div>
  );
};

export default Layout;
