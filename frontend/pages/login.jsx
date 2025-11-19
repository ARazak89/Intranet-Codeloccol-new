import { useState } from "react";
import { useRouter } from "next/router";
import { jwtDecode } from 'jwt-decode'; // Importer jwt-decode
import Image from "next/image";
import styles from "../styles/login.module.css";

const API = process.env.NEXT_PUBLIC_API_URL;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const r = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json();
      if (data.token) {
        localStorage.setItem("token", data.token);
        
        // Décoder le token pour obtenir le rôle de l'utilisateur
        const decodedToken = jwtDecode(data.token);
        const userRole = decodedToken.role; // Assurez-vous que le rôle est bien dans le token

        if (userRole === "admin") {
          router.push("/admin/challenges"); // Rediriger l'admin vers la page des challenges admin
        } else {
          router.push("/dashboard"); // Redirection par défaut pour les apprenants
        }
      } else {
        setError(data.error || "Erreur de connexion.");
        setIsLoading(false);
      }
    } catch (e) {
      console.error("Erreur de connexion:", e);
      setError("Impossible de se connecter au serveur.");
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <div className={styles.grid}>
          {/* Côté gauche - Branding avec couleur CodeLoccol */}
          <div className={styles.leftPanel}>
            {/* Formes décoratives */}
            <div className={styles.decorCircle1}></div>
            <div className={styles.decorCircle2}></div>
            
            {/* Contenu */}
            <div className={styles.leftContent}>
              {/* Logo CodeLoccol */}
              <div className={styles.logoContainer}>
                <div className={styles.logoCircle}>
                  <Image
                    src="/codeloccol-logo.png"
                    alt="Logo CodeLoccol"
                    width={140}
                    height={140}
                    className={styles.logo}
                    priority
                  />
                </div>
              </div>
              
              {/* Texte */}
              <h1 className={styles.brandTitle}>
                CodeLoccol
              </h1>
              <p className={styles.brandSubtitle}>
                Plateforme d'Apprentissage
              </p>
              <p className={styles.brandDescription}>
                Votre espace de formation et d'évaluation en développement web
              </p>
              
              {/* Description */}
              <div className={styles.systemDescription}>
                <p>
                  Suivez votre progression, gérez vos projets et évoluez dans votre parcours de développeur
                </p>
              </div>
              
              {/* Badge sécurisé */}
              <div className={styles.securityBadge}>
                <svg className={styles.securityIcon} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className={styles.securityText}>Connexion Sécurisée</span>
              </div>
            </div>
          </div>

          {/* Côté droit - Formulaire */}
          <div className={styles.rightPanel}>
            {/* Titre du formulaire */}
            <div className={styles.formHeader}>
              <h2 className={styles.formTitle}>
                Connectez-vous à votre compte
              </h2>
              <p className={styles.formSubtitle}>
                Accédez à votre espace personnel
              </p>
            </div>

            {/* Message d'erreur */}
            {error && (
              <div className={`${styles.alert} ${styles.alertDanger}`}>
                <i className="bi bi-exclamation-triangle-fill"></i>
                {error}
              </div>
            )}

            {/* Formulaire */}
            <form onSubmit={submit} className={styles.form}>
              {/* Email */}
              <div className={styles.formGroup}>
                <label htmlFor="email" className={styles.label}>
                  Adresse email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.input}
                  placeholder="votre.email@codeloccol.com"
                  required
                />
              </div>

              {/* Mot de passe */}
              <div className={styles.formGroup}>
                <label htmlFor="password" className={styles.label}>
                  Mot de passe
                </label>
                <div className={styles.passwordWrapper}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={styles.input}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={styles.passwordToggle}
                    title={showPassword ? "Cacher le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Bouton de connexion */}
              <button type="submit" className={styles.submitBtn} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    <i className="bi bi-box-arrow-in-right"></i>
                    Se connecter
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
