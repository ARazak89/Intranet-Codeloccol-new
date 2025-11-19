import { useEffect, useState } from "react";
import { useRouter } from "next/router"; // Importez useRouter
import { getAuthToken } from "../utils/auth"; // Importer la fonction getAuthToken
import styles from "../styles/hackathonList.module.css"; // Importation des styles CSS modules

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export default function Hackathons() {
  const [list, setList] = useState([]);
  const [error, setError] = useState(null); // Pour gérer les erreurs d'API
  const [success, setSuccess] = useState(null); // Pour gérer les messages de succès
  const [showHackathonModal, setShowHackathonModal] = useState(false); // Nouvel état pour la modale
  const [selectedHackathon, setSelectedHackathon] = useState(null); // Nouvel état pour le hackathon sélectionné
  const [me, setMe] = useState(null); // État pour stocker les informations de l'utilisateur connecté
  // const [learners, setLearners] = useState([]); // État pour stocker la liste des apprenants (supprimé)

  // États pour la création de Hackathon
  const [showCreateHackathonModal, setShowCreateHackathonModal] =
    useState(false); // Nouvel état pour la modale de création de hackathon
  const [newHackathonTitle, setNewHackathonTitle] = useState("");
  const [newHackathonDescription, setNewHackathonDescription] = useState("");
  const [newHackathonStartDate, setNewHackathonStartDate] = useState("");
  const [newHackathonEndDate, setNewHackathonEndDate] = useState("");
  const [newHackathonSpecifications, setNewHackathonSpecifications] =
    useState(""); // Remplacer githubRepoUrl par specifications
  const [newHackathonTeamSize, setNewHackathonTeamSize] = useState(1); // Nouveau champ pour la taille d'équipe

  // États pour l'édition de Hackathon
  const [showEditHackathonModal, setShowEditHackathonModal] = useState(false);
  const [editHackathonId, setEditHackathonId] = useState(null);
  const [editHackathonTitle, setEditHackathonTitle] = useState("");
  const [editHackathonDescription, setEditHackathonDescription] = useState("");
  const [editHackathonStartDate, setEditHackathonStartDate] = useState("");
  const [editHackathonEndDate, setEditHackathonEndDate] = useState("");
  const [editHackathonSpecifications, setEditHackathonSpecifications] = useState("");
  const [editHackathonTeamSize, setEditHackathonTeamSize] = useState(1);

  // États pour la constitution des équipes
  const [showConstituteTeamsModal, setShowConstituteTeamsModal] =
    useState(false);
  const [selectedHackathonForTeams, setSelectedHackathonForTeams] =
    useState(null);
  const [availableLearnersForTeams, setAvailableLearnersForTeams] = useState(
    []
  );
  const [currentTeams, setCurrentTeams] = useState([]); // Format: [{ name: '', members: [] }]
  const [currentHackathonTeams, setCurrentHackathonTeams] = useState([]); // Pour stocker les équipes du hackathon sélectionné
  const [showSubmissionModal, setShowSubmissionModal] = useState(false); // État pour la modale de soumission
  const [githubRepoUrl, setGithubRepoUrl] = useState(""); // Pour l'URL du dépôt GitHub
  const [githubPagesUrl, setGithubPagesUrl] = useState(""); // Pour l'URL GitHub Pages
  const [hasSubmitted, setHasSubmitted] = useState(false); // Nouvel état pour vérifier si l'équipe a déjà soumis

  const router = useRouter();
  const token = getAuthToken();

  const fetchHackathonsData = async () => {
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      // Récupérer les informations de l'utilisateur connecté
      const meRes = await fetch(`${API}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!meRes.ok) throw new Error("Failed to fetch user info");
      const userData = await meRes.json();
      setMe(userData);

      const r = await fetch(`${API}/hackathons`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error("Failed to fetch hackathons");
      setList(await r.json());

      // Fetch available learners for team constitution if staff/admin
      if (userData && (userData.role === "staff" || userData.role === "admin")) {
        // Cette partie sera gérée par loadLearners lors de l'ouverture de la modale constituer équipes
        // const learnersRes = await fetch(
        //   `${API}/hackathons/available-learners`,
        //   { headers: { Authorization: `Bearer ${token}` } }
        // );
        // if (!learnersRes.ok)
        //   throw new Error("Failed to fetch available learners");
        // setAvailableLearnersForTeams(await learnersRes.json());
      }
    } catch (e) {
      setError(e.message);
    }
  };

  const loadHackathonTeams = async (hackathonId) => {
    if (!token || !hackathonId || !me) return; // me doit être disponible pour vérifier le rôle
    console.log("User role in loadHackathonTeams:", me.role);
    try {
      let url = '';
      if (me.role === 'apprenant') {
        url = `${API}/teams/my-team/hackathon/${hackathonId}`;
      } else if (me.role === 'staff' || me.role === 'admin') {
        url = `${API}/teams/hackathon/${hackathonId}`;
      } else {
        console.error("Rôle utilisateur non géré pour le chargement des équipes.");
        setError("Vous n\'êtes pas autorisé à voir les équipes.");
        return;
      }

      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) {
        const errorBody = await r.text(); // Tente de lire le corps de la réponse
        console.error(`Error status: ${r.status}, body: ${errorBody}`);
        // Si c'est un apprenant et qu'aucune équipe n'est trouvée (statut 404), ne pas traiter comme une erreur fatale
        if (me.role === 'apprenant' && r.status === 404) {
          setCurrentHackathonTeams([]); // Assurez-vous que l'état est vide
          return; // Ne pas jeter d'erreur
        }
        throw new Error("Failed to fetch hackathon teams");
      }
      // Si c'est un apprenant, setCurrentHackathonTeams recevra une seule équipe
      // Pour staff/admin, il recevra un tableau d'équipes
      const teamsData = await r.json();
      console.log("teamsData (for apprenant) in loadHackathonTeams:", teamsData);

      if (me.role === 'apprenant') {
        // L'apprenant ne devrait voir que son équipe, donc un objet unique
        const teamsToSet = teamsData ? [teamsData] : [];
        setCurrentHackathonTeams(teamsToSet);
        console.log("currentHackathonTeams (after setting for apprenant):", teamsToSet);

        // Vérifier si l'équipe a déjà soumis
        if (teamsData && teamsData.length > 0 && teamsData[0]._id && selectedHackathon._id) {
          const hasSubmittedRes = await fetch(`${API}/ide/submission/has-submitted/${selectedHackathon._id}/${teamsData[0]._id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (hasSubmittedRes.ok) {
            const { hasSubmitted: submittedStatus } = await hasSubmittedRes.json();
            setHasSubmitted(submittedStatus);
          } else {
            console.error("Failed to check submission status.");
            setHasSubmitted(false);
          }
        } else {
          setHasSubmitted(false); // Pas d'équipe ou pas de hackathon sélectionné
        }
      } else {
        setCurrentHackathonTeams(teamsData);
        setHasSubmitted(false); // Pas pertinent pour staff/admin
      }
    } catch (e) {
      console.error("Error loading hackathon teams:", e);
      setError(e.message);
    }
  };

  const handleCardClick = (hackathon) => {
    setSelectedHackathon(hackathon);
    setShowHackathonModal(true);
    console.log("Me object in handleCardClick:", me);
    if (me) { // S'assurer que me est défini
      loadHackathonTeams(hackathon._id);
    } else {
      console.warn("User data (me) not yet loaded when clicking hackathon card.");
      // Gérer le cas où 'me' n'est pas encore chargé, par ex. afficher un loader ou un message
    }
    if (me && (me.role === "staff" || me.role === "admin")) {
      // Recharger les détails du hackathon avec les participants peuplés
      fetch(`${API}/hackathons/${hackathon._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            setSelectedHackathon(data);
          } else {
            console.error("Failed to fetch detailed hackathon data:", data.error);
          }
        })
        .catch(e => console.error("Error fetching detailed hackathon data:", e));

      loadLearners(hackathon._id); // Charger les apprenants disponibles uniquement si l'utilisateur est staff/admin
    }
  };

  const handleCloseModal = () => {
    setShowHackathonModal(false);
    setSelectedHackathon(null);
  };

  const handleDeleteTeam = async (teamId) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette équipe ?")) return;
    setError(null);
    try {
      const r = await fetch(`${API}/teams/${teamId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.message || "Failed to delete team");
      }
      alert("Équipe supprimée avec succès !");
      loadHackathonTeams(selectedHackathon._id); // Recharger les équipes du hackathon
    } catch (e) {
      setError(e.message);
    }
  };

  const handleAddMember = async (teamId, memberId) => {
    setError(null);
    try {
      const r = await fetch(`${API}/teams/${teamId}/add-member`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ memberId }),
      });
      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.message || "Failed to add member");
      }
      alert("Membre ajouté avec succès !");
      loadHackathonTeams(selectedHackathon._id);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleRemoveMember = async (teamId, memberId) => {
    if (!confirm("Êtes-vous sûr de vouloir retirer ce membre de l'équipe ?"))
      return;
    setError(null);
    try {
      const r = await fetch(`${API}/teams/${teamId}/remove-member`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ memberId }),
      });
      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.message || "Failed to remove member");
      }
      alert("Membre retiré avec succès !");
      loadHackathonTeams(selectedHackathon._id);
    } catch (e) {
      setError(e.message);
    }
  };

  // Nouvelle fonction pour gérer la suppression d'un hackathon
  const handleDeleteHackathon = async (hackathonId) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce hackathon ?")) return;
    setError(null);
    try {
      const r = await fetch(`${API}/hackathons/${hackathonId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.message || "Failed to delete hackathon");
      }
      alert("Hackathon supprimé avec succès !");
      fetchHackathonsData(); // Recharger la liste des hackathons
    } catch (e) {
      setError(e.message);
    }
  };

  // Nouvelle fonction pour gérer la modification d'un hackathon (à implémenter si nécessaire)
  const handleEditHackathon = (hackathon) => {
    // alert("Fonction de modification à implémenter pour: " + hackathon.title);
    setSelectedHackathon(hackathon); // Stocker le hackathon pour la modale de détails
    setEditHackathonId(hackathon._id);
    setEditHackathonTitle(hackathon.title);
    setEditHackathonDescription(hackathon.description);
    setEditHackathonStartDate(hackathon.startDate.split('T')[0]); // Formater la date pour l'input type="date"
    setEditHackathonEndDate(hackathon.endDate.split('T')[0]); // Formater la date pour l'input type="date"
    setEditHackathonSpecifications(hackathon.specifications);
    setEditHackathonTeamSize(hackathon.teamSize);
    setShowEditHackathonModal(true); // Ouvrir la modale d'édition
  };

  // Nouvelle fonction pour gérer la soumission de la modification d'un hackathon
  const handleUpdateHackathon = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError("Vous devez être connecté pour modifier un hackathon.");
      return;
    }

    if (
      !editHackathonTitle ||
      !editHackathonStartDate ||
      !editHackathonEndDate ||
      !editHackathonTeamSize
    ) {
      setError("Le titre, les dates et la taille d'équipe sont obligatoires.");
      return;
    }
    if (editHackathonTeamSize < 1) {
      setError("La taille des équipes doit être d'au moins 1.");
      return;
    }

    try {
      const r = await fetch(`${API}/hackathons/${editHackathonId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editHackathonTitle,
          description: editHackathonDescription,
          startDate: editHackathonStartDate,
          endDate: editHackathonEndDate,
          specifications: editHackathonSpecifications,
          teamSize: editHackathonTeamSize,
        }),
      });
      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(
          errorData.message || "Échec de la modification du hackathon"
        );
      }
      alert("Hackathon modifié avec succès !");
      setShowEditHackathonModal(false);
      fetchHackathonsData(); // Recharger la liste des hackathons
    } catch (e) {
      setError(e.message);
    } finally {
      // setIsLoading(false);
    }
  };

  // Refactorisation de handleCreateHackathon pour inclure teamSize et specifications
  const handleCreateHackathon = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError("Vous devez être connecté pour créer un hackathon.");
      return;
    }

    if (
      !newHackathonTitle ||
      !newHackathonStartDate ||
      !newHackathonEndDate ||
      !newHackathonTeamSize
    ) {
      setError("Le titre, les dates et la taille d'équipe sont obligatoires.");
      return;
    }
    if (newHackathonTeamSize < 1) {
      setError("La taille des équipes doit être d'au moins 1.");
      return;
    }

    try {
      const r = await fetch(`${API}/hackathons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newHackathonTitle,
          description: newHackathonDescription,
          startDate: newHackathonStartDate,
          endDate: newHackathonEndDate,
          specifications: newHackathonSpecifications, // Utilisez le nouveau champ
          teamSize: newHackathonTeamSize, // Utilisez le nouveau champ
        }),
      });
      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(
          errorData.message || "Échec de la création du hackathon"
        );
      }
      alert("Hackathon créé avec succès !");
      setShowCreateHackathonModal(false);
      setNewHackathonTitle("");
      setNewHackathonDescription("");
      setNewHackathonStartDate("");
      setNewHackathonEndDate("");
      setNewHackathonSpecifications(""); // Réinitialiser le nouveau champ
      setNewHackathonTeamSize(1); // Réinitialiser
      fetchHackathonsData(); // Recharger la liste des hackathons
    } catch (e) {
      setError(e.message);
    } finally {
      // setIsLoading(false);
    }
  };

  // Fonction pour gérer la constitution des équipes (copiée de dashboard.js)
  const handleConstituteTeams = async () => {
    setError(null);

    if (!token) {
      setError("Vous devez être connecté pour constituer les équipes.");
      return;
    }

    if (!selectedHackathonForTeams) {
      setError("Veuillez sélectionner un hackathon.");
      return;
    }

    // Vérifications côté client (redondantes avec le backend, mais offrent un feedback immédiat)
    if (currentTeams.length === 0) {
      setError("Veuillez constituer au moins une équipe.");
      return;
    }

    const allMembersInCurrentTeams = [];
    for (const team of currentTeams) {
      if (!team.name.trim()) {
        setError("Tous les noms d'équipe sont obligatoires.");
        return;
      }
      if (team.members.length === 0) {
        setError(`L'équipe ${team.name} doit avoir au moins un membre.`);
        return;
      }
      const expectedTeamSize = selectedHackathonForTeams.teamSize;
      const minTeamSize = Math.max(1, expectedTeamSize - 1);
      const maxTeamSize = expectedTeamSize + 1;

      if (team.members.length < minTeamSize || team.members.length > maxTeamSize) {
        setError(
          `L'équipe ${team.name} doit avoir entre ${minTeamSize} et ${maxTeamSize} membres.`
        );
        return;
      }
      for (const memberId of team.members) {
        if (allMembersInCurrentTeams.includes(memberId)) {
          setError(
            `L'apprenant ${
              availableLearnersForTeams.find((l) => l._id === memberId)?.name ||
              memberId
            } est assigné à plus d'une équipe.`
          );
          return;
        }
        allMembersInCurrentTeams.push(memberId);
      }
    }

    try {
      const res = await fetch(
        `${API}/hackathons/${selectedHackathonForTeams._id}/constitute-teams`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ teams: currentTeams }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        // setSuccess(data.message); // Ajoutez si nécessaire
        alert(data.message);
        setShowConstituteTeamsModal(false);
        setSelectedHackathonForTeams(null);
        setCurrentTeams([]);
        fetchHackathonsData(); // Recharger les données pour refléter les nouvelles équipes
      } else {
        throw new Error(
          data.error || data.message || "Échec de la constitution des équipes."
        );
      }
    } catch (e) {
      console.error("Error constituting teams:", e);
      setError(e.message);
    } finally {
      // setIsLoading(false);
    }
  };

  // Charger les données initiales
  useEffect(() => {
    fetchHackathonsData();
  }, [token]); // Dépendance à token pour re-fetch si le token change

  // Charger les apprenants si l'utilisateur est staff/admin ET que 'me' est défini
  useEffect(() => {
    if (me && (me.role === "staff" || me.role === "admin")) {
      // Ne rien faire ici, le chargement des apprenants se fera lors de la sélection du hackathon dans la modale de constitution d'équipes
      // ou via fetchHackathonsData si c'est nécessaire pour une liste globale.
      // loadLearners();
    }
  }, [me]); // Dépendance à 'me' pour charger les apprenants après que l'utilisateur soit chargé

  const loadLearners = async (hackathonId) => {
    if (!token) return;
    try {
      const url = hackathonId 
        ? `${API}/hackathons/available-learners?hackathonId=${hackathonId}`
        : `${API}/users?role=apprenant`; // Fallback si pas de hackathonId
      const learnersRes = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!learnersRes.ok) {
        const errorBody = await learnersRes.text();
        console.error(`Error status: ${learnersRes.status}, body: ${errorBody}`);
        throw new Error("Failed to fetch learners");
      }
      setAvailableLearnersForTeams(await learnersRes.json());
    } catch (e) {
      console.error("Error loading learners:", e);
      setError(e.message);
    }
  };

  const handleSubmission = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError("Vous devez être connecté pour soumettre un projet.");
      return;
    }
    if (!selectedHackathon || !me) {
      setError("Aucun hackathon sélectionné ou utilisateur non identifié.");
      return;
    }

    const myTeam = currentHackathonTeams.find((team) =>
      team.members && team.members.some((member) => member._id === me.id)
    );

    if (!myTeam) {
      setError("Vous devez faire partie d'une équipe pour soumettre un projet.");
      return;
    }

    try {
      const r = await fetch(`${API}/ide/submit-project`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          challengeId: selectedHackathon.challenges[0]._id, // Assurez-vous d'avoir le bon challengeId
          challengeTitle: selectedHackathon.title, // Utiliser le titre du hackathon comme titre de challenge
          htmlCode: "", // Pas de code direct ici, seulement les URLs
          cssCode: "",
          jsCode: "",
          githubRepoUrl: githubRepoUrl,
          githubPagesUrl: githubPagesUrl,
        }),
      });

      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(
          errorData.message || "Échec de la soumission du projet"
        );
      }
      setSuccess("Projet soumis avec succès !");
      setShowSubmissionModal(false);
      setGithubRepoUrl("");
      setGithubPagesUrl("");
      // Recharger les données du hackathon pour refléter la soumission
      fetchHackathonsData();
    } catch (e) {
      console.error("Error submitting project:", e);
      setError(e.message);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Hackathons</h1>

      {error && (
        <div className="alert alert-danger mt-3" role="alert">
          {error}
        </div>
      )}
      {me && (me.role === "staff" || me.role === "admin") && (
        <div className="d-flex justify-content-end mb-3">
          <button
            className="btn btn-primary me-2 thm-shadow-m"
            onClick={() => setShowCreateHackathonModal(true)}
          >
            <i className="bi bi-plus-circle me-2"></i> Créer un nouveau
            Hackathon
          </button>
          <button
            className="btn btn-success thm-shadow-m"
            onClick={() => setShowConstituteTeamsModal(true)}
          >
            <i className="bi bi-people me-2"></i> Constituer Équipes
          </button>
        </div>
      )}

      {list.length === 0 ? (
        <p>Aucun hackathon disponible pour le moment.</p>
      ) : (
        <div className={styles.hackathonGrid}>
          {list.map((h) => (
            <div key={h._id} className={styles.hackathonCard} onClick={() => handleCardClick(h)}>
              <h2>{h.title}</h2>
              <p>{h.description.substring(0, 150)}...</p>

              <div className={styles.cardDetails}>
                {me && me.role !== "apprenant" && h.teamSize && (
                  <span><strong>Taille d'équipe:</strong> {h.teamSize}</span>
                )}
                <span className={
                  h.status === "active"
                    ? styles.statusActive
                    : h.status === "finished"
                    ? styles.statusFinished
                    : styles.statusEvaluated
                }>
                  {h.status}
                </span>
                <span>
                  <strong>Fin:</strong> {new Date(h.endDate).toLocaleDateString()}
                </span>
              </div>

              {me && (me.role === "staff" || me.role === "admin") && (
                <div className={styles.actionButtonsContainer}>
                  <button
                    className={`${styles.actionButtonSmall} ${styles.actionButtonPrimary}`}
                    onClick={(e) => { e.stopPropagation(); handleEditHackathon(h); }}
                    title="Modifier le Hackathon"
                  >
                    <i className="bi bi-pencil"></i> Modifier
                  </button>
                  <button
                    className={`${styles.actionButtonSmall} ${styles.actionButtonDanger}`}
                    onClick={(e) => { e.stopPropagation(); handleDeleteHackathon(h._id); }}
                    title="Supprimer le Hackathon"
                  >
                    <i className="bi bi-trash"></i> Supprimer
                  </button>
                </div>
              )}

              {me && me.role !== "apprenant" && h.teams && h.teams.length > 0 && (
                <small className="text-muted mt-2">
                  Équipes constituées: {h.teams.length}
                </small>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modale d'affichage des détails du Hackathon */}
      {showHackathonModal && selectedHackathon && (
        <div className="modal" tabIndex="-1" style={{ display: "block" }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className={styles.modalHeader}>
                <h5 className={styles.modalTitle}>
                  Détails du Hackathon: {selectedHackathon.title}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCloseModal}
                ></button>
              </div>
              <div className={styles.modalBody}>
                <p>
                  <strong>Description:</strong> {selectedHackathon.description}
                </p>
                {selectedHackathon.specifications && (
                  <p>
                    <strong>Spécifications:</strong>{" "}
                    {selectedHackathon.specifications}
                  </p>
                )}
                <p>
                  <strong>Taille d'équipe:</strong> {selectedHackathon.teamSize}
                </p>
                <p>
                  <strong>Date de début:</strong>{" "}
                  {new Date(selectedHackathon.startDate).toLocaleDateString()}
                </p>
                <p>
                  <strong>Date de fin:</strong>{" "}
                  {new Date(selectedHackathon.endDate).toLocaleDateString()}
                </p>
                <p>
                  <strong>Statut:</strong>{" "}
                  <span
                    className={
                      selectedHackathon.status === "active"
                        ? styles.statusActive
                        : selectedHackathon.status === "finished"
                        ? styles.statusFinished
                        : styles.statusEvaluated
                    }
                  >
                    {selectedHackathon.status}
                  </span>
                </p>
                {/* Masquer les participants pour les apprenants si nécessaire */}
                {/* Afficher les projets soumis pour staff/admin et apprenants */}
                {selectedHackathon.projects && selectedHackathon.projects.length > 0 && (
                  <div className="mt-3">
                    <p>
                      <strong>
                        Projets soumis ({selectedHackathon.projects.length}):
                      </strong>
                    </p>
                    <ul className="list-group list-group-flush">
                      {selectedHackathon.projects.map((project) => (
                        <li
                          key={project._id}
                          className="list-group-item d-flex align-items-center"
                        >
                          <i className="bi bi-folder-fill me-2"></i>{" "}
                          {project.title} (par {project.student.name})
                          {project.repoUrl && (
                            <a
                              href={project.repoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ms-2 badge bg-primary text-decoration-none"
                            >
                              Dépôt
                            </a>
                          )}
                          {project.githubPagesUrl && (
                            <a
                              href={project.githubPagesUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ms-2 badge bg-secondary text-decoration-none"
                            >
                              GitHub Pages
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* Afficher les équipes constituées */}
                {currentHackathonTeams.length > 0 &&
                  me &&
                  (me.role === "staff" || me.role === "admin") && (
                    <div className="mt-4 pt-3 border-top">
                      <h4 className="mb-3">
                        <i className="bi bi-people-fill me-2"></i> Équipes
                        Constituées
                      </h4>
                      {error && (
                        <div className="alert alert-danger mt-3" role="alert">
                          {error}
                        </div>
                      )}
                      <ul className="list-group">
                        {currentHackathonTeams.map((team) => (
                          <li
                            key={team._id}
                            className="list-group-item d-flex justify-content-between align-items-center flex-wrap"
                          >
                            <div>
                              <strong>{team.name}</strong> (
                              {team.members ? team.members.length : 0} membres)
                              <ul className="list-unstyled ms-3 mt-1 small">
                                {team.members && team.members.map((member) => (
                                  <li
                                    key={member._id}
                                    className="d-flex align-items-center"
                                  >
                                    <i className="bi bi-person-fill me-1"></i>{" "}
                                    {member.name} ({member.email})
                                    {team.members.length > 3 && (
                                      <button
                                        className="btn btn-link btn-sm text-danger p-0 ms-2"
                                        onClick={() =>
                                          handleRemoveMember(
                                            team._id,
                                            member._id
                                          )
                                        }
                                        title="Retirer le membre"
                                      >
                                        <i className="bi bi-x-circle"></i>
                                      </button>
                                    )}
                                  </li>
                                ))}
                              </ul>
                              {team.submission && (
                                <div className="mt-2">
                                  {team.submission.githubRepoUrl && (
                                    <a
                                      href={team.submission.githubRepoUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="badge bg-primary text-decoration-none me-2"
                                    >
                                      Dépôt GitHub
                                    </a>
                                  )}
                                  {team.submission.githubPagesUrl && (
                                    <a
                                      href={team.submission.githubPagesUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="badge bg-secondary text-decoration-none"
                                    >
                                      GitHub Pages
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                            <button
                              className="btn btn-sm btn-outline-danger mt-2 mt-md-0"
                              onClick={() => handleDeleteTeam(team._id)}
                              title="Supprimer l\'équipe"
                            >
                              <i className="bi bi-trash"></i> Supprimer
                              l\'équipe
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                {/* Afficher l'équipe de l'apprenant */}
                {me && me.role === "apprenant" && (
                  <div className="mt-4 pt-3 border-top">
                    <h4 className="mb-3">
                      <i className="bi bi-people-fill me-2"></i> Mon Équipe
                    </h4>
                    {error && (
                      <div className="alert alert-danger mt-3" role="alert">
                        {error}
                      </div>
                    )}
                    {currentHackathonTeams.length > 0 ? (
                      <ul className="list-group">
                        {currentHackathonTeams.map((team) => (
                          <li
                            key={team._id}
                            className="list-group-item d-flex justify-content-between align-items-center flex-wrap"
                          >
                            <div>
                              <strong>{team.name}</strong> (
                              {team.members ? team.members.length : 0} membres)
                              <ul className="list-unstyled ms-3 mt-1 small">
                                {team.members && team.members.map((member) => (
                                  <li
                                    key={member._id}
                                    className="d-flex align-items-center"
                                  >
                                    <i className="bi bi-person-fill me-1"></i>{" "}
                                    {member.name} ({member.email})
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>Vous ne faites pas partie d'une équipe pour ce hackathon.</p>
                    )}
                  </div>
                )}
              </div>
              <div className={styles.modalFooter}>
                {me && me.role === "apprenant" && currentHackathonTeams.length > 0 && selectedHackathon && (
                  (() => {
                    console.log("Debug myTeam calculation:", {
                      currentHackathonTeams: currentHackathonTeams,
                      meId: me.id, // Utiliser me.id
                    });
                    const myTeam = currentHackathonTeams.find((team) => {
                      console.log("  Checking team:", team);
                      return team.members && team.members.some((member) => {
                        console.log("    Comparing member:", member._id, "with me:", me.id);
                        return member._id === me.id; // Comparer member._id avec me.id
                      });
                    });
                    const now = new Date();
                    const hackathonEndDate = new Date(selectedHackathon.endDate);
                    const isSubmissionPeriodActive = now < hackathonEndDate && selectedHackathon.status === 'active';

                    console.log("Debug Submission Button:", {
                      myTeam: !!myTeam,
                      isSubmissionPeriodActive: isSubmissionPeriodActive,
                      hasSubmitted: hasSubmitted,
                      selectedHackathonStatus: selectedHackathon.status,
                      selectedHackathonEndDate: selectedHackathon.endDate,
                      currentDate: now,
                    });

                    if (myTeam && isSubmissionPeriodActive && !hasSubmitted) {
                      return (
                        <button
                          type="button"
                          className={`${styles.actionButton} ${styles.btnPrimary} me-auto`}
                          onClick={() => setShowSubmissionModal(true)}
                        >
                          Soumettre le Projet
                        </button>
                      );
                    } else if (myTeam && hasSubmitted) {
                      return (
                        <span className="text-success me-auto">
                          <i className="bi bi-check-circle-fill me-2"></i>Projet déjà soumis.
                        </span>
                      );
                    }
                    return null;
                  })()
                )}
                <button
                  type="button"
                  className={`${styles.actionButton} ${styles.btnSecondary}`}
                  onClick={handleCloseModal}
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showHackathonModal && <div className="modal-backdrop fade show"></div>}

      {/* Modale de création de Hackathon (pour staff/admin) */}
      {showCreateHackathonModal && (
        <div className="modal" tabIndex="-1" style={{ display: "block" }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className={styles.modalHeader}>
                <h5 className={styles.modalTitle}>Créer un nouveau Hackathon</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCreateHackathonModal(false)}
                ></button>
              </div>
              <div className={styles.modalBody}>
                <form onSubmit={handleCreateHackathon}>
                  <div className="mb-3">
                    <label htmlFor="newHackathonTitle" className={styles.formLabel}>
                      Titre du Hackathon
                    </label>
                    <input
                      type="text"
                      className={styles.formControl}
                      id="newHackathonTitle"
                      value={newHackathonTitle}
                      onChange={(e) => setNewHackathonTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label
                      htmlFor="newHackathonDescription"
                      className={styles.formLabel}
                    >
                      Description
                    </label>
                    <textarea
                      className={styles.formControl}
                      id="newHackathonDescription"
                      rows="3"
                      value={newHackathonDescription}
                      onChange={(e) =>
                        setNewHackathonDescription(e.target.value)
                      }
                      required
                    ></textarea>
                  </div>
                  <div className="mb-3">
                    <label
                      htmlFor="newHackathonStartDate"
                      className={styles.formLabel}
                    >
                      Date de début
                    </label>
                    <input
                      type="date"
                      className={styles.formControl}
                      id="newHackathonStartDate"
                      value={newHackathonStartDate}
                      onChange={(e) => setNewHackathonStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="newHackathonEndDate" className={styles.formLabel}>
                      Date de fin
                    </label>
                    <input
                      type="date"
                      className={styles.formControl}
                      id="newHackathonEndDate"
                      value={newHackathonEndDate}
                      onChange={(e) => setNewHackathonEndDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label
                      htmlFor="newHackathonSpecifications"
                      className={styles.formLabel}
                    >
                      Spécifications (Optionnel)
                    </label>
                    <textarea
                      className={styles.formControl}
                      id="newHackathonSpecifications"
                      rows="3"
                      value={newHackathonSpecifications}
                      onChange={(e) =>
                        setNewHackathonSpecifications(e.target.value)
                      }
                    ></textarea>
                  </div>
                  <div className="mb-3">
                    <label
                      htmlFor="newHackathonTeamSize"
                      className={styles.formLabel}
                    >
                      Taille d'équipe (1 à 5)
                    </label>
                    <input
                      type="number"
                      className={styles.formControl}
                      id="newHackathonTeamSize"
                      value={newHackathonTeamSize}
                      onChange={(e) =>
                        setNewHackathonTeamSize(
                          Math.max(1, Math.min(5, parseInt(e.target.value, 10)))
                        )
                      }
                      min="1"
                      max="5"
                      required
                    />
                  </div>
                  <button type="submit" className={`${styles.actionButton} ${styles.btnPrimary} me-2`}>
                    Créer le Hackathon
                  </button>
                  <button
                    type="button"
                    className={`${styles.actionButton} ${styles.btnSecondary}`}
                    onClick={() => setShowCreateHackathonModal(false)}
                  >
                    Annuler
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      {showCreateHackathonModal && (
        <div className="modal-backdrop fade show"></div>
      )}

      {/* Modale de constitution des équipes (pour staff/admin) */}
      {showConstituteTeamsModal && (
        <div className="modal" tabIndex="-1" style={{ display: "block" }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className={styles.modalHeader}>
                <h5 className={styles.modalTitle}>
                  Constituer les Équipes pour{" "}
                  {selectedHackathonForTeams?.title || ""}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowConstituteTeamsModal(false)}
                ></button>
              </div>
              <div className={styles.modalBody}>
                <form onSubmit={handleConstituteTeams}>
                  <div className="mb-3">
                    <label htmlFor="constituteHackathon" className={styles.formLabel}>
                      Hackathon à constituer
                    </label>
                    <select
                      className={styles.formControl}
                      id="constituteHackathon"
                      value={selectedHackathonForTeams?._id || ""}
                      onChange={async (e) => {
                        const hackathon = list.find(
                          (h) => h._id === e.target.value
                        );
                        setSelectedHackathonForTeams(hackathon);
                        setCurrentTeams([]); // Réinitialiser les équipes pour le nouveau hackathon
                        if (hackathon) {
                          await loadLearners(hackathon._id); // Recharger les apprenants disponibles pour le hackathon sélectionné
                        } else {
                          setAvailableLearnersForTeams([]); // Vider si aucun hackathon sélectionné
                        }
                      }}
                      required
                    >
                      <option value="">Sélectionnez un hackathon</option>
                      {list
                        .filter((h) => h.status === "active" && h.teamSize > 0)
                        .map((h) => (
                          <option key={h._id} value={h._id}>
                            {h.title} (Taille: {h.teamSize})
                          </option>
                        ))}
                    </select>
                  </div>
                  {selectedHackathonForTeams && (
                    <div className="mb-3">
                      <label htmlFor="teamName" className={styles.formLabel}>
                        Nom de l'équipe
                      </label>
                      <input
                        type="text"
                        className={styles.formControl}
                        id="teamName"
                        value={
                          currentTeams.length > 0 ? currentTeams[0].name : ""
                        } // Afficher le nom de l'équipe si déjà ajouté
                        onChange={(e) => {
                          if (currentTeams.length === 0) {
                            setCurrentTeams([
                              { name: e.target.value, members: [] },
                            ]);
                          } else {
                            setCurrentTeams((prev) => [
                              { ...prev[0], name: e.target.value },
                            ]);
                          }
                        }}
                        required
                      />
                    </div>
                  )}
                  {selectedHackathonForTeams && (
                    <div className="mb-3">
                      <label htmlFor="teamMembers" className={styles.formLabel}>
                        Membres
                      </label>
                      <select
                        multiple
                        className={styles.formControl}
                        id="teamMembers"
                        value={
                          currentTeams.length > 0 ? currentTeams[0].members : []
                        }
                        onChange={(e) => {
                          const selectedMemberIds = Array.from(e.target.options)
                            .filter((option) => option.selected)
                            .map((option) => option.value);
                          setCurrentTeams((prev) => [
                            { ...prev[0], members: selectedMemberIds },
                          ]);
                        }}
                        required
                    >
                        {availableLearnersForTeams
                          .filter(
                            (learner) =>
                              // Filtrer les apprenants qui ne sont pas déjà dans une équipe pour ce hackathon
                              !currentTeams.some((team) =>
                                team.members.some(
                                  (member) => member._id === learner._id
                                )
                              )
                          )
                          .map((learner) => (
                            <option key={learner._id} value={learner._id}>
                              {learner.name} ({learner.email})
                            </option>
                          ))}
                      </select>
                      <small className="form-text text-muted">
                        Sélectionnez entre {Math.max(1, selectedHackathonForTeams.teamSize - 1)} et {selectedHackathonForTeams.teamSize + 1} apprenants.
                      </small>
                    </div>
                  )}
                  <button type="submit" className={`${styles.actionButton} ${styles.btnPrimary} me-2`}>
                    Constituer les Équipes
                  </button>
                  <button
                    type="button"
                    className={`${styles.actionButton} ${styles.btnSecondary}`}
                    onClick={() => setShowConstituteTeamsModal(false)}
                  >
                    Annuler
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      {showConstituteTeamsModal && (
        <div className="modal-backdrop fade show"></div>
      )}

      {/* Modale de soumission de projet (pour apprenants) */}
      {showSubmissionModal && selectedHackathon && (
        <div className="modal" tabIndex="-1" style={{ display: "block" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className={styles.modalHeader}>
                <h5 className={styles.modalTitle}>Soumettre le Projet Hackathon</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowSubmissionModal(false)}
                ></button>
              </div>
              <div className={styles.modalBody}>
                <form onSubmit={handleSubmission}>
                  <div className="mb-3">
                    <label htmlFor="githubRepoUrl" className={styles.formLabel}>
                      URL du Dépôt GitHub
                    </label>
                    <input
                      type="url"
                      className={styles.formControl}
                      id="githubRepoUrl"
                      value={githubRepoUrl}
                      onChange={(e) => setGithubRepoUrl(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="githubPagesUrl" className={styles.formLabel}>
                      URL GitHub Pages (Optionnel)
                    </label>
                    <input
                      type="url"
                      className={styles.formControl}
                      id="githubPagesUrl"
                      value={githubPagesUrl}
                      onChange={(e) => setGithubPagesUrl(e.target.value)}
                    />
                  </div>
                  <button type="submit" className={`${styles.actionButton} ${styles.btnPrimary} me-2`}>
                    Soumettre
                  </button>
                  <button
                    type="button"
                    className={`${styles.actionButton} ${styles.btnSecondary}`}
                    onClick={() => setShowSubmissionModal(false)}
                  >
                    Annuler
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      {showSubmissionModal && (
        <div className="modal-backdrop fade show"></div>
      )}

      {/* Modale d'édition de Hackathon (pour staff/admin) */}
      {showEditHackathonModal && selectedHackathon && (
        <div className="modal" tabIndex="-1" style={{ display: "block" }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className={styles.modalHeader}>
                <h5 className={styles.modalTitle}>
                  Modifier le Hackathon: {editHackathonTitle}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowEditHackathonModal(false)}
                ></button>
              </div>
              <div className={styles.modalBody}>
                <form onSubmit={handleUpdateHackathon}>
                  <div className="mb-3">
                    <label htmlFor="editHackathonTitle" className={styles.formLabel}>
                      Titre du Hackathon
                    </label>
                    <input
                      type="text"
                      className={styles.formControl}
                      id="editHackathonTitle"
                      value={editHackathonTitle}
                      onChange={(e) => setEditHackathonTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label
                      htmlFor="editHackathonDescription"
                      className={styles.formLabel}
                    >
                      Description
                    </label>
                    <textarea
                      className={styles.formControl}
                      id="editHackathonDescription"
                      rows="3"
                      value={editHackathonDescription}
                      onChange={(e) =>
                        setEditHackathonDescription(e.target.value)
                      }
                      required
                    ></textarea>
                  </div>
                  <div className="mb-3">
                    <label
                      htmlFor="editHackathonStartDate"
                      className={styles.formLabel}
                    >
                      Date de début
                    </label>
                    <input
                      type="date"
                      className={styles.formControl}
                      id="editHackathonStartDate"
                      value={editHackathonStartDate}
                      onChange={(e) => setEditHackathonStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="editHackathonEndDate" className={styles.formLabel}>
                      Date de fin
                    </label>
                    <input
                      type="date"
                      className={styles.formControl}
                      id="editHackathonEndDate"
                      value={editHackathonEndDate}
                      onChange={(e) => setEditHackathonEndDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label
                      htmlFor="editHackathonSpecifications"
                      className={styles.formLabel}
                    >
                      Spécifications (Optionnel)
                    </label>
                    <textarea
                      className={styles.formControl}
                      id="editHackathonSpecifications"
                      rows="3"
                      value={editHackathonSpecifications}
                      onChange={(e) =>
                        setEditHackathonSpecifications(e.target.value)
                      }
                    ></textarea>
                  </div>
                  <div className="mb-3">
                    <label
                      htmlFor="editHackathonTeamSize"
                      className={styles.formLabel}
                    >
                      Taille d'équipe (1 à 5)
                    </label>
                    <input
                      type="number"
                      className={styles.formControl}
                      id="editHackathonTeamSize"
                      value={editHackathonTeamSize}
                      onChange={(e) =>
                        setEditHackathonTeamSize(
                          Math.max(1, Math.min(5, parseInt(e.target.value, 10)))
                        )
                      }
                      min="1"
                      max="5"
                      required
                    />
                  </div>
                  <button type="submit" className={`${styles.actionButton} ${styles.btnPrimary} me-2`}>
                    Modifier le Hackathon
                  </button>
                  <button
                    type="button"
                    className={`${styles.actionButton} ${styles.btnSecondary}`}
                    onClick={() => setShowEditHackathonModal(false)}
                  >
                    Annuler
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      {showEditHackathonModal && (
        <div className="modal-backdrop fade show"></div>
      )}
    </div>
  );
}
