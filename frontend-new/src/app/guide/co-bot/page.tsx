'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

type GuideTab = 'apprenant' | 'staff';

const STAFF_ROLES = ['admin', 'staff', 'evaluator'];

function ApprenantGuide() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          📘 Guide Co-Bot — Apprenants
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Co-Bot te permet de demander une évaluation avec un membre du staff directement depuis Discord.
        </p>
      </div>

      <ol className="space-y-5">
        <li className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white">1️⃣ Connecte ton compte (une seule fois)</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Tape <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-emerald-700 dark:text-emerald-300">/login</code> dans n&apos;importe quel salon.
            Une fenêtre privée s&apos;ouvre : entre ton email et ton mot de passe Intranet Codeloccol.
            Une fois fait, tu n&apos;as plus jamais besoin de refaire cette étape.
          </p>
        </li>

        <li className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white">2️⃣ Demande une évaluation</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Dans <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700">#evaluation-creation</code>, tape{' '}
            <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-emerald-700 dark:text-emerald-300">/ask-evaluation</code>.
          </p>
          <ul className="mt-2 list-disc pl-5 text-sm text-gray-600 dark:text-gray-300 space-y-1">
            <li>Le bot vérifie que tu as bien un projet en attente d&apos;évaluation.</li>
            <li>
              Option : tu peux choisir une heure de préférence avec l&apos;option <strong>date</strong> — uniquement aujourd&apos;hui ou demain, entre 7h et 22h.
              Laisse vide pour &quot;n&apos;importe quand&quot;.
            </li>
            <li>Ta demande est créée avec un identifiant unique et transmise automatiquement au staff.</li>
          </ul>
        </li>

        <li className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white">3️⃣ Un membre du staff prend ta demande</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Tu reçois un message privé du bot dès qu&apos;un membre du staff prend en charge ton évaluation, avec le salon vocal à rejoindre.
          </p>
        </li>

        <li className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white">4️⃣ Le jour J</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Rejoins le salon vocal indiqué pour faire ton évaluation avec le staff. Il se ferme automatiquement après 2h.
          </p>
        </li>

        <li className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white">5️⃣ Résultat</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Une fois l&apos;évaluation terminée, un nouveau message privé du bot t&apos;indique si ton projet est validé ✅ ou à retravailler 🔁.
          </p>
        </li>
      </ol>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        ❓ Besoin d&apos;aide ? Contacte un membre du staff.
      </p>
    </div>
  );
}

function StaffGuide() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          📗 Guide Co-Bot — Staff / Correcteurs
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Co-Bot permet de gérer les demandes d&apos;évaluation des apprenants directement depuis Discord.
        </p>
      </div>

      <ol className="space-y-5">
        <li className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white">1️⃣ Connecte ton compte (une seule fois)</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Tape <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-emerald-700 dark:text-emerald-300">/login</code> dans n&apos;importe quel salon,
            entre ton email et ton mot de passe Intranet Codeloccol dans la fenêtre privée. À faire une seule fois.
          </p>
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
            ⚠️ Seuls les comptes avec un rôle autorisé (staff/admin/correcteur) peuvent utiliser les commandes ci-dessous.
          </p>
        </li>

        <li className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white">2️⃣ Voir les demandes</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-emerald-700 dark:text-emerald-300">/evaluation-list</code> dans{' '}
            <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700">#admin-evaluation</code> — liste toutes les demandes
            (en attente, prises en charge, terminées) avec leur date/heure souhaitée.
          </p>
        </li>

        <li className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white">3️⃣ Prendre en charge une demande</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-emerald-700 dark:text-emerald-300">/select-evaluation</code> puis choisis une demande dans la liste proposée (autocomplétion).
            Le bot crée un salon vocal privé pour toi et l&apos;apprenant, et le prévient automatiquement par message privé.
            Si tu reprends une demande déjà prise en charge par toi (salon expiré), le bot te renvoie directement dedans.
          </p>
        </li>

        <li className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white">4️⃣ Rejoins le salon vocal</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Il se ferme automatiquement après 2h.
          </p>
        </li>

        <li className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white">5️⃣ Valider ou rejeter le projet</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-emerald-700 dark:text-emerald-300">/final-review</code>,
            choisis la demande et le statut (Approved/Rejected).
          </p>
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
            ⚠️ Le bot redemande ton email et mot de passe à chaque fois pour confirmer que c&apos;est bien toi — c&apos;est normal, c&apos;est la sécurité de cette action précise.
          </p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Le bot met à jour automatiquement le dossier de l&apos;apprenant (nouveau projet, badge, niveau si validé) et le prévient par message privé.
          </p>
        </li>

        <li className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white">6️⃣ Consulter les projets d&apos;un module</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-emerald-700 dark:text-emerald-300">/module-projects</code> puis choisis un module (autocomplétion)
            pour voir la liste des projets et leurs descriptions.
          </p>
        </li>
      </ol>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        ❓ Besoin d&apos;aide ? Contacte l&apos;équipe technique.
      </p>
    </div>
  );
}

function GuideContent() {
  const { user } = useAuth();
  const canSeeBoth = STAFF_ROLES.includes(user?.role || '');
  const [activeTab, setActiveTab] = useState<GuideTab>('apprenant');

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Guide Co-Bot</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manuel d&apos;utilisation du bot Discord pour les évaluations
        </p>
      </div>

      {canSeeBoth && (
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setActiveTab('apprenant')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'apprenant'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-300'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            📘 Apprenants
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'staff'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-300'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            📗 Staff / Correcteurs
          </button>
        </div>
      )}

      {!canSeeBoth || activeTab === 'apprenant' ? <ApprenantGuide /> : <StaffGuide />}
    </div>
  );
}

export default function CoBotGuidePage() {
  return (
    <ProtectedRoute>
      <GuideContent />
    </ProtectedRoute>
  );
}
