// import 'bootstrap/dist/css/bootstrap.min.css'; // Assurez-vous que Bootstrap est importé
import "bootstrap-icons/font/bootstrap-icons.css"; // Importez les icônes Bootstrap
import "../styles/global.css"; // Importez vos styles globaux ici
import "bootstrap/dist/css/bootstrap.min.css";
import { useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Layout from "../components/Layout"; // Importez le nouveau Layout

const publicPaths = ["/", "/login"]; // Définissez les chemins publics ici

export default function App({ Component, pageProps }) {
  const router = useRouter();

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

  // Si la page est publique, ne pas utiliser le Layout
  if (publicPaths.includes(router.pathname)) {
    return (
      <>
        <div>
          <Component {...pageProps} />
        </div>
      </>
    );
  }

  // Pour les pages non publiques (protégées), utiliser le Layout
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}
