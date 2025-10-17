import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { getAvatarUrl } from "../utils/imageHelper";
import styles from "../styles/navbar.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const STATIC_ASSETS_BASE_URL = API.replace("/api", "");

const Navbar = ({
  user,
  daysRemaining,
  notifications,
  notificationsCount,
  showNotificationModal,
  currentNotification,
  handleOpenNotificationModal,
  handleCloseNotificationModal,
  handleLogout,
  showSidebar,
  setShowSidebar,
  isDark,
  toggleTheme,
}) => {
  const router = useRouter();

  return (
    <>
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark thm-bg fixed-top shadow-lg">
        <div className="container-fluid">
          {/* <Link
            href="/dashboard"
            className="d-flex align-items-center fw-bold thm-link"
          >
            <i className="bi bi-code-slash fs-4 me-2"></i>
            CodeLoccol {user.role.charAt(0).toUpperCase() + user.role.slice(1)}{" "}
            Intra
          </Link> */}
          <Link
            href="/dashboard"
            className="d-flex align-items-center fw-bold thm-link"
          >
            {isDark ? (
              <>
                <img
                  src="/codeLoccoll.png"
                  alt="CodeLoccol"
                  className="img-fluid me-2"
                  style={{ 
                    height: "40px",
                    width: "180px",
                    objectFit: "cover",
                    objectPosition: "center"
                  }}
                />
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Intra
              </>
            ) : (
              <>
                <i className="bi bi-code-slash fs-4 me-2"></i>
                CodeLoccol{" "}
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Intra
              </>
            )}
          </Link>

          {/* Bouton Hamburger pour mobile */}
          <button
            className="btn btn-outline-light d-md-none"
            onClick={() => setShowSidebar(!showSidebar)}
            aria-controls="sidebarMenu"
            aria-expanded={showSidebar}
          >
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
              <span className="me-3 fw-bold p-2 rounded-pill thm-bg-light thm-shadow-s">
                <i className="bi bi-hourglass-split me-1"></i> Jours restants:{" "}
                {daysRemaining}
              </span>
            </div>
            {/* Notifications à droite */}
            <ul className="navbar-nav d-flex align-items-center justify-content-center">
              <li className="nav-item dropdown pt-2">
                <a
                  className="thm-nav-link active dropdown-toggle position-relative"
                  href="#"
                  id="navbarNotifications"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i className="bi bi-bell-fill fs-5"></i>
                  {notificationsCount > 0 && (
                    <span
                      className="badge bg-danger rounded-circle position-absolute top-0 start-100 translate-middle animate-ping-once"
                      style={{ fontSize: "0.7em" }}
                    >
                      {notificationsCount}
                    </span>
                  )}
                </a>
                <ul
                  className="dropdown-menu dropdown-menu-end shadow-lg border-0 thm-bg-light"
                  aria-labelledby="navbarNotifications"
                  style={{ maxHeight: "300px", overflowY: "auto" }}
                >
                  {notifications.length > 0 && (
                    <li>
                      <button
                        className="dropdown-item text-primary"
                        onClick={async () => {
                          try {
                            await fetch(`${API}/notifications/all/read`, { method: 'PUT', credentials: 'include' });
                            // Mise à jour locale
                            if (typeof setNotifications === 'function') {
                              setNotifications(
                                notifications.map((notif) => ({ ...notif, read: true }))
                              );
                            }
                            if (typeof setNotificationsCount === 'function') {
                              setNotificationsCount(0);
                            }
                          } catch (e) {
                            alert("Erreur lors de la lecture des notifications");
                          }
                        }}
                      >
                        <i className="bi bi-envelope-open"></i> Marquer toutes comme lues
                      </button>
                      <hr className="dropdown-divider" />
                    </li>
                  )}
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
                          <span className="me-2">
                            <i
                              className={`bi bi-${
                                notification.read ? "bell" : "bell-fill"
                              }`}
                            ></i>
                          </span>
                          <div>
                            <p
                              className={`mb-0 ${
                                notification.read ? "" : "fw-bold"
                              }`}
                            >
                              {notification.message.substring(0, 50)}
                              {notification.message.length > 50 ? "..." : ""}
                            </p>
                            <small>
                              {new Date(
                                notification.createdAt
                              ).toLocaleString()}
                            </small>
                          </div>
                        </a>
                      </li>
                    ))
                  ) : (
                    <li>
                      <span className="dropdown-item">
                        Aucune notification.
                      </span>
                    </li>
                  )}
                </ul>
              </li>

              {/* Thème */}
              <li className="nav-item ms-2 pt-2 d-flex align-items-center justify-content-center">
                <button
                  className="btn thm-shadow-s thm-bg-light rounded-circle p-2 d-flex align-items-center justify-content-center "
                  onClick={toggleTheme}
                >
                  <i
                    className={`bi ${
                      isDark ? "bi-sun-fill" : "bi-moon-fill"
                    } mx-1`}
                  ></i>
                </button>
              </li>

              {/* Profil */}
              <li className="nav-item dropdown ms-2">
                <a
                  className="thm-nav-link active dropdown-toggle d-flex align-items-center"
                  href="#"
                  id="navbarDropdown"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <img
                    src={getAvatarUrl(user.profilePicture)}
                    alt="Avatar"
                    className="rounded-circle me-2 border border-light"
                    style={{
                      width: "30px",
                      height: "30px",
                      objectFit: "cover",
                    }}
                  />
                  {user.name}
                </a>
                <ul
                  className="dropdown-menu dropdown-menu-end shadow-lg border-0 thm-bg-light"
                  aria-labelledby="navbarDropdown"
                >
                  <li>
                    <Link
                      href="/profile"
                      className="dropdown-item d-flex align-items-center"
                    >
                      <i className="bi bi-person-circle me-2"></i>{" "}
                      <span>Profil</span>
                    </Link>
                  </li>
                  <li>
                    <hr className="dropdown-divider" />
                  </li>
                  <li>
                    <button
                      className="dropdown-item d-flex align-items-center text-danger"
                      onClick={handleLogout}
                    >
                      <i className="bi bi-box-arrow-right me-2"></i>{" "}
                      Déconnexion
                    </button>
                  </li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Modal pour afficher le détail de la notification */}
      {showNotificationModal && currentNotification && (
        <div className={styles.modalOverlay} onClick={handleCloseNotificationModal}>
          <div className={styles.modalDialog} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h5 className={styles.modalTitle}>
                <i className="bi bi-bell-fill"></i>
                Détail de la Notification
                <span className={styles.typeBadge}>
                  {currentNotification.type.replace(/_/g, " ")}
                </span>
              </h5>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={handleCloseNotificationModal}
              >
                <i className="bi bi-x"></i>
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.infoRow}>
                <i className={`bi bi-chat-left-text ${styles.infoIcon}`}></i>
                <div className={styles.infoContent}>
                  <div className={styles.infoLabel}>Message</div>
                  <div className={styles.infoValue}>{currentNotification.message}</div>
                </div>
              </div>

              <div className={styles.infoRow}>
                <i className={`bi bi-calendar-event ${styles.infoIcon}`}></i>
                <div className={styles.infoContent}>
                  <div className={styles.infoLabel}>Date</div>
                  <div className={styles.infoValue}>
                    {new Date(currentNotification.createdAt).toLocaleString('fr-FR', {
                      dateStyle: 'full',
                      timeStyle: 'short'
                    })}
                  </div>
                </div>
              </div>

              {currentNotification.link && (
                <div className={styles.infoRow}>
                  <i className={`bi bi-link-45deg ${styles.infoIcon}`}></i>
                  <div className={styles.infoContent}>
                    <div className={styles.infoLabel}>Lien</div>
                    <div className={styles.infoValue}>
                      <a
                        href={currentNotification.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.link}
                      >
                        {currentNotification.link}
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnClose}
                onClick={handleCloseNotificationModal}
              >
                <i className="bi bi-check-circle"></i>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;

