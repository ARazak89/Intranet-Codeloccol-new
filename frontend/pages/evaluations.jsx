import { useEffect, useState, useCallback } from "react"; // Ajout de useCallback
import { useRouter } from "next/router";
import { getAuthToken } from "../utils/auth"; // Assurez-vous d'importer getAuthToken
import Loader from "../components/Loader";
import HtmlRenderer from "../utils/HtmlRenderer";
import styles from "../styles/evaluations.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export default function EvaluationPage() {
  const router = useRouter();
  const { evaluationId: queryEvaluationId } = router.query; // Renommer pour éviter le conflit
  const [me, setMe] = useState(null);
  const [evaluations, setEvaluations] = useState([]); // Pour stocker toutes les évaluations (staff/admin)
  const [selectedEvaluation, setSelectedEvaluation] = useState(null); // Pour le détail d'une seule évaluation (apprenant)
  const [evaluators, setEvaluators] = useState([]); // Pour la liste des évaluateurs disponibles
  const [availableSlots, setAvailableSlots] = useState([]); // Pour les slots de l'évaluateur sélectionné
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [evaluationToReassign, setEvaluationToReassign] = useState(null);
  const [selectedSlots, setSelectedSlots] = useState([]); // Changer newSlotId en selectedSlots (tableau)
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // État de chargement global
  const [token, setToken] = useState(null);
  const [
    cancelledProjectsForReassignment,
    setCancelledProjectsForReassignment,
  ] = useState([]); // Nouveau: Projets annulés pour réassignation
  const [expandedRows, setExpandedRows] = useState({}); // id d'évaluation => bool (affichage feedbacks pairs)

  // Nouveaux états pour les champs de feedback détaillés
  // const [feedbackAssiduite, setFeedbackAssiduite] = useState('');
  // const [feedbackComprehension, setFeedbackComprehension] = useState('');
  // const [feedbackSpecifications, setFeedbackSpecifications] = useState('');
  // const [feedbackMaitriseConcepts, setFeedbackMaitriseConcepts] = useState('');
  // const [feedbackCapaciteExpliquer, setFeedbackCapaciteExpliquer] = useState('');

  // État pour la date sélectionnée dans le calendrier (supprimé)
  // const [calendarDate, setCalendarDate] = useState(new Date());

  // Fonctions pour gérer les slots (utilisées pour la soumission d'évaluation par l'apprenant)
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  // const isEvaluationActive = useCallback(() => {
  //   if (!startTime || !endTime) return false;
  //   const now = new Date();
  //   const reviewWindowEnd = new Date(endTime.getTime() + 60 * 60 * 1000); // 1 heure après l'heure de fin
  //   return now >= startTime && now <= reviewWindowEnd;
  // }, [startTime, endTime]);

  const fetchData = useCallback(async () => {
    const storedToken = getAuthToken();
    if (!storedToken) {
      router.push("/login");
      return;
    }
    setToken(storedToken);
    setIsLoading(true);
    setError(null);

    try {
      const userRes = await fetch(`${API}/users/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      if (!userRes.ok) throw new Error("Failed to fetch user data");
      const userData = await userRes.json();
      setMe(userData);

      if (userData.role === "staff" || userData.role === "admin") {
        // Fetch all evaluations for staff/admin
        const allEvalsRes = await fetch(`${API}/evaluations/all-for-staff`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (!allEvalsRes.ok)
          throw new Error("Failed to fetch all evaluations for staff");
        const allEvalsData = await allEvalsRes.json();
        setEvaluations(allEvalsData);

        // Fetch all evaluators (toujours utile pour l'affichage)
        const evaluatorsRes = await fetch(`${API}/users/evaluators`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (!evaluatorsRes.ok) throw new Error("Failed to fetch evaluators");
        const evaluatorsData = await evaluatorsRes.json();
        setEvaluators(evaluatorsData);

        // Fetch cancelled projects for reassignation
        const cancelledProjectsRes = await fetch(`${API}/projects/cancelled`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (!cancelledProjectsRes.ok)
          throw new Error("Failed to fetch cancelled projects");
        const cancelledProjectsData = await cancelledProjectsRes.json();
        setCancelledProjectsForReassignment(cancelledProjectsData);
      } else if (userData.role === "apprenant") {
        // Pour l'apprenant, récupérer toutes ses évaluations (soumises par lui ou à faire par lui)
        const mySubmittedEvalRes = await fetch(`${API}/evaluations/mine`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (!mySubmittedEvalRes.ok)
          throw new Error("Failed to fetch my submitted evaluations");
        const mySubmittedEvalData = await mySubmittedEvalRes.json();

        const myPendingAsEvaluatorRes = await fetch(
          `${API}/evaluations/pending-as-evaluator`,
          { headers: { Authorization: `Bearer ${storedToken}` } }
        );
        if (!myPendingAsEvaluatorRes.ok)
          throw new Error(
            "Failed to fetch my pending evaluations as evaluator"
          );
        const myPendingAsEvaluatorData = await myPendingAsEvaluatorRes.json();

        // Fusionner les deux listes d'évaluations
        const allMyEvaluations = [
          ...mySubmittedEvalData,
          ...myPendingAsEvaluatorData,
        ];
        setEvaluations(allMyEvaluations);

        // Si un ID d'évaluation est spécifié dans l'URL, pré-sélectionner cette évaluation
        if (queryEvaluationId) {
          const preselectedEval = allMyEvaluations.find(
            (evalItem) => evalItem._id === queryEvaluationId
          );
          if (preselectedEval) {
            setSelectedEvaluation(preselectedEval);
            // Initialiser les champs de feedback si déjà existants
            // setFeedbackAssiduite(preselectedEval.feedback?.assiduite || '');
            // setFeedbackComprehension(preselectedEval.feedback?.comprehension || '');
            // setFeedbackSpecifications(preselectedEval.feedback?.specifications || '');
            // setFeedbackMaitriseConcepts(preselectedEval.feedback?.maitrise_concepts || '');
            // setFeedbackCapaciteExpliquer(preselectedEval.feedback?.capacite_expliquer || '');
            // setComments(preselectedEval.comments || ''); // Toujours initialiser les commentaires
            if (preselectedEval.slot) {
              setStartTime(new Date(preselectedEval.slot.startTime));
              setEndTime(new Date(preselectedEval.slot.endTime));
            }
          }
        }
      }
    } catch (e) {
      console.error("Error fetching data:", e);
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [router, queryEvaluationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fonction pour ouvrir le modal de réassignation
  const handleOpenReassignModal = (evaluation) => {
    setEvaluationToReassign(evaluation);
    // setNewEvaluatorId(''); // Supprimé
    setSelectedSlots([]); // Réinitialiser
    setAvailableSlots([]); // Réinitialiser
    // Appel pour charger tous les slots disponibles dès l'ouverture de la modale
    fetchAllAvailableSlots(); // Nouvelle fonction
    setShowReassignModal(true);
  };

  // Fonction pour fermer le modal de réassignation
  const handleCloseReassignModal = () => {
    setShowReassignModal(false);
    setEvaluationToReassign(null);
  };

  const toggleRowExpanded = (evaluationId) => {
    setExpandedRows((prev) => ({
      ...prev,
      [evaluationId]: !prev[evaluationId],
    }));
  };

  // Nouvelle fonction pour récupérer TOUS les slots disponibles (sans filtre par évaluateur)
  const fetchAllAvailableSlots = useCallback(async () => {
    if (!token) {
      setAvailableSlots([]);
      return;
    }
    try {
      const res = await fetch(`${API}/availability/all-available-slots`, {
        // Nouvelle route backend
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch all available slots");
      const data = await res.json();
      setAvailableSlots(data);
    } catch (e) {
      console.error("Error fetching all available slots:", e);
      setError("Erreur lors du chargement de tous les slots disponibles.");
      setAvailableSlots([]);
    }
  }, [token]);

  // Ancien useEffect pour fetchAvailableSlots, maintenant obsolète si on utilise fetchAllAvailableSlots
  // useEffect(() => {
  //   if (newEvaluatorId) {
  //     fetchAvailableSlots(newEvaluatorId);
  //   }
  // }, [newEvaluatorId, fetchAvailableSlots]);

  const handleReassignEvaluation = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    if (!evaluationToReassign || selectedSlots.length === 0) {
      setError("Veuillez sélectionner au moins un slot de disponibilité.");
      setIsLoading(false);
      return;
    }

    try {
      // Le backend devra extraire le newEvaluatorId à partir du newSlotId
      const res = await fetch(
        `${API}/evaluations/${evaluationToReassign._id}/reassign`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ newSlotIds: selectedSlots }), // Envoyer tous les newSlotIds sélectionnés
        }
      );
      const data = await res.json();
      if (res.ok) {
        setSuccess("Évaluation réassignée avec succès !");
        handleCloseReassignModal();
        // Mettre à jour le statut de l'évaluation réassignée à 'cancelled' immédiatement dans l'UI
        setEvaluations((prevEvals) =>
          prevEvals.map((evalItem) =>
            evalItem._id === evaluationToReassign._id
              ? { ...evalItem, status: "cancelled" }
              : evalItem
          )
        );
        fetchData(); // Recharger toutes les évaluations pour assurer la cohérence
      } else {
        throw new Error(
          data.error || "Échec de la réassignation de l'évaluation."
        );
      }
    } catch (e) {
      console.error("Error reassigning evaluation:", e);
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   setError(null);
  //   setSuccess(null);

  //   if (!token) {
  //     setError('Vous devez être connecté pour soumettre une évaluation.');
  //     return;
  //   }

  //   // Logique de soumission existante pour l'apprenant
  //   if (!selectedEvaluation) return;

  //   // Déterminer le statut de l'évaluation (ici, nous allons l'envoyer comme 'accepted' par défaut pour le feedback)
  //   // Si un rejet est possible via le formulaire, il faudrait ajouter un état pour cela.
  //   const status = 'accepted'; // Ou 'rejected' si le formulaire permet de le choisir

  //   try {
  //     const res = await fetch(`${API}/evaluations/${selectedEvaluation._id}/submit`, {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  //       body: JSON.stringify({
  //         status, // Envoyer le statut
  //         comments, // Commentaires généraux
  //         feedback: {
  //           assiduite: feedbackAssiduite,
  //           comprehension: feedbackComprehension,
  //           specifications: feedbackSpecifications,
  //           maitrise_concepts: feedbackMaitriseConcepts,
  //           capacite_expliquer: feedbackCapaciteExpliquer,
  //         },
  //       }),
  //     });
  //     const data = await res.json();
  //     if (res.ok) {
  //       setSuccess('Évaluation soumise avec succès !');
  //       router.push('/dashboard'); // Rediriger vers le tableau de bord après soumission
  //     } else {
  //       throw new Error(data.message || 'Échec de la soumission de l\'évaluation.');
  //     }
  //   } catch (e) {
  //     setError(e.message);
  //   }
  // };

  if (isLoading) {
    return <Loader message="Chargement des évaluations..." />;
  }

  if (!me) {
    return (
      <div className="text-center mt-5">
        <p className="lead">Non autorisé.</p>
      </div>
    );
  }

  // Rendu pour le rôle staff/admin
  if (me.role === "staff" || me.role === "admin") {
    return (
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>
            <i className="bi bi-clipboard-check"></i>
            Gestion des Évaluations
          </h1>
        </div>

        {error && (
          <div className={`${styles.alert} ${styles.alertDanger}`}>
            <i className="bi bi-exclamation-triangle-fill"></i>
            {error}
          </div>
        )}
        {success && (
          <div className={`${styles.alert} ${styles.alertSuccess}`}>
            <i className="bi bi-check-circle-fill"></i>
            {success}
          </div>
        )}

        {cancelledProjectsForReassignment.length > 0 && (
          <div className={`${styles.card} ${styles.cardWarning}`}>
            <div className={`${styles.cardHeader} ${styles.cardHeaderWarning}`}>
              <h2 className={styles.cardTitle}>
                <i className="bi bi-arrow-repeat"></i>
                Projets Annulés Nécessitant Réassignation
              </h2>
            </div>
            <div className={styles.cardBody}>
              <p className="text-muted">
                Les projets ci-dessous ont été annulés et peuvent être
                réassignés à un autre évaluateur.
              </p>
              <ul className="list-group list-group-flush">
                {cancelledProjectsForReassignment.map((project) => (
                  <li
                    key={project._id}
                    className="list-group-item d-flex justify-content-between align-items-center flex-wrap py-3"
                  >
                    <div>
                      <h5 className="mb-1 text-warning">
                        <i className="bi bi-exclamation-triangle me-2"></i>{" "}
                        Projet: {project.title}
                      </h5>
                      <small className="text-muted d-flex align-items-center mt-1">
                        <i className="bi bi-person me-1"></i> Apprenant:{" "}
                        {project.studentName || "N/A"}
                      </small>
                      <small className="text-muted d-flex align-items-center mt-1">
                        <i className="bi bi-calendar-x me-1"></i> Statut: Annulé
                      </small>
                    </div>
                    <button
                      className={styles.btnReassign}
                      onClick={() =>
                        handleOpenReassignModal({
                          _id: project._id,
                          project: { title: project.title },
                          studentName: project.studentName,
                        })
                      }
                    >
                      <i className="bi bi-arrow-repeat"></i>
                      Réassigner
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <i className="bi bi-list-check"></i>
              Toutes les Évaluations
            </h2>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th></th>
                    <th>Projet</th>
                    <th>Apprenant</th>
                    <th>Évaluateur</th>
                    <th>Statut Éval.</th>
                    <th>Statut Assign.</th>
                    <th>Date Éval.</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluations.length > 0 ? (
                    evaluations.map((evalItem) => {
                      const isLate =
                        evalItem.slot &&
                        new Date() > new Date(evalItem.slot.endTime);
                      const rowClass = isLate
                        ? styles.rowDanger
                        : evalItem.status === "cancelled"
                        ? styles.rowWarning
                        : "";
                      return (
                        <>
                          <tr key={evalItem._id} className={rowClass}>
                            <td className="text-center" style={{ width: 40 }}>
                              <button
                                className={styles.expandBtn}
                                onClick={() => toggleRowExpanded(evalItem._id)}
                                title="Afficher les feedbacks des pairs"
                              >
                                <i
                                  className={`bi ${
                                    expandedRows[evalItem._id]
                                      ? "bi-chevron-up"
                                      : "bi-chevron-down"
                                  }`}
                                ></i>
                              </button>
                              {Array.isArray(evalItem.peersFeedback) && (
                                <span
                                  className={`badge ms-1 ${
                                    evalItem.peersFeedback.length > 0
                                      ? "bg-secondary"
                                      : "bg-light text-muted"
                                  }`}
                                >
                                  {evalItem.peersFeedback.length}
                                </span>
                              )}
                            </td>
                            <td>
                              {evalItem.project?.title || "[Projet Inconnu]"}
                              {evalItem.assignment?.repoUrl && (
                                <p className="mb-0">
                                  <small>
                                    <a
                                      href={evalItem.assignment.repoUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      Dépôt GitHub
                                    </a>
                                  </small>
                                </p>
                              )}
                            </td>
                            <td>
                              {evalItem.studentName || "[Apprenant Inconnu]"}
                            </td>
                            <td>
                              {evalItem.evaluator?.name ||
                                "[Évaluateur Inconnu]"}
                            </td>
                            <td>
                              <span
                                className={`${styles.badge} ${
                                  evalItem.status === "pending"
                                    ? styles.badgePending
                                    : evalItem.status === "accepted"
                                    ? styles.badgeAccepted
                                    : evalItem.status === "rejected"
                                    ? styles.badgeRejected
                                    : evalItem.status === "cancelled"
                                    ? styles.badgeCancelled
                                    : styles.badge
                                }`}
                              >
                                <i className={`bi bi-${
                                  evalItem.status === "pending" ? "hourglass-split" :
                                  evalItem.status === "accepted" ? "check-circle" :
                                  evalItem.status === "rejected" ? "x-circle" :
                                  evalItem.status === "cancelled" ? "x-octagon" :
                                  "question-circle"
                                }`}></i>
                                {evalItem.status}
                              </span>
                              {isLate && evalItem.status === "pending" && (
                                <span className={`${styles.badge} ${styles.badgeLate}`}>
                                  <i className="bi bi-clock-fill"></i>
                                  EN RETARD
                                </span>
                              )}
                            </td>
                            <td>
                              <span
                                className={`${styles.badge} ${
                                  evalItem.assignment?.status === "assigned"
                                    ? styles.badgeAssigned
                                    : evalItem.assignment?.status === "submitted"
                                    ? styles.badgeSubmitted
                                    : evalItem.assignment?.status === "pending_review"
                                    ? styles.badgePendingReview
                                    : evalItem.assignment?.status === "approved"
                                    ? styles.badgeApproved
                                    : evalItem.assignment?.status === "rejected"
                                    ? styles.badgeRejected
                                    : styles.badge
                                }`}
                              >
                                <i className={`bi bi-${
                                  evalItem.assignment?.status === "assigned" ? "clock" :
                                  evalItem.assignment?.status === "submitted" ? "hourglass-split" :
                                  evalItem.assignment?.status === "pending_review" ? "person-workspace" :
                                  evalItem.assignment?.status === "approved" ? "check-circle" :
                                  evalItem.assignment?.status === "rejected" ? "x-circle" :
                                  "question-circle"
                                }`}></i>
                                {evalItem.assignment?.status || "N/A"}
                              </span>
                            </td>
                            <td>
                              {evalItem.slot?.startTime
                                ? new Date(
                                    evalItem.slot.startTime
                                  ).toLocaleString()
                                : "N/A"}
                            </td>
                            <td className="text-center">
                              {((isLate && evalItem.status === "pending") ||
                                evalItem.status === "cancelled") &&
                                evalItem.status !== "approved" && (
                                  <button
                                    className={styles.btnReassign}
                                    onClick={() =>
                                      handleOpenReassignModal(evalItem)
                                    }
                                  >
                                    <i className="bi bi-arrow-repeat"></i>
                                    Réassigner
                                  </button>
                                )}
                            </td>
                          </tr>
                          {expandedRows[evalItem._id] && (
                            <tr className={styles.rowExpanded}>
                              <td></td>
                              <td colSpan="7">
                                <div className="p-3 bg-light border rounded">
                                  <h6 className="mb-3 d-flex align-items-center">
                                    <i className="bi bi-people me-2"></i>{" "}
                                    Feedback de l'évaluation
                                  </h6>
                                  {/* Feedback de l'évaluation courante (évaluateur actif: staff, admin ou apprenant) */}
                                  {evalItem.feedback ||
                                  typeof evalItem.score === "number" ||
                                  evalItem.comments ? (
                                    <div className={styles.feedbackCard}>
                                      <h6 className={styles.feedbackCardTitle}>
                                        <i className="bi bi-chat-right-quote"></i>
                                        Feedback de l'évaluateur courant
                                      </h6>
                                      <div>
                                        {evalItem.feedback?.assiduite && (
                                          <div className={styles.feedbackItem}>
                                            <strong>Assiduité:</strong> {evalItem.feedback.assiduite}
                                          </div>
                                        )}
                                        {evalItem.feedback?.comprehension && (
                                          <div className={styles.feedbackItem}>
                                            <strong>Compréhension:</strong> {evalItem.feedback.comprehension}
                                          </div>
                                        )}
                                        {evalItem.feedback?.specifications && (
                                          <div className={styles.feedbackItem}>
                                            <strong>Spécifications:</strong> {evalItem.feedback.specifications}
                                          </div>
                                        )}
                                        {evalItem.feedback?.maitrise_concepts && (
                                          <div className={styles.feedbackItem}>
                                            <strong>Maîtrise des concepts:</strong> {evalItem.feedback.maitrise_concepts}
                                          </div>
                                        )}
                                        {evalItem.feedback?.capacite_expliquer && (
                                          <div className={styles.feedbackItem}>
                                            <strong>Capacité à expliquer:</strong> {evalItem.feedback.capacite_expliquer}
                                          </div>
                                        )}
                                        {typeof evalItem.score === "number" && (
                                          <div>
                                            <small>
                                              <strong>Score:</strong>{" "}
                                              <span className="badge bg-primary">
                                                {evalItem.score}/100
                                              </span>
                                            </small>
                                          </div>
                                        )}
                                        {evalItem.comments && (
                                          <div className={styles.feedbackItem}>
                                            <strong>Commentaires:</strong> {evalItem.comments}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-muted">
                                      Aucun feedback saisi par l'évaluateur
                                      courant.
                                    </p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="8" style={{ border: 'none' }}>
                        <div className={styles.emptyState}>
                          <i className="bi bi-clipboard-x"></i>
                          <p className={styles.emptyStateText}>
                            Aucune évaluation à afficher.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal de Réassignation */}
        {showReassignModal && evaluationToReassign && (
          <div className={styles.modalOverlay} onClick={handleCloseReassignModal}>
            <div className={styles.modalDialog} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h5 className={styles.modalTitle}>
                  <i className="bi bi-arrow-repeat"></i>
                  Réassigner l'Évaluation
                </h5>
                <button
                  type="button"
                  className={styles.closeBtn}
                  onClick={handleCloseReassignModal}
                >
                  <i className="bi bi-x"></i>
                </button>
              </div>
              <div className={styles.modalBody}>
                  {error && (
                    <div className={`${styles.alert} ${styles.alertDanger}`}>
                      <i className="bi bi-exclamation-triangle-fill"></i>
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className={`${styles.alert} ${styles.alertSuccess}`}>
                      <i className="bi bi-check-circle-fill"></i>
                      {success}
                    </div>
                  )}
                  <div className={styles.modalInfo}>
                  <p>
                      <strong>Projet:</strong> {evaluationToReassign.project?.title}
                  </p>
                  <p>
                      <strong>Apprenant:</strong> {evaluationToReassign.studentName}
                  </p>
                  <p>
                      <strong>Ancien Évaluateur:</strong> {evaluationToReassign.evaluator?.name || "N/A"}
                  </p>
                  </div>
                  <form onSubmit={handleReassignEvaluation}>
                    <div>
                      <label style={{ 
                        color: '#179349', 
                        fontWeight: '600', 
                        fontSize: '14px', 
                        marginBottom: '15px',
                        display: 'block'
                      }}>
                        Sélectionner deux Slots de Disponibilité
                      </label>
                      {availableSlots.length > 0 ? (
                        <div className={styles.slotList}>
                          {availableSlots.map((slot) => (
                            <label
                              key={slot._id}
                              className={`${styles.slotItem} ${
                                selectedSlots.includes(slot._id) ? styles.active : ""
                              }`}
                            >
                              <input
                                className={styles.slotCheckbox}
                                type="checkbox"
                                value={slot._id}
                                checked={selectedSlots.includes(slot._id)}
                                onChange={() => {
                                  setSelectedSlots((prevSelectedSlots) => {
                                    if (prevSelectedSlots.includes(slot._id)) {
                                      return prevSelectedSlots.filter(
                                        (id) => id !== slot._id
                                      );
                                    } else {
                                      if (prevSelectedSlots.length < 2) {
                                        return [...prevSelectedSlots, slot._id];
                                      } else {
                                        setError(
                                          "Vous ne pouvez sélectionner que deux slots."
                                        );
                                        return prevSelectedSlots;
                                      }
                                    }
                                  });
                                }}
                              />
                              <div className={styles.slotInfo}>
                                <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                                  {new Date(slot.startTime).toLocaleString()} - {new Date(slot.endTime).toLocaleString()}
                                </div>
                                <div style={{ fontSize: '13px', color: '#666' }}>
                                  <i className="bi bi-person-fill" style={{ marginRight: '5px' }}></i>
                                  Évaluateur: {slot.evaluator?.name || "N/A"}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className={styles.emptyState}>
                          <i className="bi bi-inbox"></i>
                          <p className={styles.emptyStateText}>Aucun slot disponible.</p>
                        </div>
                      )}
                    </div>
                    <button
                      type="submit"
                      className={styles.btnSubmit}
                      disabled={isLoading || selectedSlots.length !== 2}
                    >
                      {isLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          Réassignation en cours...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check-circle"></i>
                          Confirmer la Réassignation
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
        )}
      </div>
    );
  }

  // Rendu par défaut pour l'apprenant (vue d'une seule évaluation)
  if (me.role === "apprenant") {
    return (
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>
            <i className="bi bi-clipboard-check"></i>
            Mes Évaluations
          </h1>
        </div>

        {error && (
          <div className={`${styles.alert} ${styles.alertDanger}`}>
            <i className="bi bi-exclamation-triangle-fill"></i>
            {error}
          </div>
        )}
        {success && (
          <div className={`${styles.alert} ${styles.alertSuccess}`}>
            <i className="bi bi-check-circle-fill"></i>
            {success}
          </div>
        )}

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <i className="bi bi-list-check"></i>
              Toutes mes Évaluations
            </h2>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Projet</th>
                    <th>Évaluateur</th>
                    <th>Date</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluations.length > 0 ? (
                    evaluations.map((evalItem) => {
                      const slotStartTime = evalItem.slot?.startTime
                        ? new Date(evalItem.slot.startTime)
                        : null;
                      const slotEndTime = evalItem.slot?.endTime
                        ? new Date(evalItem.slot.endTime)
                        : null;
                      const isPendingAndActive =
                        evalItem.status === "pending" &&
                        slotStartTime &&
                        slotEndTime &&
                        new Date() >= slotStartTime &&
                        new Date() <= slotEndTime.getTime() + 60 * 60 * 1000;

                      let statusBadgeClass = "bg-secondary";
                      switch (evalItem.status) {
                        case "pending":
                          statusBadgeClass = "bg-info";
                          break;
                        case "accepted":
                          statusBadgeClass = "bg-success";
                          break;
                        case "rejected":
                          statusBadgeClass = "bg-danger";
                          break;
                        case "cancelled":
                          statusBadgeClass = "bg-warning text-dark";
                          break;
                        default:
                          statusBadgeClass = "bg-secondary";
                      }

                      return (
                        <tr key={evalItem._id}>
                          <td>
                            {/*<strong>
                              {evalItem.project?.title || "[Projet Inconnu]"}
                            </strong> commenter parceque dans la description des projets il y'a déja le titre*/}
                            {evalItem.project?.description && (
                              <p className="text-muted mb-0">
                                <small>
                                  <HtmlRenderer
                                    htmlContent={
                                      evalItem.project.description.substring(
                                        0,
                                        70
                                      ) + " ..."
                                    }
                                  />
                                </small>
                              </p>
                            )}
                            {evalItem.project?.repoUrl && (
                              <p className="mb-0">
                                <small>
                                  <a
                                    href={evalItem.project.repoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    Dépôt GitHub
                                  </a>
                                </small>
                              </p>
                            )}
                          </td>
                          <td>{evalItem.evaluator?.name || "N/A"}</td>
                          <td>
                            {slotStartTime
                              ? `${slotStartTime.toLocaleDateString()} de ${slotStartTime.toLocaleTimeString(
                                  [],
                                  { hour: "2-digit", minute: "2-digit" }
                                )} à ${slotEndTime.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}`
                              : "N/A"}
                          </td>
                          <td>
                            <span
                              className={`${styles.badge} ${
                                evalItem.status === "pending"
                                  ? styles.badgePending
                                  : evalItem.status === "accepted"
                                  ? styles.badgeAccepted
                                  : evalItem.status === "rejected"
                                  ? styles.badgeRejected
                                  : evalItem.status === "cancelled"
                                  ? styles.badgeCancelled
                                  : styles.badge
                              }`}
                            >
                              <i className={`bi bi-${
                                evalItem.status === "pending" ? "hourglass-split" :
                                evalItem.status === "accepted" ? "check-circle" :
                                evalItem.status === "rejected" ? "x-circle" :
                                evalItem.status === "cancelled" ? "x-octagon" :
                                "question-circle"
                              }`}></i>
                              {evalItem.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ border: 'none' }}>
                        <div className={styles.emptyState}>
                          <i className="bi bi-clipboard-x"></i>
                          <p className={styles.emptyStateText}>
                            Aucune évaluation à afficher.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Si ni staff/admin ni apprenant avec toutes les évals, et pas d'évaluation sélectionnée
  return (
    <div className={styles.container}>
      <div className={styles.emptyState} style={{ minHeight: '60vh' }}>
        <i className="bi bi-clipboard-x"></i>
        <p className={styles.emptyStateText}>
          Aucune évaluation à afficher ou non autorisé.
        </p>
      </div>
    </div>
  );
}
