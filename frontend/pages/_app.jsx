// import 'bootstrap/dist/css/bootstrap.min.css'; // Assurez-vous que Bootstrap est importé
import "bootstrap-icons/font/bootstrap-icons.css"; // Importez les icônes Bootstrap
import "../styles/global.css"; // Importez vos styles globaux ici
import "bootstrap/dist/css/bootstrap.min.css";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Layout from "../components/Layout"; // Importez le nouveau Layout

const publicPaths = ["/", "/login"]; // Définissez les chemins publics ici

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  const boxRef = useRef(null);

  // Fonction pour changer le thème
  const toggleTheme = () => {
    setIsDark(!isDark);
    if (boxRef.current) {
      boxRef.current.classList.toggle("light");
    }
  };

  // Le useEffect pour la redirection est maintenant géré dans le composant Layout
  // Pour les pages publiques, pas de redirection ici.
  useEffect(() => {
    // Note: La logique d'authentification et de redirection est maintenant principalement gérée par le Layout.
    // Ce useEffect ici est pour les cas où une page non authentifiée tente d'accéder à une ressource protégée directement.
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token && !publicPaths.includes(router.pathname)) {
      router.push("/login");
    }
  }, [router.pathname]);

  // Si la page est publique, utiliser un wrapper simple avec support du thème
  if (publicPaths.includes(router.pathname)) {
    return (
      <div ref={boxRef} className="themed thm-bg min-vh-100">
        {/* Bouton de changement de thème pour les pages publiques */}
        <button
          onClick={toggleTheme}
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 1000,
            background: 'rgba(23, 147, 73, 0.9)',
            border: 'none',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '20px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(243, 111, 53, 0.9)';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(23, 147, 73, 0.9)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <i className={`bi bi-${isDark ? 'sun' : 'moon'}-fill`}></i>
        </button>
        <Component {...pageProps} />
      </div>
    );
  }

  // Pour les pages non publiques (protégées), utiliser le Layout
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}
