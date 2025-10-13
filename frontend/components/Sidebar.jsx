import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";

const Sidebar = ({ user, showSidebar, setShowSidebar }) => {
  const router = useRouter();

  console.log('===================user===========================');
  console.log(user);
  console.log('=================================================');
  

  return (
    <>
      {/* Sidebar */}
      <nav
        id="sidebarMenu"
        className={`col-md-3 col-lg-2 sidebar-custom shadow-lg position-fixed d-flex flex-column ${
          showSidebar ? "sidebar-open" : ""
        }`}
      >
        <div className="pt-4 px-2 px-md-2 flex-grow-1 overflow-auto">
          <ul className="nav flex-column gap-1 ">
            <li className="nav-item">
              <Link
                href="/dashboard"
                className={`sidebar-link d-flex align-items-center text-decoration-none rounded py-2 px-2 px-md-3 ${
                  router.pathname === "/dashboard" ? "active" : ""
                }`}
                aria-current="page"
                onClick={() => setShowSidebar(false)}
              >
                <i className="bi bi-house-door-fill me-2 sidebar-icon"></i>
                <span className="sidebar-text">Tableau de bord</span>
              </Link>
            </li>
            
            <li className="nav-item">
              <Link
                href="/projects"
                className={`sidebar-link d-flex align-items-center text-decoration-none rounded py-2 px-2 px-md-3 ${
                  router.pathname === "/projects" ? "active" : ""
                }`}
                onClick={() => setShowSidebar(false)}
              >
                <i className="bi bi-folder-fill me-2 sidebar-icon"></i>
                <span className="sidebar-text">Mes Projets</span>
              </Link>
            </li>
            
            <li className="nav-item">
              <Link
                href="/hackathons"
                className={`sidebar-link d-flex align-items-center text-decoration-none rounded py-2 px-2 px-md-3 ${
                  router.pathname === "/hackathons" ? "active" : ""
                }`}
                onClick={() => setShowSidebar(false)}
              >
                <i className="bi bi-trophy-fill me-2 sidebar-icon"></i>
                <span className="sidebar-text">Hackathons</span>
              </Link>
            </li>
            
            <li className="nav-item">
              <Link
                href="/profile"
                className={`sidebar-link d-flex align-items-center text-decoration-none rounded py-2 px-2 px-md-3 ${
                  router.pathname === "/profile" ? "active" : ""
                }`}
                onClick={() => setShowSidebar(false)}
              >
                <i className="bi bi-person-circle me-2 sidebar-icon"></i>
                <span className="sidebar-text">Mon Profil</span>
              </Link>
            </li>
            
            <li className="nav-item">
              <Link
                href="/evaluations"
                className={`sidebar-link d-flex align-items-center text-decoration-none rounded py-2 px-2 px-md-3 ${
                  router.pathname === "/evaluations" ? "active" : ""
                }`}
                onClick={() => setShowSidebar(false)}
              >
                <i className="bi bi-check2-square me-2 sidebar-icon"></i>
                <span className="sidebar-text">Évaluations</span>
              </Link>
            </li>
            
            <li className="nav-item">
              <Link
                href="/calendar"
                className={`sidebar-link d-flex align-items-center text-decoration-none rounded py-2 px-2 px-md-3 ${
                  router.pathname === "/calendar" ? "active" : ""
                }`}
                onClick={() => setShowSidebar(false)}
              >
                <i className="bi bi-calendar-event me-2 sidebar-icon"></i>
                <span className="sidebar-text">Calendrier</span>
              </Link>
            </li>
            
            {user && (user.role === "staff" || user.role === "admin") && (
              <li className="nav-item">
                <Link
                  href="/admin/users"
                  className={`sidebar-link d-flex align-items-center text-decoration-none rounded py-2 px-2 px-md-3 ${
                    router.pathname === "/admin/users" ? "active" : ""
                  }`}
                  onClick={() => setShowSidebar(false)}
                >
                  <i className="bi bi-people-fill me-2 sidebar-icon"></i>
                  <span className="sidebar-text text-truncate">Utilisateurs</span>
                </Link>
              </li>
            )}
            {/* <li className="mt-5 mx-auto">
              <button
                className="btn thm-shadow-s thm-bg-light"
                onClick={toggleTheme}
              >
                Changer le Thème
              </button>
            </li> */}
          </ul>
        </div>
      </nav>

      {/* Overlay pour fermer la sidebar sur mobile */}
      {showSidebar && (
        <div
          className="sidebar-overlay d-md-none"
          onClick={() => setShowSidebar(false)}
        ></div>
      )}
    </>
  );
};

export default Sidebar;
