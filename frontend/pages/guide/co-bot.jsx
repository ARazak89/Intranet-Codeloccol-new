import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getAuthToken } from "../utils/auth";
import Loader from "../components/Loader";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const STAFF_ROLES = ["admin", "staff", "evaluator"];

function ApprenantGuide() {
  return (
    <div>
      <h2 className="h4 mb-2">📘 Guide Co-Bot — Apprenants</h2>
      <p className="text-muted mb-4">
        Co-Bot te permet de demander une évaluation avec un membre du staff
        directement depuis Discord.
      </p>

      <div className="d-flex flex-column gap-3">
        <div className="card thm-bg-light border-0 shadow-sm">
          <div className="card-body">
            <h3 className="h6 mb-2">1️⃣ Connecte ton compte (une seule fois)</h3>
            <p className="mb-0 small">
              Tape <code>/login</code> dans n&apos;importe quel salon. Une fenêtre
              privée s&apos;ouvre : entre ton email et ton mot de passe Intranet
              Codeloccol. Une fois fait, tu n&apos;as plus jamais besoin de refaire
              cette étape.
            </p>
          </div>
        </div>

        <div className="card thm-bg-light border-0 shadow-sm">
          <div className="card-body">
            <h3 className="h6 mb-2">2️⃣ Demande une évaluation</h3>
            <p className="small mb-2">
              Dans <code>#evaluation-creation</code>, tape{" "}
              <code>/ask-evaluation</code>.
            </p>
            <ul className="small mb-0">
              <li>
                Le bot vérifie que tu as bien un projet en attente
                d&apos;évaluation.
              </li>
              <li>
                Option : tu peux choisir une heure de préférence avec l&apos;option{" "}
                <strong>date</strong> — uniquement aujourd&apos;hui ou demain,
                entre 7h et 22h. Laisse vide pour &quot;n&apos;importe quand&quot;.
              </li>
              <li>
                Ta demande est créée avec un identifiant unique et transmise
                automatiquement au staff.
              </li>
            </ul>
          </div>
        </div>

        <div className="card thm-bg-light border-0 shadow-sm">
          <div className="card-body">
            <h3 className="h6 mb-2">3️⃣ Un membre du staff prend ta demande</h3>
            <p className="mb-0 small">
              Tu reçois un message privé du bot dès qu&apos;un membre du staff
              prend en charge ton évaluation, avec le salon vocal à rejoindre.
            </p>
          </div>
        </div>

        <div className="card thm-bg-light border-0 shadow-sm">
          <div className="card-body">
            <h3 className="h6 mb-2">4️⃣ Le jour J</h3>
            <p className="mb-0 small">
              Rejoins le salon vocal indiqué pour faire ton évaluation avec le
              staff. Il se ferme automatiquement après 2h.
            </p>
          </div>
        </div>

        <div className="card thm-bg-light border-0 shadow-sm">
          <div className="card-body">
            <h3 className="h6 mb-2">5️⃣ Résultat</h3>
            <p className="mb-0 small">
              Une fois l&apos;évaluation terminée, un nouveau message privé du bot
              t&apos;indique si ton projet est validé ✅ ou à retravailler 🔁.
            </p>
          </div>
        </div>
      </div>

      <p className="text-muted small mt-4 mb-0">
        ❓ Besoin d&apos;aide ? Contacte un membre du staff.
      </p>
    </div>
  );
}

function StaffGuide() {
  return (
    <div>
      <h2 className="h4 mb-2">📗 Guide Co-Bot — Staff / Correcteurs</h2>
      <p className="text-muted mb-4">
        Co-Bot permet de gérer les demandes d&apos;évaluation des apprenants
        directement depuis Discord.
      </p>

      <div className="d-flex flex-column gap-3">
        <div className="card thm-bg-light border-0 shadow-sm">
          <div className="card-body">
            <h3 className="h6 mb-2">1️⃣ Connecte ton compte (une seule fois)</h3>
            <p className="small mb-2">
              Tape <code>/login</code> dans n&apos;importe quel salon, entre ton
              email et ton mot de passe Intranet Codeloccol dans la fenêtre
              privée. À faire une seule fois.
            </p>
            <p className="small mb-0 text-warning">
              ⚠️ Seuls les comptes avec un rôle autorisé
              (staff/admin/correcteur) peuvent utiliser les commandes
              ci-dessous.
            </p>
          </div>
        </div>

        <div className="card thm-bg-light border-0 shadow-sm">
          <div className="card-body">
            <h3 className="h6 mb-2">2️⃣ Voir les demandes</h3>
            <p className="mb-0 small">
              <code>/evaluation-list</code> dans <code>#admin-evaluation</code>{" "}
              — liste toutes les demandes (en attente, prises en charge,
              terminées) avec leur date/heure souhaitée.
            </p>
          </div>
        </div>

        <div className="card thm-bg-light border-0 shadow-sm">
          <div className="card-body">
            <h3 className="h6 mb-2">3️⃣ Prendre en charge une demande</h3>
            <p className="mb-0 small">
              <code>/select-evaluation</code> puis choisis une demande dans la
              liste proposée (autocomplétion). Le bot crée un salon vocal privé
              pour toi et l&apos;apprenant, et le prévient automatiquement par
              message privé. Si tu reprends une demande déjà prise en charge par
              toi (salon expiré), le bot te renvoie directement dedans.
            </p>
          </div>
        </div>

        <div className="card thm-bg-light border-0 shadow-sm">
          <div className="card-body">
            <h3 className="h6 mb-2">4️⃣ Rejoins le salon vocal</h3>
            <p className="mb-0 small">
              Il se ferme automatiquement après 2h.
            </p>
          </div>
        </div>

        <div className="card thm-bg-light border-0 shadow-sm">
          <div className="card-body">
            <h3 className="h6 mb-2">5️⃣ Valider ou rejeter le projet</h3>
            <p className="small mb-2">
              <code>/final-review</code>, choisis la demande et le statut
              (Approved/Rejected).
            </p>
            <p className="small text-warning mb-2">
              ⚠️ Le bot redemande ton email et mot de passe à chaque fois pour
              confirmer que c&apos;est bien toi — c&apos;est normal, c&apos;est la
              sécurité de cette action précise.
            </p>
            <p className="mb-0 small">
              Le bot met à jour automatiquement le dossier de l&apos;apprenant
              (nouveau projet, badge, niveau si validé) et le prévient par
              message privé.
            </p>
          </div>
        </div>

        <div className="card thm-bg-light border-0 shadow-sm">
          <div className="card-body">
            <h3 className="h6 mb-2">6️⃣ Consulter les projets d&apos;un module</h3>
            <p className="mb-0 small">
              <code>/module-projects</code> puis choisis un module
              (autocomplétion) pour voir la liste des projets et leurs
              descriptions.
            </p>
          </div>
        </div>
      </div>

      <p className="text-muted small mt-4 mb-0">
        ❓ Besoin d&apos;aide ? Contacte l&apos;équipe technique.
      </p>
    </div>
  );
}

export default function CoBotGuidePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("apprenant");

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchUser = async () => {
      try {
        const res = await fetch(`${API}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch user");
        const data = await res.json();
        setUser(data);
      } catch (e) {
        console.error(e);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  if (loading || !user) {
    return <Loader />;
  }

  const canSeeBoth = STAFF_ROLES.includes(user.role);

  return (
    <div className="pb-5" style={{ maxWidth: 720 }}>
      <div className="mb-4">
        <h1 className="h3 mb-1">Guide Co-Bot</h1>
        <p className="text-muted mb-0">
          Manuel d&apos;utilisation du bot Discord pour les évaluations
        </p>
      </div>

      {canSeeBoth && (
        <ul className="nav nav-tabs mb-4">
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${activeTab === "apprenant" ? "active" : ""}`}
              onClick={() => setActiveTab("apprenant")}
            >
              📘 Apprenants
            </button>
          </li>
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${activeTab === "staff" ? "active" : ""}`}
              onClick={() => setActiveTab("staff")}
            >
              📗 Staff / Correcteurs
            </button>
          </li>
        </ul>
      )}

      {!canSeeBoth || activeTab === "apprenant" ? (
        <ApprenantGuide />
      ) : (
        <StaffGuide />
      )}
    </div>
  );
}
