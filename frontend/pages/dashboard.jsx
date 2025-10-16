import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import ProjectList from "../components/ProjectList";
import HackathonList from "../components/HackathonList";
import BadgeDisplay from "../components/BadgeDisplay";
import ProgressTracker from "../components/ProgressTracker";
import React from "react"; // Added for React.Fragment
import { getAuthToken } from "../utils/auth";
import UserSummaryCard from "../components/UserSummaryCard"; // Importation du nouveau composant
import Loader from "../components/Loader";
import styles from "../styles/dashboard.module.css";
// import { levelToModuleMap } from "../utils/moduleHelper"; // Supprimez cette ligne
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import dynamic from 'next/dynamic';
import Modal from 'react-modal';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'; // Assurez-vous que ce plugin est bien importé
import 'dayjs/locale/fr'; // Assurez-vous d'importer la locale si vous formatez en français

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter); // Assurez-vous que ce plugin est bien étendu

// Définir la locale globale pour Day.js
dayjs.locale('fr');

const TIMEZONE = 'Africa/Niamey';

// const ActivityLog = dynamic(() => import('../components/ActivityLog'), { ssr: false });

// Fonction utilitaire pour s'assurer que les propriétés sont des tableaux
const sanitizeProjectArrays = (project) => ({
  ...project,
  objectives: project.objectives || [],
  specifications: project.specifications || [],
  exerciseStatements: project.exerciseStatements || [],
  resourceLinks: project.resourceLinks || [],
});

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export default function Dashboard() {
  const [me, setMe] = useState(null);
  const [projects, setProjects] = useState([]);
  const [hackathons, setHackathons] = useState([]);
  const [badges, setBadges] = useState([]);
  const [progress, setProgress] = useState(null);
  const [mySubmittedEvaluations, setMySubmittedEvaluations] = useState([]); // Pour les projets que j'ai soumis
  const [evaluationsAsEvaluator, setEvaluationsAsEvaluator] = useState([]); // Pour les projets que je dois évaluer
  const [showCreateSlotModal, setShowCreateSlotModal] = useState(false); // État de la modale
  const [slotDate, setSlotDate] = useState("");
  const [slotStartTime, setSlotStartTime] = useState("09:00"); // Par défaut 9h
  const [slotEndTime, setSlotEndTime] = useState("09:45"); // Par défaut 9h45
  const [showEvaluationModal, setShowEvaluationModal] = useState(false); // Nouvel état pour la modale d'évaluation
  const [currentEvaluationToSubmit, setCurrentEvaluationToSubmit] =
    useState(null); // Évaluation en cours de soumission
  const [upcomingEvaluations, setUpcomingEvaluations] = useState([]); // Nouvel état pour les évaluations à venir
  const [projectsAwaitingStaffReview, setProjectsAwaitingStaffReview] =
    useState([]); // Nouvel état pour les projets en attente de révision du personnel
  const [learners, setLearners] = useState([]); // Nouveau: Liste des apprenants pour le staff/admin
  const [allProjects, setAllProjects] = useState([]); // Nouveau: Liste de tous les projets pour le staff/admin
  const [allPendingEvaluationsForStaff, setAllPendingEvaluationsForStaff] =
    useState([]); // Nouveau: Toutes les évaluations en attente pour le staff
  const [expandedLearners, setExpandedLearners] = useState({}); // État pour gérer les détails des apprenants déroulés
  const [expandedProjectEvaluations, setExpandedProjectEvaluations] = useState(
    {}
  ); // Nouveau: État pour gérer les détails des évaluations de projet déroulées pour le staff/admin
  const [showAddProjectModal, setShowAddProjectModal] = useState(false); // Nouvel état pour la modale d'ajout de projet
  const [showEditProjectModal, setShowEditProjectModal] = useState(false); // Nouvel état pour la modale de modification de projet
  const [showDeleteProjectModal, setShowDeleteProjectModal] = useState(false); // Nouvel état pour la modale de suppression de projet
  const [currentProjectToEdit, setCurrentProjectToEdit] = useState(null); // Projet actuellement sélectionné pour la modification
  const [currentProjectToDelete, setCurrentProjectToDelete] = useState(null); // Projet actuellement sélectionné pour la suppression
  // États pour le formulaire d'ajout/modification de projet
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectRepoUrl, setProjectRepoUrl] = useState(""); // Pour les projets d'apprenant
  const [projectDemoVideoUrl, setProjectDemoVideoUrl] = useState("");
  const [projectSpecifications, setProjectSpecifications] = useState("");
  const [projectSize, setProjectSize] = useState("short");

  const [myProjects, setMyProjects] = useState([]); // Nouvel état pour les projets de l'apprenant
  const [confirmProjectTitle, setConfirmProjectTitle] = useState(""); // Nouvel état pour la double confirmation
  const [showDeleteSlotModal, setShowDeleteSlotModal] = useState({
    show: false,
    slotId: null,
    slotStartTime: null,
  }); // Nouvel état pour le modal de suppression de slot

  const [feedback, setFeedback] = useState({
    assiduite: "",
    comprehension: "",
    specifications: "",
    maitrise_concepts: "",
    capacite_expliquer: "",
  });
  const [error, setError] = useState(null); // Ajoutez cet état si non présent
  const [success, setSuccess] = useState(null); // Ajoutez cet état si non présent
  const [isLoading, setIsLoading] = useState(true); // Nouvel état de chargement
  const [myCreatedSlots, setMyCreatedSlots] = useState([]); // Nouveau: Slots créés par l'apprenant
  const [token, setToken] = useState(null); // Gérer le token localement
  const router = useRouter();

  // Nouveaux états pour l'ajout d'utilisateur (staff/admin)
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("apprenant"); // Rôle par défaut

  // Nouveaux états pour la soumission de projet de Hackathon
  const [showSubmitHackathonProjectModal, setShowSubmitHackathonProjectModal] =
    useState(false);
  const [currentHackathonToSubmit, setCurrentHackathonToSubmit] =
    useState(null);
  const [currentTeamToSubmit, setCurrentTeamToSubmit] = useState(null);
  const [hackathonSubmissionRepoUrl, setHackathonSubmissionRepoUrl] =
    useState("");

  // État pour s'assurer que le composant est monté côté client
  const [isClient, setIsClient] = useState(false);
  const [expandedFeedback, setExpandedFeedback] = useState({}); // Nouveau: État pour gérer l'expansion du feedback
  const [expandedSlots, setExpandedSlots] = useState({}); // Nouveau: État pour gérer l'expansion des slots

  const [showReassignModal, setShowReassignModal] = useState(false); // État pour contrôler la visibilité de la modale de réassignation
  const [currentEvaluationToReassign, setCurrentEvaluationToReassign] =
    useState(null); // L'évaluation sélectionnée pour la réassignation
  const [reassignSlotDate, setReassignSlotDate] = useState(""); // Date sélectionnée pour les nouveaux slots
  const [availableSlotsForReassign, setAvailableSlotsForReassign] = useState(
    []
  ); // Slots disponibles pour la réassignation
  const [selectedSlots, setSelectedSlots] = useState([]); // IDs des slots sélectionnés pour la réassignation

  const formatUTCHourMinute = (date) => {
    if (!date) return "N/A";
    // Interpréter la date comme UTC, puis la convertir en heure locale de Niamey
    return dayjs.utc(date).tz(TIMEZONE).format('HH[h]mm');
  };

  const handleCloseDeleteSlotModal = () => {
    setShowDeleteSlotModal({ show: false, slotId: null, slotStartTime: null });
  };

  // Fonctions pour la gestion des notifications
  //onst handleOpenNotificationModal = (notification) => {
  // setCurrentNotification(notification);
  // setShowNotificationModal(true);
  //};

  // const handleCloseNotificationModal = async () => {
  // Marquer la notification comme lue sur le backend
  // if (currentNotification && token) {
  //   try {
  //     await fetch(`${API}/notifications/${currentNotification._id}/read`, {
  //       method: 'PUT',
  //       headers: { Authorization: `Bearer ${token}` },
  //     });
  //     fetchData(); // Recharger les notifications pour mettre à jour la liste
  //   } catch (error) {
  //     console.error("Error marking notification as read:", error);
  //   }
  // }
  // setShowNotificationModal(false);
  // setCurrentNotification(null);
  //  };

  // Utilisez useCallback pour memoizer fetchData et la rendre accessible
  const fetchData = useCallback(async () => {
    if (!token) return; // Ne pas exécuter si le token est null
    setIsLoading(true); // Début du chargement
    try {
      // Fetch user data
      // console.log('Fetching user data...');
      const userRes = await fetch(`${API}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!userRes.ok) {
        // console.log('User data fetch failed. Status:', userRes.status);
        const errorData = await userRes.json();
        throw new Error(
          errorData.error || "Échec du chargement des données utilisateur."
        );
      }
      const userData = await userRes.json();
      setMe(userData);
      // setProjects(userData.projects || []); // Ancienne ligne, non utilisée directement pour les apprenants
      setHackathons(userData.hackathons || []);
      setBadges(userData.badges || []);
      setProgress(userData.progress || null);

      // Fetch evaluations for my submitted projects (for apprenant only)
      if (userData.role === "apprenant") {
        // console.log('Fetching my submitted evaluations...');
        const mySubmittedEvalRes = await fetch(`${API}/evaluations/mine`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (mySubmittedEvalRes.ok) {
          const mySubmittedEvalData = await mySubmittedEvalRes.json();
          setMySubmittedEvaluations(mySubmittedEvalData);
        } else {
          // console.log('My submitted evaluations fetch failed. Status:', mySubmittedEvalRes.status);
          const errorData = await mySubmittedEvalRes.json();
          throw new Error(
            errorData.error ||
              "Échec du chargement de mes évaluations soumises."
          );
        }
      }

      // Fetch projects for the current student (assigned, pending, or approved)
      if (userData.role === "apprenant") {
        // console.log('Fetching my projects...');
        const myProjectsRes = await fetch(`${API}/projects/my-projects`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (myProjectsRes.ok) {
          const rawMyProjectsData = await myProjectsRes.json();

          // Les projets reçus sont déjà filtrés pour l'utilisateur et contiennent seulement l'assignation pertinente
          // Nous devons formater ces données pour qu'elles soient compatibles avec l'UI existante si nécessaire
          const formattedStudentProjects = rawMyProjectsData.map((project) => {
            const sanitizedProject = sanitizeProjectArrays(project);
            // Définir le type basé sur assignmentStatus
            let type = "my_project";
            if (sanitizedProject.assignmentStatus === "submitted") {
              type = "to_evaluate"; // Si l'apprenant a soumis, il peut aussi être évaluateur peer
            }
            return { ...sanitizedProject, type };
          });

          // Filtrer et trier les projets
          const myAssignedProjects = formattedStudentProjects.sort(
            (a, b) => (a.order || 0) - (b.order || 0)
          );
          const projectsToEvaluateAsApprenant = formattedStudentProjects
            .filter((p) => p.type === "to_evaluate")
            .sort((a, b) => (a.order || 0) - (b.order || 0));

          setMyProjects(myAssignedProjects);
          setEvaluationsAsEvaluator((prevEvals) => [
            ...prevEvals,
            ...projectsToEvaluateAsApprenant,
          ]); // Ajouter aux évaluations existantes
        } else {
          // console.log('My projects fetch failed. Status:', myProjectsRes.status);
          const errorData = await myProjectsRes.json();
          throw new Error(
            errorData.error || "Échec du chargement de mes projets."
          );
        }
      }

      // Fetch pending evaluations as an evaluator (for all roles that can evaluate)
      // Cette section devrait maintenant compléter les évaluations à faire pour les apprenants si elles viennent d'autres sources que my-projects
      // console.log('Fetching pending evaluations as evaluator...');
      const evalAsEvaluatorRes = await fetch(
        `${API}/evaluations/pending-as-evaluator`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (evalAsEvaluatorRes.ok) {
        const evalAsEvaluatorData = await evalAsEvaluatorRes.json();
        // Nous allons remplacer complètement l'état evaluationsAsEvaluator avec les nouvelles données
        setEvaluationsAsEvaluator(evalAsEvaluatorData);
        setUpcomingEvaluations(evalAsEvaluatorData); // upcomingEvaluations est la même liste pour l'instant
      } else {
        // console.log('Pending evaluations as evaluator fetch failed. Status:', evalAsEvaluatorRes.status);
        const errorData = await evalAsEvaluatorRes.json();
        throw new Error(
          errorData.error || "Échec du chargement des évaluations à réaliser."
        );
      }

      // Fetch all pending evaluations for staff/admin
      if (userData.role === "staff" || userData.role === "admin") {
        // console.log('Fetching all pending evaluations for staff...');
        const allPendingEvalsRes = await fetch(
          `${API}/evaluations/all-for-staff`,
          { headers: { Authorization: `Bearer ${token}` } }
        ); // Mise à jour de l'URL
        if (allPendingEvalsRes.ok) {
          const allPendingEvalsData = await allPendingEvalsRes.json();
          setAllPendingEvaluationsForStaff(allPendingEvalsData);
        } else {
          // console.log('All pending evaluations for staff fetch failed. Status:', allPendingEvalsRes.status);
          const errorData = await allPendingEvalsRes.json();
          throw new Error(
            errorData.error ||
              "Échec du chargement de toutes les évaluations en attente pour le staff."
          );
        }
      }

      // Fetch my created slots (for apprenant only, if they are also evaluators)
      if (userData.role === "apprenant") {
        // console.log('Fetching my created slots...');
        const mySlotsRes = await fetch(`${API}/availability/mine`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (mySlotsRes.ok) {
          const mySlotsData = await mySlotsRes.json();
          setMyCreatedSlots(mySlotsData);
        } else {
          // console.log('My created slots fetch failed. Status:', mySlotsRes.status);
          const errorData = await mySlotsRes.json();
          throw new Error(
            errorData.error ||
              "Échec du chargement de mes slots de disponibilité."
          );
        }
      }

      // Fetch projects awaiting staff review (for staff/admin only)
      if (userData.role === "staff" || userData.role === "admin") {
        // console.log('Fetching projects awaiting staff review...');
        const staffReviewRes = await fetch(
          `${API}/projects/awaiting-staff-review`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (staffReviewRes.ok) {
          const staffReviewData = await staffReviewRes.json();
          console.log("Projects awaiting staff review data:", staffReviewData); // Ajout du console.log
          // Les données sont déjà formatées par le backend pour inclure les détails des assignations
          const sanitizedStaffReviewData = staffReviewData.map(
            (assignment) => ({
              ...assignment, // L'assignation est déjà fusionnée avec le projet maître
              student: assignment.student
                ? {
                    _id: assignment.student._id,
                    name: assignment.student.name,
                    email: assignment.student.email,
                  }
                : null,
              evaluations: (assignment.evaluations || []).map((evalItem) => ({
                ...evalItem,
                evaluator: evalItem.evaluator
                  ? {
                      _id: evalItem.evaluator._id,
                      name: evalItem.evaluator.name,
                    }
                  : null,
              })),
            })
          );
          setProjectsAwaitingStaffReview(sanitizedStaffReviewData);
        } else {
          // console.log('Projects awaiting staff review fetch failed. Status:', staffReviewRes.status);
          const errorData = await staffReviewRes.json();
          throw new Error(
            errorData.error ||
              "Échec du chargement des projets en attente de révision du personnel."
          );
        }
      }

      // Fetch list of learners for staff/admin
      if (userData.role === "staff" || userData.role === "admin") {
        // console.log('Fetching learners list...');
        const learnersRes = await fetch(`${API}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (learnersRes.ok) {
          const learnersData = await learnersRes.json();
          setLearners(learnersData);
        } else {
          // console.log('Learners list fetch failed. Status:', learnersRes.status);
          const errorData = await learnersRes.json();
          throw new Error(
            errorData.error || "Échec du chargement de la liste des apprenants."
          );
        }
      }

      // Fetch all projects (master projects with assignments) for staff/admin
      if (userData.role === "staff" || userData.role === "admin") {
        // console.log('Fetching all projects...');
        const allProjectsRes = await fetch(`${API}/projects/all`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (allProjectsRes.ok) {
          const rawAllProjectsData = await allProjectsRes.json();
          // Assainir les projets maîtres et leurs assignations
          const sanitizedAllProjects = rawAllProjectsData.map((project) => ({
            ...project,
            objectives: project.objectives || [],
            specifications: project.specifications || [],
            exerciseStatements: project.exerciseStatements || [],
            resourceLinks: project.resourceLinks || [],
            assignments: (project.assignments || []).map((assign) => ({
              ...assign,
              student: assign.student
                ? {
                    _id: assign.student._id,
                    name: assign.student.name,
                    email: assign.student.email,
                  }
                : null, // S'assurer que student est un objet
              evaluations: (assign.evaluations || []).map((evalItem) => ({
                ...evalItem,
                evaluator: evalItem.evaluator
                  ? {
                      _id: evalItem.evaluator._id,
                      name: evalItem.evaluator.name,
                    }
                  : null,
              })),
            })),
          }));
          setAllProjects(sanitizedAllProjects);
        } else {
          // console.log('All projects fetch failed. Status:', allProjectsRes.status);
          const errorData = await allProjectsRes.json();
          throw new Error(
            errorData.error ||
              "Échec du chargement de la liste de tous les projets."
          );
        }
      }

      // Fetch notifications
      // console.log('Fetching notifications...');
      const notifRes = await fetch(`${API}/notifications/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!notifRes.ok) {
        // console.log('Notifications fetch failed. Status:', notifRes.status);
        const errorData = await notifRes.json();
        throw new Error(
          errorData.error || "Échec du chargement des notifications."
        );
      }
      const notifData = await notifRes.json();
      const newSlotBookedNotifications = notifData.filter(
        (notif) => !notif.read
      ); // Afficher toutes les nouvelles notifications non lues
      if (newSlotBookedNotifications.length > 0) {
        // setNotifications(newSlotBookedNotifications); // Mettre à jour l'état des notifications
      }
    } catch (e) {
      console.error("Error fetching dashboard data:", e);
      setError("Échec du chargement des données du tableau de bord.");
      // Gérer l'erreur de manière appropriée, peut-être déconnecter l'utilisateur
    } finally {
      setIsLoading(false); // Fin du chargement
    }
  }, [
    token,
    setMe,
    setHackathons,
    setBadges,
    setProgress,
    setMySubmittedEvaluations,
    setEvaluationsAsEvaluator,
    setUpcomingEvaluations,
    setMyCreatedSlots,
    setError,
    setIsLoading,
    setProjectsAwaitingStaffReview,
    setLearners,
    setAllProjects,
    setAllPendingEvaluationsForStaff,
    setMyProjects,
  ]); // Suppression de handleFinalStaffReview

  // Fonction pour gérer l'évaluation finale par le personnel
  const handleFinalStaffReview = useCallback(
    async (projectId, assignmentId, status) => {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      if (!token) {
        setError("Vous devez être connecté pour effectuer cette action.");
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API}/projects/${projectId}/final-review`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ assignmentId, status }),
        });

        const data = await res.json();

        if (res.ok) {
          setSuccess(data.message);
          fetchData();
        } else {
          setError(data.error || "Échec de l'évaluation finale.");
        }
      } catch (e) {
        console.error("Error during final staff evaluation:", e);
        setError("Erreur lors de la communication avec le serveur.");
      } finally {
        setIsLoading(false);
      }
    },
    [token, setIsLoading, setError, setSuccess, fetchData]
  );

  useEffect(() => {
    // Ceci s'exécute uniquement côté client après le premier rendu
    setIsClient(true);

    const initializeData = async () => {
      const storedToken = getAuthToken();

      if (!storedToken) {
        // Si aucun token n'est trouvé, rediriger vers la page de connexion
        if (router.pathname !== "/login") {
          router.push("/login");
        }
        setIsLoading(false);
        return;
      }

      // Gérer le jeton OAuth de l'URL si applicable
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const oauthToken = urlParams.get("token");
        if (oauthToken) {
          localStorage.setItem("token", oauthToken);
          setToken(oauthToken);
          router.replace("/dashboard", undefined, { shallow: true });
          return;
        }
      }

      // Si un token est présent (soit stocké, soit via OAuth) et n'a pas encore été défini dans l'état
      if (storedToken && !token) {
        setToken(storedToken);
      }
    };

    // Exécuter l'initialisation au montage ou si le token change
    initializeData();
  }, [router, token, setIsLoading, setError, setSuccess]); // Suppression de fetchData des dépendances pour éviter une boucle

  // Un useEffect séparé pour appeler fetchData une fois que le token est disponible
  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, fetchData]);

  // Rendre null si pas encore côté client pour éviter les problèmes d'hydratation
  if (!isClient) {
    return null;
  }

  const handleCreateSlot = async (e) => {
    e.preventDefault();
    // Réinitialiser les messages d'erreur/succès précédents
    setError(null);
    setSuccess(null);

    if (!token) {
      setError("Vous devez être connecté pour créer un slot.");
      return;
    }

    if (!slotDate || !slotStartTime) {
      setError("Veuillez sélectionner une date et une heure de début.");
      setIsLoading(false);
      return;
    }

    try {
      const localDateTime = dayjs.tz(`${slotDate}T${slotStartTime}`, TIMEZONE);
      if (!localDateTime.isValid()) {
        setError("La date ou l'heure du slot est invalide.");
        setIsLoading(false);
        return;
      }

      const startTimeUTC = localDateTime.utc().toISOString();

      const res = await fetch(`${API}/availability`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ startTime: startTimeUTC }),
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess("Slot de disponibilité créé avec succès !");
        setShowCreateSlotModal(false); // Fermer la modale
        setSlotDate(""); // Réinitialiser le formulaire
        setSlotStartTime("09:00");
        setSlotEndTime("09:45");
        fetchData(); // Recharger les données pour inclure le nouveau slot
      } else {
        throw new Error(
          data.error || data.message || "Échec de la création du slot."
        );
      }
    } catch (e) {
      console.error("Error creating availability slot:", e);
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSlot = async () => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    if (!token || !showDeleteSlotModal.slotId) {
      setError("Impossible de supprimer le slot: informations manquantes.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `${API}/availability/${showDeleteSlotModal.slotId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();

      if (res.ok) {
        setSuccess("Slot de disponibilité supprimé avec succès !");
        setShowDeleteSlotModal({
          show: false,
          slotId: null,
          slotStartTime: null,
        }); // Fermer la modale
        fetchData(); // Recharger les données pour mettre à jour la liste des slots
      } else {
        throw new Error(data.error || "Échec de la suppression du slot.");
      }
    } catch (e) {
      console.error("Error deleting availability slot:", e);
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEvaluationModal = (evaluation) => {
    setCurrentEvaluationToSubmit(evaluation);
    setFeedback({
      assiduite: "",
      comprehension: "",
      specifications: "",
      maitrise_concepts: "",
      capacite_expliquer: "",
    });
    setShowEvaluationModal(true);
  };

  const handleCloseEvaluationModal = () => {
    setShowEvaluationModal(false);
    setCurrentEvaluationToSubmit(null);
    setFeedback({
      assiduite: "",
      comprehension: "",
      specifications: "",
      maitrise_concepts: "",
      capacite_expliquer: "",
    });
    setShowEvaluationModal(false);
  };

  const handleFeedbackChange = (e) => {
    const { name, value } = e.target;
    setFeedback((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitFeedback = async (status) => {
    if (!currentEvaluationToSubmit) return;

    if (status === "accepted") {
      const feedbackKeys = [
        "assiduite",
        "comprehension",
        "specifications",
        "maitrise_concepts",
        "capacite_expliquer",
      ];
      const allFeedbackProvided = feedbackKeys.every(
        (key) => feedback[key] && feedback[key].trim() !== ""
      );
      if (!allFeedbackProvided) {
        setError(
          "Tous les champs de feedback sont obligatoires pour accepter le projet."
        );
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(
        `${API}/evaluations/${currentEvaluationToSubmit._id}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ feedback, status }),
        }
      );

      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message);
        fetchData(); // Refresh data to update evaluation lists
        handleCloseEvaluationModal();
      } else {
        setError(data.error || "Échec de la soumission de l'évaluation.");
      }
    } catch (e) {
      setError(e.message || "Erreur lors de la communication avec le serveur.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour gérer l'ajout d'un nouveau projet
  const handleAddProject = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const res = await fetch(`${API}/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: projectTitle,
          description: projectDescription,
          demoVideoUrl: projectDemoVideoUrl,
          specifications: projectSpecifications,
          size: projectSize,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Projet ajouté avec succès !");
        setShowAddProjectModal(false);
        // Réinitialiser les champs du formulaire
        setProjectTitle("");
        setProjectDescription("");
        setProjectDemoVideoUrl("");
        setProjectSpecifications("");
        setProjectSize("short");
        fetchData(); // Recharger la liste des projets
      } else {
        throw new Error(data.error || "Échec de l ajout du projet.");
      }
    } catch (e) {
      console.error("Error adding project:", e);
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour gérer la modification d'un projet
  const handleEditProject = (project) => {
    setCurrentProjectToEdit(project);
    setProjectTitle(project.title);
    setProjectDescription(project.description);
    setProjectRepoUrl(project.repoUrl || ""); // Si c'est un projet d'apprenant
    setProjectDemoVideoUrl(project.demoVideoUrl || "");
    setProjectSpecifications(project.specifications || "");
    setProjectSize(project.size || "short");
    setShowEditProjectModal(true);
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    if (!currentProjectToEdit) return;

    try {
      const res = await fetch(`${API}/projects/${currentProjectToEdit._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: projectTitle,
          description: projectDescription,
          repoUrl: currentProjectToEdit.student ? projectRepoUrl : undefined, // N'envoyer repoUrl que pour les projets d'apprenant
          demoVideoUrl: projectDemoVideoUrl,
          specifications: projectSpecifications,
          size: projectSize,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Projet mis à jour avec succès !");
        setShowEditProjectModal(false);
        setCurrentProjectToEdit(null);
        // Réinitialiser les champs du formulaire
        setProjectTitle("");
        setProjectDescription("");
        setProjectRepoUrl("");
        setProjectDemoVideoUrl("");
        setProjectSpecifications("");
        setProjectSize("short");
        fetchData(); // Recharger la liste des projets
      } else {
        throw new Error(data.error || "Échec de la mise à jour du projet.");
      }
    } catch (e) {
      console.error("Error updating project:", e);
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour gérer la suppression d'un projet
  const handleDeleteProject = (projectId) => {
    // Trouver le projet à supprimer pour afficher son titre dans la modale de confirmation
    const project = allProjects.find((p) => p._id === projectId);
    if (project) {
      setCurrentProjectToDelete(project);
      setShowDeleteProjectModal(true);
    }
  };

  const handleDeleteProjectConfirmed = async (projectId) => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const res = await fetch(`${API}/projects/${projectId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Projet supprimé avec succès !");
        setShowDeleteProjectModal(false);
        setCurrentProjectToDelete(null);
        fetchData(); // Recharger la liste des projets
      } else {
        throw new Error(data.error || "Échec de la suppression du projet.");
      }
    } catch (e) {
      console.error("Error deleting project:", e);
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const res = await fetch(`${API}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess("Utilisateur ajouté avec succès !");
        setShowAddUserModal(false);
        // Réinitialiser les champs du formulaire
        setNewUserName("");
        setNewUserEmail("");
        setNewUserPassword("");
        setNewUserRole("apprenant");
        fetchData(); // Recharger les données pour inclure le nouvel utilisateur
      } else {
        throw new Error(data.error || "Échec de l'ajout de l'utilisateur.");
      }
    } catch (e) {
      console.error("Error adding user:", e);
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour gérer l'affichage de la modale de soumission de projet de Hackathon
  const handleShowSubmitHackathonModal = (hackathon, team) => {
    setCurrentHackathonToSubmit(hackathon);
    setCurrentTeamToSubmit(team);
    setHackathonSubmissionRepoUrl("");
    setShowSubmitHackathonProjectModal(true);
  };

  // Fonction pour fermer la modale de soumission de projet de Hackathon
  const handleCloseSubmitHackathonModal = () => {
    setShowSubmitHackathonProjectModal(false);
    setCurrentHackathonToSubmit(null);
    setCurrentTeamToSubmit(null);
    setHackathonSubmissionRepoUrl("");
  };

  // Fonction pour soumettre le projet de Hackathon
  const handleSubmitHackathonProject = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    if (
      !currentHackathonToSubmit ||
      !currentTeamToSubmit ||
      !hackathonSubmissionRepoUrl
    ) {
      setError(
        "Veuillez remplir tous les champs requis pour soumettre le projet."
      );
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `${API}/hackathons/${currentHackathonToSubmit._id}/submit-project`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            teamId: currentTeamToSubmit._id,
            repoUrl: hackathonSubmissionRepoUrl,
          }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message);
        handleCloseSubmitHackathonModal();
        fetchData(); // Recharger les données du tableau de bord pour refléter la soumission
      } else {
        throw new Error(
          data.error || "Échec de la soumission du projet de Hackathon."
        );
      }
    } catch (e) {
      console.error("Error submitting hackathon project:", e);
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!token)
    return (
      <div className="text-center mt-5">
        <p className="lead">Veuillez vous connecter.</p>
      </div>
    );

  if (isLoading) {
    return <Loader message="Chargement du tableau de bord..." />;
  }

  return (
    <div className={`${styles.dashboardContainer} container-fluid pt-5`}>
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
      
      {me && (
        <div className={styles.headerFlexContainer}>
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>
                <i className="bi bi-speedometer2"></i>
                Tableau de bord
              </h1>
              <p>
                Bienvenue sur votre espace personnel CodeLoccol. Consultez vos projets en cours, suivez vos évaluations, gérez vos disponibilités et accédez à toutes vos activités pédagogiques. Restez à jour avec vos notifications et progressez dans votre parcours de formation.
              </p>
            </div>
          </div>
            <UserSummaryCard
              me={me}
              onShowCreateSlotModal={() => setShowCreateSlotModal(true)}
              onShowAddUserModal={() => setShowAddUserModal(true)}
            />
          </div>
      )}

      {me && me.role === "apprenant" && (
        <ProgressTracker
          level={me.level || 1} // Utilisez le niveau de l'utilisateur, par défaut à 1
          daysRemaining={me.daysRemaining || 0}
          progress={{
            currentProject: me.totalProjectsCompleted || 0, // Utilisez totalProjectsCompleted
            totalProjects: me.progress.totalProjectsInModule || 1, // Utiliser la progression par module pour le dashboard
          }}
          // currentModuleName={levelToModuleMap[me.level] || "Module Inconnu"} // Supprimez ou commentez cette ligne
        />
      )}


  {/* Section Hackathons et Badges (pour apprenant) */}
  {me && me.role === "apprenant" && (
        <div className="row mb-4">
          <div className="col-lg-6 mb-4">
            <HackathonList
              hackathons={hackathons}
              me={me}
              onShowSubmitHackathonModal={handleShowSubmitHackathonModal}
            />
          </div>
          <div className="col-lg-6 mb-4">
            <BadgeDisplay badges={badges} />
          </div>
        </div>
      )}


      {/* Nouveau: Section pour les slots que j'ai créés */}
      {me && me.role === "apprenant" && myCreatedSlots.length > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            <div className={styles.cardGreen}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <i className="bi bi-calendar-check"></i>
                  Mes Slots de Disponibilité
                </h2>
                <span className={styles.sectionCount}>{myCreatedSlots.filter((slot) => {
                    const slotEndTime = dayjs.utc(slot.endTime);
                    const oneHourAfterEndTime = slotEndTime.add(1, 'hour');
                    return dayjs.utc().isBefore(oneHourAfterEndTime); // Utilisation de Day.js pour la comparaison
                  }).length}</span>
              </div>
              <div className="list-group list-group-flush">
                {myCreatedSlots
                  .filter((slot) => {
                    const slotEndTime = dayjs.utc(slot.endTime);
                    const oneHourAfterEndTime = slotEndTime.add(1, 'hour');
                    const currentTime = dayjs.utc(); // Pas d'ajustement manuel ici
                    return currentTime.isBefore(oneHourAfterEndTime);
                  })
                  .map((slot) => (
                    <div key={slot._id} className={styles.listItem}>
                      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                        <div className="flex-grow-1">
                          <h5 className={styles.listItemTitle}>
                            <i className="bi bi-calendar-event"></i>
                            {dayjs.utc(slot.startTime).tz(TIMEZONE).format('DD/MM/YYYY')} de{" "}
                            {formatUTCHourMinute(slot.startTime)} à{" "}
                            {formatUTCHourMinute(slot.endTime)}
                          </h5>
                          <div className="d-flex align-items-center gap-2 mt-2">
                            {slot.isBooked ? (
                              <span className={`${styles.badge} ${styles.badgeGreen}`}>
                                <i className="bi bi-person-check-fill"></i>
                                Réservé
                              </span>
                            ) : (
                              <button
                                className={`${styles.btnSmall} ${styles.btnDanger}`}
                                onClick={() =>
                                  setShowDeleteSlotModal({
                                    show: true,
                                    slotId: slot._id,
                                    slotStartTime: slot.startTime,
                                  })
                                }
                              >
                                <i className="bi bi-trash"></i>
                                Supprimer
                              </button>
                            )}
                            <button
                              className={styles.expandButton}
                              onClick={() =>
                                setExpandedSlots((prev) => ({
                                  ...prev,
                                  [slot._id]: !prev[slot._id],
                                }))
                              }
                              aria-expanded={!!expandedSlots[slot._id]}
                              aria-controls={`slot-details-${slot._id}`}
                            >
                              <i className={`bi bi-chevron-${expandedSlots[slot._id] ? "up" : "down"}`}></i>
                            </button>
                          </div>
                          </div>
                        </div>
                        {expandedSlots[slot._id] && (
                        <div className={styles.expandedContent} id={`slot-details-${slot._id}`}>
                            {slot.isBooked ? (
                            <div className={styles.projectInfo}>
                              <div className={styles.projectInfoItem}>
                                <i className="bi bi-person-fill"></i>
                                Réservé par: <strong>{slot.bookedByStudent ? slot.bookedByStudent.name : "[Utilisateur inconnu]"}</strong>
                              </div>
                              <div className={styles.projectInfoItem}>
                                <i className="bi bi-journal-text"></i>
                                Pour le projet: <strong>{slot.bookedForProject ? slot.bookedForProject.title : "[Projet inconnu]"}</strong>
                              </div>
                            </div>
                          ) : (
                            <div className={styles.projectInfoItem}>
                              <i className="bi bi-check-circle"></i>
                              Ce slot est actuellement disponible.
                          </div>
                        )}
                          <div className={styles.projectInfoItem}>
                            <i className="bi bi-info-circle"></i>
                            Créé le: {dayjs.utc(slot.createdAt).tz(TIMEZONE).format('DD/MM/YYYY HH[h]mm')}
                      </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section des évaluations de MES PROJETS SOUMIS */}
      {me &&
        me.role === "apprenant" &&
        myProjects.filter(
          (p) =>
            p.assignmentStatus === "submitted" ||
            p.assignmentStatus === "pending_review"
        ).length > 0 && (
          <div className="row mb-4">
            <div className="col-12">
              <div className={styles.cardOrange}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    <i className="bi bi-hourglass-split"></i>
                    Projets en Cours d'Évaluation
                  </h2>
                  <span className={styles.sectionCount}>
                    {myProjects.filter((p) => p.assignmentStatus === "submitted" || p.assignmentStatus === "pending_review").length}
                  </span>
                </div>

                <div>
                  {myProjects
                    .filter(
                      (p) =>
                        p.assignmentStatus === "submitted" ||
                        p.assignmentStatus === "pending_review"
                    )
                    .map((project) => (
                      <div key={project.assignmentId} className={styles.projectCard}>
                        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                          <div className="flex-grow-1">
                            <h5 className={styles.projectTitle}>
                              <i className="bi bi-journal-text"></i>
                              {project.title}
                              {project.assignmentStatus === "submitted" && (
                                <span className={`${styles.statusBadge} ${styles.statusSubmitted}`}>
                                  <i className="bi bi-hourglass-split"></i>
                                  En attente d'évaluation
                                </span>
                              )}
                              {project.assignmentStatus === "pending_review" && (
                                <span className={`${styles.statusBadge} ${styles.statusPendingReview}`}>
                                  <i className="bi bi-person-workspace"></i>
                                  En Attente Staff
                                </span>
                              )}
                            </h5>
                          </div>
                            <button
                            className={styles.expandButton}
                              onClick={() =>
                                setExpandedFeedback((prev) => ({
                                  ...prev,
                                [project.assignmentId]: !prev[project.assignmentId],
                                }))
                              }
                            aria-expanded={!!expandedFeedback[project.assignmentId]}
                              aria-controls={`project-details-${project.assignmentId}`}
                            >
                            <i className={`bi bi-chevron-${expandedFeedback[project.assignmentId] ? "up" : "down"}`}></i>
                            </button>
                          </div>
                          {expandedFeedback[project.assignmentId] && (
                          <div className={styles.expandedContent} id={`project-details-${project.assignmentId}`}>
                            <div className={styles.projectInfo}>
                              <div className={styles.projectInfoItem}>
                                <i className="bi bi-person-check"></i>
                                Évaluateurs: <strong>
                                {project.peerEvaluators && project.peerEvaluators.length > 0
                                  ? project.peerEvaluators.map((evaluator) => evaluator.name || evaluator).join(", ")
                                  : "N/A"}
                                </strong>
                              </div>
                              {project.repoUrl && (
                                <div className={styles.projectInfoItem}>
                                  <i className="bi bi-github"></i>
                                  Dépôt: <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>
                                    {project.repoUrl}
                                  </a>
                                </div>
                              )}
                              {project.githubPagesUrl && (
                                <div className={styles.projectInfoItem}>
                                  <i className="bi bi-globe"></i>
                                  GitHub Pages: <a href={project.githubPagesUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>
                                    {project.githubPagesUrl}
                                  </a>
                                </div>
                              )}
                              {project.submissionDate && (
                                <div className={styles.projectInfoItem}>
                                  <i className="bi bi-calendar-event"></i>
                                  Date de soumission: <strong>{dayjs.utc(project.submissionDate).tz(TIMEZONE).format('DD/MM/YYYY HH[h]mm')}</strong>
                            </div>
                          )}
                        </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Section pour tous les projets assignés à l'apprenant */}
      {me && me.role === "apprenant" && myProjects.length > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            <div className={styles.card}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <i className="bi bi-folder-check"></i>
                  Mes Projets Assignés
                </h2>
                <span className={styles.sectionCount}>{myProjects.length}</span>
              </div>

              <div className={styles.grid2}>
                {myProjects.map((project) => (
                  <div
                    key={project.assignmentId}
                    className={styles.projectCard}
                        onClick={() => router.push("/projects")}
                        style={{ cursor: "pointer" }}
                      >
                    <h5 className={styles.projectTitle}>
                      <i className="bi bi-folder-open"></i>
                          {project.title}
                      <span className={`${styles.statusBadge} ${
                              project.assignmentStatus === "submitted" ? styles.statusSubmitted :
                              project.assignmentStatus === "pending_review" ? styles.statusPendingReview :
                              project.assignmentStatus === "approved" ? styles.statusApproved :
                              project.assignmentStatus === "rejected" ? styles.statusRejected :
                              project.assignmentStatus === "assigned" ? styles.statusAssigned :
                              styles.badgeGray
                            }`}>
                            <i className={`bi bi-${
                              project.assignmentStatus === "submitted" ? "hourglass-split" :
                              project.assignmentStatus === "pending_review" ? "person-workspace" :
                              project.assignmentStatus === "approved" ? "check-circle" :
                              project.assignmentStatus === "rejected" ? "x-circle" :
                              project.assignmentStatus === "assigned" ? "clock" :
                              "question-circle"
                            }`}></i>
                            {
                              project.assignmentStatus === "submitted" ? "Soumis" :
                              project.assignmentStatus === "pending_review" ? "En attente Staff" :
                              project.assignmentStatus === "approved" ? "Approuvé" :
                              project.assignmentStatus === "rejected" ? "Rejeté" :
                              project.assignmentStatus === "assigned" ? "Assigné" :
                              "Inconnu"
                            }
                          </span>
                          {project.order && (
                        <span className={`${styles.badge} ${styles.badgeGray}`}>
                          Projet #{project.order}
                        </span>
                          )}
                        </h5>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    

      {/* Modale pour la soumission de projet de Hackathon */}
      {me && me.role === "apprenant" && showSubmitHackathonProjectModal && (
        <div className="modal" tabIndex="-1" style={{ display: "block" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-gradient bg-primary text-white">
                <h5 className="modal-title">
                  <i className="bi bi-upload me-2"></i> Soumettre le Projet pour
                  Hackathon: {currentHackathonToSubmit?.title}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCloseSubmitHackathonModal}
                ></button>
              </div>
              <div className="modal-body">
                {error && (
                  <div className="alert alert-danger mb-3" role="alert">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="alert alert-success mb-3" role="alert">
                    {success}
                  </div>
                )}
                <form onSubmit={handleSubmitHackathonProject}>
                  <div className="mb-3">
                    <label
                      htmlFor="hackathonSubmissionRepoUrl"
                      className="form-label"
                    >
                      URL du Dépôt GitHub <span className="text-danger">*</span>
                    </label>
                    <input
                      type="url"
                      className="form-control"
                      id="hackathonSubmissionRepoUrl"
                      value={hackathonSubmissionRepoUrl}
                      onChange={(e) =>
                        setHackathonSubmissionRepoUrl(e.target.value)
                      }
                      placeholder="Ex: https://github.com/mon-equipe/mon-projet-hackathon"
                      required
                    />
                    <small className="form-text text-muted">
                      Veuillez fournir l'URL de votre dépôt GitHub pour le
                      projet de hackathon.
                    </small>
                  </div>
                  <div className="mb-3">
                    <p className="mb-1">
                      <strong>Hackathon:</strong>{" "}
                      {currentHackathonToSubmit?.title}
                    </p>
                    <p className="mb-1">
                      <strong>Votre équipe:</strong> {currentTeamToSubmit?.name}
                    </p>
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary d-flex align-items-center"
                    disabled={isLoading || !hackathonSubmissionRepoUrl}
                  >
                    {isLoading ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        ></span>
                        Soumission en cours...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-upload me-2"></i> Soumettre le
                        Projet
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      {me && me.role === "apprenant" && showSubmitHackathonProjectModal && (
        <div className="modal-backdrop fade show"></div>
      )}

      {/* Section des évaluations que JE DOIS FAIRE (en tant qu'évaluateur) */}
      {me &&
        (me.role === "apprenant" ||
          me.role === "staff" ||
          me.role === "admin") && (
          <div className="row mb-4">
            <div className="col-12">
              <div className={styles.cardOrange}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    <i className="bi bi-list-check"></i>
                    Corrections à Venir
                    {me.role !== "apprenant" && " (Toutes les évaluations)"}
                  </h2>
                  <span className={styles.sectionCount}>
                    {me.role === "apprenant" ? upcomingEvaluations.length : allPendingEvaluationsForStaff.filter((evaluation) => {
                      const evaluationEndTime = evaluation.slot ? dayjs.utc(evaluation.slot.endTime) : null;
                      if (!evaluationEndTime) return false;
                      const twoHoursAfterEndTime = evaluationEndTime.add(2, 'hour');
                      return dayjs.utc().isBefore(twoHoursAfterEndTime); // Utiliser dayjs.utc() pour la comparaison
                    }).length}
                  </span>
                </div>

                <div>
                  {me.role === "apprenant" ? (
                    // Affichage pour l'apprenant
                    upcomingEvaluations.map((evaluation) => {
                      // Vérifier si evaluation.slot existe avant d'accéder à ses propriétés
                      const evaluationStartTime = evaluation.slot
                        ? dayjs.utc(evaluation.slot.startTime)
                        : null;
                      const evaluationEndTime = evaluation.slot
                        ? dayjs.utc(evaluation.slot.endTime)
                        : null;
                      const now = dayjs.utc(); // Utiliser dayjs.utc() pour l'heure actuelle

                      // Gérer le cas où slot est null
                      if (!evaluationStartTime || !evaluationEndTime) {
                        return (
                          <li
                            key={evaluation._id}
                            className="d-flex justify-content-between align-items-center flex-wrap py-3"
                          >
                            <div>
                              <h5 className="mb-1">
                                <i className="bi bi-calendar-check me-2"></i>{" "}
                                Projet: {evaluation.project.title}
                              </h5>
                              <small className="d-flex align-items-center mt-1">
                                <i className="bi bi-person me-1"></i> Apprenant:{" "}
                                {evaluation.student?.name || "N/A"}
                              </small>
                              <small className="text-danger d-flex align-items-center mt-1">
                                <i className="bi bi-exclamation-triangle me-1"></i>{" "}
                                Erreur: Créneau horaire manquant
                              </small>
                              <hr />
                            </div>
                          </li>
                        );
                      }

                      const gracePeriodEnd = evaluationEndTime; // Pas d'ajout manuel d'heure ici

                      const isEvaluationActive =
                        now.valueOf() >= evaluationStartTime.valueOf() && now.valueOf() <= gracePeriodEnd.valueOf();
                      const buttonText = isEvaluationActive
                        ? "Évaluer le projet"
                        : now.valueOf() < evaluationStartTime.valueOf() // Utiliser valueOf pour la comparaison
                        ? `Actif à ${evaluationStartTime.tz(TIMEZONE).format('HH[h]mm')}`
                        : "Période d'évaluation terminée";

                      return (
                        <li
                          key={evaluation._id}
                          className="thm-bg-light p-3 rounded-3 thm-shadow-s"
                        >
                          <div className="d-flex justify-content-between align-items-center flex-wrap py-3">
                            <div className="d-flex flex-column">
                              <h5 className="mb-1 d-flex align-items-center">
                                <i className="bi bi-calendar-check me-2"></i>{" "}
                                Projet: {evaluation.project.title}
                              </h5>
                              <small className="text-muted d-flex align-items-center mt-1">
                                <i className="bi bi-clock me-1"></i>{" "}
                                <span>
                                  Date:
                                  {dayjs(evaluationStartTime).tz(TIMEZONE).format('DD/MM/YYYY [de] HH[h]mm')}{" "}
                                  à{" "}
                                  {dayjs(evaluationEndTime).tz(TIMEZONE).format('HH[h]mm')}
                                </span>
                              </small>
                            </div>
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() =>
                                setExpandedFeedback((prev) => ({
                                  ...prev,
                                  [evaluation._id]: !prev[evaluation._id],
                                }))
                              }
                              aria-expanded={!!expandedFeedback[evaluation._id]}
                              aria-controls={`upcoming-eval-details-${evaluation._id}`}
                            >
                              <i
                                className={`bi bi-chevron-${
                                  expandedFeedback[evaluation._id]
                                    ? "up"
                                    : "down"
                                }`}
                              ></i>
                            </button>
                          </div>
                          {expandedFeedback[evaluation._id] && (
                            <div
                              id={`upcoming-eval-details-${evaluation._id}`}
                              className="collapse show mt-3 ps-3 border-start border-info border-2"
                            >
                              <small className="d-flex align-items-center mt-1">
                                <i className="bi bi-person me-1"></i> Apprenant:{" "}
                                {evaluation.student?.name || "N/A"}
                              </small>
                              {evaluation.project?.repoUrl && (
                                <small className="d-flex align-items-center mt-1">
                                  <i className="bi bi-github me-1"></i> Dépôt:{" "}
                                  <a
                                    href={evaluation.project.repoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary text-decoration-none"
                                  >
                                    {evaluation.project.repoUrl}
                                  </a>
                                </small>
                              )}
                              {evaluation.project?.githubPagesUrl && (
                                <small className="d-flex align-items-center mt-1">
                                  <i className="bi bi-globe me-1"></i> GitHub Pages:{" "}
                                  <a
                                    href={evaluation.project.githubPagesUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary text-decoration-none"
                                  >
                                    {evaluation.project.githubPagesUrl}
                                  </a>
                                </small>
                              )}
                              <small className="text-danger d-flex align-items-center mt-1">
                                <i className="bi bi-exclamation-triangle me-1"></i>{" "}
                                Erreur: Créneau horaire manquant
                              </small>
                              <button
                                onClick={() =>
                                  handleOpenEvaluationModal(evaluation)
                                }
                                disabled={!isEvaluationActive}
                                className={`btn btn-sm mt-3 ${
                                  isEvaluationActive
                                    ? "btn-warning"
                                    : "btn-secondary disabled"
                                }`}
                              >
                                {buttonText}
                              </button>
                            </div>
                          )}
                        </li>
                      );
                    })
                  ) : // Affichage pour le staff/admin
                  allPendingEvaluationsForStaff.filter((evaluation) => {
                      // Vérifier si evaluation.slot existe avant d'accéder à ses propriétés
                      const evaluationEndTime = evaluation.slot
                        ? dayjs.utc(evaluation.slot.endTime)
                        : null;
                      // Filtrer seulement si le slot et l'heure de fin sont valides
                      if (!evaluationEndTime) return false;

                      const twoHoursAfterEndTime = evaluationEndTime.add(2, 'hour');
                      const currentTime = dayjs.utc(); // Ajuster currentTime à UTC+1
                      return currentTime.isBefore(twoHoursAfterEndTime);
                    }).length > 0 ? (
                    // Regrouper les évaluations par projet
                    Object.values(
                      allPendingEvaluationsForStaff
                        .filter((evaluation) => {
                          // Vérifier si evaluation.slot existe avant d'accéder à ses propriétés
                          const evaluationEndTime = evaluation.slot
                            ? dayjs.utc(evaluation.slot.endTime)
                            : null;
                          // Filtrer seulement si le slot et l'heure de fin sont valides
                          if (!evaluationEndTime) return false;

                          const twoHoursAfterEndTime = evaluationEndTime.add(2, 'hour');
                          const currentTime = dayjs.utc(); // Ajuster currentTime à UTC+1
                          return currentTime.isBefore(twoHoursAfterEndTime);
                        })
                        .reduce((acc, evaluation) => {
                          const projectId = evaluation.project._id;
                          if (!acc[projectId]) {
                            acc[projectId] = {
                              project: evaluation.project,
                              evaluations: [],
                            };
                          }
                          acc[projectId].evaluations.push(evaluation);
                          return acc;
                        }, {})
                    ).map((projectGroup) => (
                      <li
                        key={projectGroup.project._id}
                        className="list-group-item d-flex flex-column align-items-start flex-wrap mb-3 py-3"
                      >
                        <div className="d-flex justify-content-between align-items-center w-100">
                          <div className="d-flex flex-column">
                            <h5 className="mb-1">
                              <i className="bi bi-journals me-2"></i> Projet:{" "}
                              {projectGroup.project.title} (Soumis par:{" "}
                              {projectGroup.evaluations[0]?.studentName ||
                                "N/A"}
                              )
                            </h5>
                            <small className="d-flex align-items-center mt-1">
                              Statut du projet:{" "}
                              <span className="badge bg-info ms-1 rounded-pill">
                                {(projectGroup.project.status || "").replace(
                                  /_/g,
                                  " "
                                )}
                              </span>
                            </small>
                            <p className="d-flex align-items-center mt-1">
                              Dépôt:{" "}
                              <a
                                href={projectGroup.project.repoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary text-decoration-none"
                              >
                                {projectGroup.project.repoUrl}
                              </a>
                            </p>
                            {projectGroup.project.githubPagesUrl && (
                              <p className="d-flex align-items-center mt-1">
                                GitHub Pages:{" "}
                                <a
                                  href={projectGroup.project.githubPagesUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary text-decoration-none"
                                >
                                  {projectGroup.project.githubPagesUrl}
                                </a>
                              </p>
                            )}
                          </div>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() =>
                              setExpandedProjectEvaluations((prev) => ({
                                ...prev,
                                [projectGroup.project._id]:
                                  !prev[projectGroup.project._id],
                              }))
                            }
                            aria-expanded={
                              expandedProjectEvaluations[
                                projectGroup.project._id
                              ]
                            }
                            aria-controls={`project-evals-details-${projectGroup.project._id}`}
                          >
                            <i
                              className={`bi bi-chevron-${
                                expandedProjectEvaluations[
                                  projectGroup.project._id
                                ]
                                  ? "up"
                                  : "down"
                              }`}
                            ></i>
                          </button>
                        </div>
                        {expandedProjectEvaluations[
                          projectGroup.project._id
                        ] && (
                          <div
                            id={`project-evals-details-${projectGroup.project._id}`}
                            className="collapse show mt-3 w-100 ps-3 border-start border-info border-2"
                          >
                            <strong>Évaluations des pairs :</strong>
                            <ul className=" mt-2">
                              {projectGroup.evaluations.map((evalItem) => {
                                const now = dayjs.utc();
                                // Vérifier si evalItem.slot existe avant d'accéder à ses propriétés
                                const evaluationTime = evalItem.slot
                                  ? dayjs.utc(evalItem.slot.endTime)
                                  : null; // Heure de fin du slot

                                // Gérer le cas où evaluationTime est null
                                if (!evaluationTime) {
                                  return (
                                    <li
                                      key={evalItem._id}
                                      className="d-flex justify-content-between align-items-center flex-wrap border"
                                    >
                                      <span className="d-flex align-items-center">
                                        <i className="bi bi-person-check me-2"></i>{" "}
                                        Évaluateur:{" "}
                                        <strong>
                                          {evalItem.evaluator.name}
                                        </strong>{" "}
                                        ({evalItem.evaluator.email})
                                      </span>
                                      <div>
                                        <span className="badge bg-danger me-2 rounded-pill">
                                          Créneau manquant
                                        </span>
                                      </div>
                                    </li>
                                  );
                                }
                                const submissionTime = evalItem.submissionDate
                                  ? dayjs.utc(evalItem.submissionDate)
                                  : null;
                                const gracePeriodEnd = evaluationTime.add(1, 'hour'); // 1 heure après l'heure de fin

                                let statusText = "En attente";
                                let statusBadgeClass = "bg-warning";
                                let timeStatus = "N/A";
                                if (evalItem.status === "accepted") {
                                  statusText = "Acceptée";
                                  statusBadgeClass = "bg-success";
                                  if (
                                    submissionTime &&
                                    submissionTime.isSameOrBefore(gracePeriodEnd)
                                  ) {
                                    timeStatus = "Dans les temps";
                                  } else if (submissionTime) {
                                    timeStatus = "En retard";
                                  }
                                } else if (evalItem.status === "rejected") {
                                  statusText = "Rejetée";
                                  statusBadgeClass = "bg-danger";
                                  if (
                                    submissionTime &&
                                    submissionTime.isSameOrBefore(gracePeriodEnd)
                                  ) {
                                    timeStatus = "Dans les temps";
                                  } else if (submissionTime) {
                                    timeStatus = "En retard";
                                  }
                                }
                                return (
                                  <li
                                    key={evalItem._id}
                                    className="list-group-item d-flex justify-content-between align-items-center flex-wrap"
                                  >
                                    <span className="d-flex align-items-center">
                                      <i className="bi bi-person-check me-2"></i>{" "}
                                      Évaluateur:{" "}
                                      <strong>{evalItem.evaluator.name}</strong>{" "}
                                      ({evalItem.evaluator.email})
                                    </span>
                                    <div>
                                      <span
                                        className={`badge me-2 rounded-pill ${statusBadgeClass}`}
                                      >
                                        {statusText}
                                      </span>
                                      <span className="badge bg-secondary rounded-pill">
                                        {timeStatus}
                                      </span>
                                      {(evalItem.status === "rejected" ||
                                        (evalItem.status === "pending" &&
                                         now.isAfter(gracePeriodEnd))) && (
                                        <button
                                          onClick={() =>
                                            handleReassignEvaluation(
                                              evalItem._id
                                            )
                                          }
                                          className="btn btn-info btn-sm ms-2"
                                        >
                                          Réassigner
                                        </button>
                                      )}
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                      </li>
                    ))
                  ) : (
                    <div className={styles.emptyState}>
                      <i className="bi bi-inbox"></i>
                      <p className={styles.emptyStateText}>
                      Aucune évaluation en attente pour le moment.
                    </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Nouveau: Section pour les projets en attente de révision finale du personnel */}
      {me &&
        (me.role === "staff" || me.role === "admin") &&
        projectsAwaitingStaffReview.length > 0 && (
          <div className="row mb-4">
            <div className="col-12">
              <div className={styles.cardGreen}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    <i className="bi bi-file-earmark-check"></i>
                    Projets en Attente de Révision Finale
                  </h2>
                  <span className={styles.sectionCount}>{projectsAwaitingStaffReview.length}</span>
                </div>
                        <div>
                  {projectsAwaitingStaffReview.map((project) => (
                    <div key={project._id} className={styles.listItem}>
                      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                        <div className="flex-grow-1">
                          <h5 className={styles.listItemTitle}>
                            <i className="bi bi-exclamation-triangle"></i>
                            {project.title}
                            <span className={`${styles.badge} ${styles.badgeOrange}`}>
                              <i className="bi bi-person-workspace"></i>
                              En Attente
                          </span>
                          </h5>
                          <div className={styles.projectInfo}>
                            <div className={styles.projectInfoItem}>
                              <i className="bi bi-person"></i>
                              Soumis par: <strong>{project.student.name}</strong>
                            </div>
                          {project.repoUrl && (
                              <div className={styles.projectInfoItem}>
                                <i className="bi bi-github"></i>
                                Dépôt: <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>
                                {project.repoUrl}
                              </a>
                              </div>
                            )}
                            {project.githubPagesUrl && (
                              <div className={styles.projectInfoItem}>
                                <i className="bi bi-globe"></i>
                                GitHub Pages: <a href={project.githubPagesUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>
                                {project.githubPagesUrl}
                              </a>
                              </div>
                            )}
                            {project.submissionDate && (
                              <div className={styles.projectInfoItem}>
                                <i className="bi bi-calendar-event"></i>
                                Date de soumission: <strong>{dayjs.utc(project.submissionDate).tz(TIMEZONE).format('DD/MM/YYYY HH[h]mm')}</strong>
                            </div>
                          )}
                          </div>
                        </div>
                        <div className={styles.buttonGroup}>
                          <button
                            className={`${styles.btnSmall} ${styles.btnSuccess}`}
                            onClick={() =>
                              token &&
                              handleFinalStaffReview(
                                project.projectId,
                                project.assignmentId,
                                "approved"
                              )
                            }
                          >
                            <i className="bi bi-check-circle"></i>
                            Approuver
                          </button>
                          <button
                            className={`${styles.btnSmall} ${styles.btnDanger}`}
                            onClick={() =>
                              token &&
                              handleFinalStaffReview(
                                project.projectId,
                                project.assignmentId,
                                "rejected"
                              )
                            }
                          >
                            <i className="bi bi-x-circle"></i>
                            Rejeter
                          </button>
                        </div>
                      </div>
                    </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Nouveau: Section pour la liste des apprenants (pour staff/admin) */}
      {me &&
        (me.role === "staff" || me.role === "admin") &&
        learners.length > 0 && (
          <div className="row mb-4">
            <div className="col-12">
              <div className={styles.card}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    <i className="bi bi-people"></i>
                    Liste des Apprenants
                  </h2>
                  <span className={styles.sectionCount}>{learners.length}</span>
                </div>

                <div className={styles.tableResponsiveWrapper}>
                  <table className={styles.modernTable}>
                    <thead>
                      <tr>
                        <th>
                          <i className="bi bi-person-fill me-2"></i>
                          Nom
                        </th>
                        <th>
                          <i className="bi bi-envelope-fill me-2"></i>
                          Email
                        </th>
                        <th className="text-center">
                          <i className="bi bi-bar-chart-fill me-2"></i>
                          Niveau
                        </th>
                        <th className="text-center">
                          <i className="bi bi-hourglass-split me-2"></i>
                          Jours
                        </th>
                        <th>
                          <i className="bi bi-folder-fill me-2"></i>
                          Projet Assigné
                        </th>
                        <th className="text-center">
                          <i className="bi bi-gear-fill me-2"></i>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {learners.map((learner) => (
                        <React.Fragment key={learner._id}>
                          <tr>
                            <td><strong>{learner.name}</strong></td>
                            <td style={{ fontSize: '12px' }} title={learner.email}>{learner.email}</td>
                            <td className="text-center">
                              <span className={`${styles.badge} ${styles.badgeGreen}`}>
                                <i className="bi bi-bar-chart"></i>
                                {learner.level}
                              </span>
                            </td>
                            <td className="text-center">
                              <span className={`${styles.badge} ${styles.badgeOrange}`}>
                                <i className="bi bi-hourglass-split"></i>
                                {learner.daysRemaining}
                              </span>
                            </td>
                            <td>
                              {learner.assignedProject ? (
                                <span className={`${styles.statusBadge} ${
                                  learner.assignedProject.status === "assigned" ? styles.statusAssigned :
                                  learner.assignedProject.status === "submitted" ? styles.statusSubmitted :
                                  learner.assignedProject.status === "pending_review" ? styles.statusPendingReview :
                                  learner.assignedProject.status === "approved" ? styles.statusApproved :
                                  learner.assignedProject.status === "rejected" ? styles.statusRejected :
                                  styles.badgeGray
                                }`}>
                                  <i className={`bi bi-${
                                    learner.assignedProject.status === "assigned" ? "clock" :
                                    learner.assignedProject.status === "submitted" ? "hourglass-split" :
                                    learner.assignedProject.status === "pending_review" ? "person-workspace" :
                                    learner.assignedProject.status === "approved" ? "check-circle" :
                                    learner.assignedProject.status === "rejected" ? "x-circle" :
                                    "question-circle"
                                  }`}></i>
                                  <span title={learner.assignedProject.title}>
                                    {learner.assignedProject.title.length > 25 ? learner.assignedProject.title.substring(0, 25) + '...' : learner.assignedProject.title}
                                  </span>
                                </span>
                              ) : (
                                <span className={`${styles.badge} ${styles.badgeGray}`}>
                                  <i className="bi bi-x"></i>
                                  Aucun
                                </span>
                              )}
                            </td>
                            <td className="text-center">
                              <button
                                className={styles.expandButton}
                                onClick={() => {
                                  const newExpandedLearners = {
                                    ...expandedLearners,
                                  };
                                  if (newExpandedLearners[learner._id]) {
                                    delete newExpandedLearners[learner._id];
                                  } else {
                                    newExpandedLearners[learner._id] = true;
                                  }
                                  setExpandedLearners(newExpandedLearners);
                                }}
                                aria-expanded={expandedLearners[learner._id]}
                                aria-controls={`learner-details-${learner._id}`}
                                title={
                                  expandedLearners[learner._id]
                                    ? "Masquer les détails"
                                    : "Voir les détails"
                                }
                              >
                                <i
                                  className={`bi bi-chevron-${
                                    expandedLearners[learner._id]
                                      ? "up"
                                      : "down"
                                  }`}
                                ></i>
                              </button>
                            </td>
                          </tr>
                          {expandedLearners[learner._id] && (
                            <tr>
                              <td colSpan="6" className="p-0 border-0">
                                <div
                                  className="collapse show"
                                  id={`learner-details-${learner._id}`}
                                >
                                  <div className="thm-bg-light p-3 border-start border-primary border-3 ms-3 mb-2 me-3 shadow-sm rounded">
                                    <h6 className="mb-2">
                                      Détails du Projet Assigné:
                                    </h6>
                                    {learner.assignedProject ? (
                                      <>
                                        <p className="mb-1 d-flex align-items-center">
                                          <i className="bi bi-journal-text me-2 text-primary"></i>{" "}
                                          Titre:{" "}
                                          <strong>
                                            {learner.assignedProject.title}
                                          </strong>
                                        </p>
                                        <p className="mb-1 d-flex align-items-center">
                                          <i className="bi bi-info-circle me-2 text-info"></i>{" "}
                                          Statut:
                                          <span
                                            className={`badge bg-${(() => {
                                              if (
                                                learner.assignedProject
                                                  .status === "assigned"
                                              )
                                                return "primary";
                                              if (
                                                learner.assignedProject
                                                  .status === "submitted"
                                              )
                                                return "warning text-dark";
                                              if (
                                                learner.assignedProject
                                                  .status === "pending_review"
                                              )
                                                return "info";
                                              if (
                                                learner.assignedProject
                                                  .status === "approved"
                                              )
                                                return "success";
                                              if (
                                                learner.assignedProject
                                                  .status === "rejected"
                                              )
                                                return "danger";
                                              return "secondary"; // Fallback
                                            })()} ms-1`}
                                          >
                                            {(() => {
                                              if (
                                                learner.assignedProject
                                                  .status === "assigned"
                                              )
                                                return "Assigné";
                                              if (
                                                learner.assignedProject
                                                  .status === "submitted"
                                              )
                                                return "Soumis (en attente)";
                                              if (
                                                learner.assignedProject
                                                  .status === "pending_review"
                                              )
                                                return "En attente Staff";
                                              if (
                                                learner.assignedProject
                                                  .status === "approved"
                                              )
                                                return "Approuvé";
                                              if (
                                                learner.assignedProject
                                                  .status === "rejected"
                                              )
                                                return "Rejeté";
                                              return "Statut Inconnu";
                                            })()}
                                          </span>
                                        </p>
                                        {learner.assignedProject.repoUrl && (
                                          <p className="mb-1 d-flex align-items-center">
                                            <i className="bi bi-github me-2 text-dark"></i>{" "}
                                            Dépôt:{" "}
                                            <a
                                              href={
                                                learner.assignedProject.repoUrl
                                              }
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-primary text-decoration-none"
                                            >
                                              {learner.assignedProject.repoUrl}
                                            </a>
                                          </p>
                                        )}
                                        {learner.assignedProject.githubPagesUrl && (
                                          <p className="mb-1 d-flex align-items-center">
                                            <i className="bi bi-globe me-2 text-dark"></i>{" "}
                                            GitHub Pages:{" "}
                                            <a
                                              href={
                                                learner.assignedProject.githubPagesUrl
                                              }
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-primary text-decoration-none"
                                            >
                                              {learner.assignedProject.githubPagesUrl}
                                            </a>
                                          </p>
                                        )}
                                        {learner.assignedProject.submissionDate && (
                                          <p className="mb-1 d-flex align-items-center">
                                            <i className="bi bi-calendar-event me-2 text-muted"></i>{" "}
                                            Date de soumission:{" "}
                                            <strong>
                                              {new Date(learner.assignedProject.submissionDate).toUTCString()}
                                            </strong>
                                          </p>
                                        )}
                                      </>
                                    ) : (
                                      <p className="d-flex align-items-center">
                                        <i className="bi bi-x-circle me-2"></i>{" "}
                                        Aucun projet actuellement assigné.
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Nouveau: Section pour la liste de tous les projets (pour staff/admin) */}
      {me && (me.role === "staff" || me.role === "admin") && (
        <div className="row mb-4">
          <div className="col-12">
            <div className={styles.card}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <i className="bi bi-journals"></i>
                  Gestion des Projets
                </h2>
                <div className={styles.buttonGroup}>
                  <button
                    className={styles.actionButtonSecondary}
                    onClick={() => router.push("/hackathons")}
                  >
                    <i className="bi bi-lightbulb"></i>
                    Hackathons
                  </button>
                  <button
                    className={styles.actionButtonSecondary}
                    onClick={() => router.push("/admin/users")}
                  >
                    <i className="bi bi-people"></i>
                    Utilisateurs
                  </button>
                  <button
                    className={styles.actionButton}
                    onClick={() => router.push("/projects?openAddProject=true")}
                  >
                    <i className="bi bi-plus-circle"></i>
                    Ajouter un Projet
                  </button>
                </div>
              </div>
                {allProjects.length === 0 ? (
                <div className={styles.emptyState}>
                  <i className="bi bi-inbox"></i>
                  <p className={styles.emptyStateText}>Aucun projet disponible.</p>
                </div>
                ) : (
                  <div className={styles.tableResponsiveWrapper}>
                    <table className={`${styles.modernTable} ${styles.modernTableProjects}`}>
                      <thead>
                        <tr>
                          <th>
                            <i className="bi bi-journal-text me-2"></i>
                            Titre
                          </th>
                          <th>
                            <i className="bi bi-text-paragraph me-2"></i>
                            Description
                          </th>
                          <th>
                            <i className="bi bi-person-fill me-2"></i>
                            Étudiant
                          </th>
                          <th>
                            <i className="bi bi-check-circle-fill me-2"></i>
                            Statut
                          </th>
                          <th className="text-center">
                            <i className="bi bi-gear-fill me-2"></i>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {allProjects.map((project) => (
                          <tr key={project._id}>
                            <td title={project.title}>
                              <strong>
                                <i className="bi bi-journal-text me-2" style={{ color: '#F36F35' }}></i>
                                {project.title.length > 30 ? project.title.substring(0, 30) + '...' : project.title}
                              </strong>
                            </td>
                            <td style={{ fontSize: '12px' }} title={project.description}>
                              {project.description.substring(0, 80)}...
                            </td>
                            <td>
                              {project.student ? (
                                <span className={`${styles.badge} ${styles.badgeOrange}`}>
                                  <i className="bi bi-person"></i>
                                  {project.student.name}
                                </span>
                              ) : (
                                <span className={`${styles.badge} ${styles.badgeGreen}`}>
                                  <i className="bi bi-file-earmark"></i>
                                  Template
                                </span>
                              )}
                            </td>
                            <td>
                              <span className={`${styles.statusBadge} ${
                                project.status === "approved" ? styles.statusApproved :
                                project.status === "rejected" ? styles.statusRejected :
                                project.status === "template" ? styles.badgeGreen :
                                styles.statusSubmitted
                              }`}>
                                <i className={`bi bi-${
                                  project.status === "approved" ? "check-circle" :
                                  project.status === "rejected" ? "x-circle" :
                                  project.status === "template" ? "file-earmark" :
                                  "hourglass-split"
                                }`}></i>
                                {project.status === "approved" ? "Approuvé" :
                                 project.status === "rejected" ? "Rejeté" :
                                 project.status === "template" ? "Modèle" :
                                 "En attente"}
                              </span>
                            </td>
                            <td className="text-center">
                              <div className={styles.buttonGroup}>
                              <button
                                  className={`${styles.btnSmall} ${styles.btnSuccess}`}
                                onClick={() => handleEditProject(project)}
                                title="Modifier le projet"
                              >
                                <i className="bi bi-pencil-square"></i>
                              </button>
                              <button
                                  className={`${styles.btnSmall} ${styles.btnDanger}`}
                                onClick={() => handleDeleteProject(project._id)}
                                title="Supprimer le projet"
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Modale pour créer un slot de disponibilité */}
      {showCreateSlotModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateSlotModal(false)}>
          <div className={styles.modalDialog} onClick={(e) => e.stopPropagation()}>
            <div className={`${styles.modalHeader} ${styles.modalHeaderGreen}`}>
              <h5 className={styles.modalTitle}>
                <i className="bi bi-calendar-plus"></i>
                Créer un Slot de Disponibilité
              </h5>
              <button type="button" className={styles.closeBtn} onClick={() => setShowCreateSlotModal(false)}>
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
                <form onSubmit={handleCreateSlot}>
                <div className={styles.formGroup}>
                  <label htmlFor="slotDate" className={styles.formLabel}>
                    Date <span style={{ color: '#dc3545' }}>*</span>
                    </label>
                    <input
                      type="date"
                    className={styles.formControl}
                      id="slotDate"
                      value={slotDate}
                      onChange={(e) => setSlotDate(e.target.value)}
                      required
                    />
                </div>
                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                  <div style={{ flex: 1 }}>
                    <label htmlFor="slotStartTime" className={styles.formLabel}>
                      Heure de début <span style={{ color: '#dc3545' }}>*</span>
                    </label>
                    <input
                      type="time"
                      className={styles.formControl}
                      id="slotStartTime"
                      value={slotStartTime}
                      onChange={(e) => {
                        const newStartTime = e.target.value;
                        setSlotStartTime(newStartTime);
                        // Calculer l'heure de fin automatiquement (début + 30 minutes)
                        const [hours, minutes] = newStartTime.split(":").map(Number);
                        const date = dayjs(`${slotDate}T${newStartTime}`, TIMEZONE);
                        const newEndTime = date.add(30, 'minutes').format('HH:mm');
                        setSlotEndTime(newEndTime);
                      }}
                      required
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label htmlFor="slotEndTime" className={styles.formLabel}>
                      Heure de fin <span style={{ color: '#dc3545' }}>*</span>
                    </label>
                    <input
                      type="time"
                      className={styles.formControl}
                      id="slotEndTime"
                      value={slotEndTime}
                      onChange={(e) => setSlotEndTime(e.target.value)}
                      required
                      readOnly
                    />
                  </div>
                </div>
                <button type="submit" className={styles.actionButton} disabled={isLoading}>
                    {isLoading ? (
                      <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        Création...
                      </>
                    ) : (
                      <>
                      <i className="bi bi-plus-circle"></i>
                        Créer le slot
                      </>
                    )}
                  </button>
                </form>
            </div>
          </div>
        </div>
      )}

      {/* Modale pour l'évaluation de projet */}
      {showEvaluationModal && currentEvaluationToSubmit && (
        <div className={styles.modalOverlay} onClick={handleCloseEvaluationModal}>
          <div className={styles.modalDialog} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className={`${styles.modalHeader} ${styles.modalHeaderYellow}`}>
              <h5 className={styles.modalTitle}>
                <i className="bi bi-clipboard-check"></i>
                Évaluer: {currentEvaluationToSubmit.project.title}
                </h5>
              <button type="button" className={styles.closeBtn} onClick={handleCloseEvaluationModal}>
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

                <p className="d-flex align-items-center mb-1">
                  <strong>
                    <i className="bi bi-person me-2"></i>Apprenant:
                  </strong>{" "}
                  {currentEvaluationToSubmit.student.name}
                </p>
                {currentEvaluationToSubmit.project.repoUrl && (
                  <p className="d-flex align-items-center mb-3">
                    <strong>
                      <i className="bi bi-github me-2"></i>URL Dépôt GitHub:
                    </strong>{" "}
                    <a
                      href={currentEvaluationToSubmit.project.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-decoration-none"
                    >
                      {currentEvaluationToSubmit.project.repoUrl}
                    </a>
                  </p>
                )}
                <p className="alert alert-info py-2 d-flex align-items-center">
                  <i className="bi bi-info-circle me-2"></i> Veuillez fournir
                  votre appréciation pour les points suivants (obligatoire pour
                  accepter):
                </p>

                <form>
                  <div className={styles.formGroup}>
                    <label htmlFor="feedbackAssiduite" className={styles.formLabel}>
                      Assiduité <span style={{ color: '#dc3545' }}>*</span>
                    </label>
                    <textarea
                      className={styles.formControl}
                      id="feedbackAssiduite"
                      name="assiduite"
                      rows="3"
                      value={feedback.assiduite}
                      onChange={handleFeedbackChange}
                      required={true}
                    ></textarea>
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="feedbackComprehension" className={styles.formLabel}>
                      Compréhension des projets <span style={{ color: '#dc3545' }}>*</span>
                    </label>
                    <textarea
                      className={styles.formControl}
                      id="feedbackComprehension"
                      name="comprehension"
                      rows="3"
                      value={feedback.comprehension}
                      onChange={handleFeedbackChange}
                      required={true}
                    ></textarea>
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="feedbackSpecifications" className={styles.formLabel}>
                      Respect des spécifications <span style={{ color: '#dc3545' }}>*</span>
                    </label>
                    <textarea
                      className={styles.formControl}
                      id="feedbackSpecifications"
                      name="specifications"
                      rows="3"
                      value={feedback.specifications}
                      onChange={handleFeedbackChange}
                      required={true}
                    ></textarea>
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="feedbackMaitriseConcepts" className={styles.formLabel}>
                      Maîtrise des concepts <span style={{ color: '#dc3545' }}>*</span>
                    </label>
                    <textarea
                      className={styles.formControl}
                      id="feedbackMaitriseConcepts"
                      name="maitrise_concepts"
                      rows="3"
                      value={feedback.maitrise_concepts}
                      onChange={handleFeedbackChange}
                      required={true}
                    ></textarea>
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="feedbackCapaciteExpliquer" className={styles.formLabel}>
                      Capacité à expliquer <span style={{ color: '#dc3545' }}>*</span>
                    </label>
                    <textarea
                      className={styles.formControl}
                      id="feedbackCapaciteExpliquer"
                      name="capacite_expliquer"
                      rows="3"
                      value={feedback.capacite_expliquer}
                      onChange={handleFeedbackChange}
                      required={true}
                    ></textarea>
                  </div>
                </form>
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={`${styles.btnSmall} ${styles.btnDanger}`}
                  onClick={() => handleSubmitFeedback("rejected")}
                  disabled={isLoading}
                  style={{ padding: '12px 24px' }}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      Rejet...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-x-circle"></i>
                      Refuser
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className={`${styles.btnSmall} ${styles.btnSuccess}`}
                  onClick={() => handleSubmitFeedback("accepted")}
                  disabled={isLoading || Object.values(feedback).some((value) => value.trim() === "")}
                  style={{ padding: '12px 24px' }}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      Acceptation...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle"></i>
                      Accepter
                    </>
                  )}
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale pour ajouter un utilisateur (staff/admin) */}
      {showAddUserModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddUserModal(false)}>
          <div className={styles.modalDialog} onClick={(e) => e.stopPropagation()}>
            <div className={`${styles.modalHeader} ${styles.modalHeaderGreen}`}>
              <h5 className={styles.modalTitle}>
                <i className="bi bi-person-plus"></i>
                Ajouter un Nouvel Utilisateur
                </h5>
              <button type="button" className={styles.closeBtn} onClick={() => setShowAddUserModal(false)}>
                <i className="bi bi-x"></i>
              </button>
              </div>
            <div className={styles.modalBody}>
                {error && (
                  <div className="alert alert-danger mb-3" role="alert">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="alert alert-success mb-3" role="alert">
                    {success}
                  </div>
                )}
                <form onSubmit={handleAddUser}>
                  <div className="mb-3">
                    <label htmlFor="newUserName" className="form-label">
                      Nom <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="newUserName"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="newUserEmail" className="form-label">
                      Email <span className="text-danger">*</span>
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      id="newUserEmail"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="newUserPassword" className="form-label">
                      Mot de Passe <span className="text-danger">*</span>
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      id="newUserPassword"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="newUserRole" className="form-label">
                      Rôle <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-control"
                      id="newUserRole"
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                      required
                    >
                      <option value="apprenant">Apprenant</option>
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className={styles.actionButton}
                    disabled={isLoading}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    {isLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        Ajout en cours...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-person-plus"></i>
                        Ajouter l'utilisateur
                      </>
                    )}
                  </button>
                </form>
            </div>
          </div>
        </div>
      )}

      {/* Section Hackathons et Badges (pour apprenant) */}
      {me && me.role === "apprenant" && mySubmittedEvaluations.length > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            <div className={styles.cardGreen}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <i className="bi bi-chat-left-text"></i>
                  Feedback sur Mes Projets Soumis
                </h2>
                <span className={styles.sectionCount}>{mySubmittedEvaluations.length}</span>
              </div>
              <div>
                {mySubmittedEvaluations.map((evaluation) => (
                  <div>
                    <div key={evaluation._id} className="">
                      <div className="d-flex justify-content-between align-items-center flex-wrap">
                        <h5 className="mb-2 d-flex align-items-center">
                          <i className="bi bi-journal-check me-2"></i> Projet:{" "}
                          {evaluation.project.title}
                          <span
                            className={`badge bg-${
                              evaluation.status === "accepted"
                                ? "success"
                                : evaluation.status === "pending"
                                ? "info"
                                : "danger"
                            } ms-2`}
                          >
                            {evaluation.status === "accepted"
                              ? "Accepté"
                              : evaluation.status === "pending"
                              ? "En attente"
                              : "Rejeté"}
                          </span>
                        </h5>
                        {evaluation.feedback && (
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() =>
                              setExpandedFeedback((prev) => ({
                                ...prev,
                                [evaluation._id]: !prev[evaluation._id],
                              }))
                            }
                            aria-expanded={!!expandedFeedback[evaluation._id]}
                            aria-controls={`feedback-details-${evaluation._id}`}
                          >
                            <i
                              className={`bi bi-chevron-${
                                expandedFeedback[evaluation._id] ? "up" : "down"
                              }`}
                            ></i>
                          </button>
                        )}
                      </div>
                      {expandedFeedback[evaluation._id] && (
                        <div
                          id={`feedback-details-${evaluation._id}`}
                          className="collapse show mt-3"
                        >
                          <p className="mb-1">
                            <strong>
                              <i className="bi bi-person me-2"></i>Évaluateur:
                            </strong>{" "}
                            {evaluation.evaluator.name}
                          </p>
                          {evaluation.slot && (
                            <p className="mb-1">
                              <strong>
                                <i className="bi bi-calendar-event me-2"></i>
                                Date d'évaluation:
                              </strong>{" "}
                              {dayjs.utc(evaluation.slot.startTime).tz(TIMEZONE).format('DD/MM/YYYY HH[h]mm')}
                            </p>
                          )}
                          {evaluation.feedback && (
                            <div className="border rounded p-2 mt-2">
                              <h6>
                                <i className="bi bi-chat-dots me-2"></i>Détails
                                du Feedback:
                              </h6>
                              {evaluation.feedback.assiduite && (
                                <p className="mb-1">
                                  <strong>Assiduité:</strong>{" "}
                                  {evaluation.feedback.assiduite}
                                </p>
                              )}
                              {evaluation.feedback.comprehension && (
                                <p className="mb-1">
                                  <strong>Compréhension:</strong>{" "}
                                  {evaluation.feedback.comprehension}
                                </p>
                              )}
                              {evaluation.feedback.specifications && (
                                <p className="mb-1">
                                  <strong>Spécifications:</strong>{" "}
                                  {evaluation.feedback.specifications}
                                </p>
                              )}
                              {evaluation.feedback.maitrise_concepts && (
                                <p className="mb-1">
                                  <strong>Maîtrise des concepts:</strong>{" "}
                                  {evaluation.feedback.maitrise_concepts}
                                </p>
                              )}
                              {evaluation.feedback.capacite_expliquer && (
                                <p className="mb-1">
                                  <strong>Capacité à expliquer:</strong>{" "}
                                  {evaluation.feedback.capacite_expliquer}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <hr />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modale de confirmation de suppression de slot */}
      {showDeleteSlotModal.show && (
        <div className={styles.modalOverlay} onClick={() => setShowDeleteSlotModal({ show: false, slotId: null, slotStartTime: null })}>
          <div className={styles.modalDialog} onClick={(e) => e.stopPropagation()}>
            <div className={`${styles.modalHeader} ${styles.modalHeaderRed}`}>
              <h5 className={styles.modalTitle}>
                <i className="bi bi-exclamation-triangle"></i>
                Confirmer la Suppression du Slot
                </h5>
              <button type="button" className={styles.closeBtn} onClick={() => setShowDeleteSlotModal({ show: false, slotId: null, slotStartTime: null })}>
                <i className="bi bi-x"></i>
              </button>
              </div>
            <div className={styles.modalBody}>
                {error && (
                  <div className="alert alert-danger mb-3" role="alert">
                    {error}
                  </div>
                )}
                <p>
                  Êtes-vous sûr de vouloir supprimer le slot de disponibilité
                  commençant le
                </p>
                <p>
                  <strong>
                    {formatUTCHourMinute(showDeleteSlotModal.slotStartTime)}
                  </strong>{" "}
                  ?
                </p>
                <p className="text-danger">
                  Cette action est irréversible et ne peut être faite que si le
                  slot n'est pas réservé.
                </p>
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={`${styles.btnSmall} ${styles.btnOutline}`}
                  onClick={() => setShowDeleteSlotModal({ show: false, slotId: null, slotStartTime: null })}
                  style={{ padding: '12px 24px', color: '#6c757d', borderColor: '#6c757d' }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className={`${styles.btnSmall} ${styles.btnDanger}`}
                  onClick={handleDeleteSlot}
                  disabled={isLoading}
                  style={{ padding: '12px 24px' }}
                >
                  {isLoading ? (
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  ) : (
                    <i className="bi bi-trash"></i>
                  )}
                  Supprimer
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale de réassignation d'évaluation */}
      {showReassignModal && currentEvaluationToReassign && (
        <div className="modal fade show d-block" tabIndex="-1" role="dialog">
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header bg-warning text-dark">
                <h5 className="modal-title">Réassigner l'évaluation</h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setShowReassignModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  Réassigner l'évaluation du projet:
                  <span className="fw-bold">
                    {" "}
                    {currentEvaluationToReassign.project?.title || "N/A"}{" "}
                  </span>
                  pour l'apprenant
                  <span className="fw-bold">
                    {" "}
                    {currentEvaluationToReassign.student?.name || "N/A"}
                  </span>
                  .
                </p>

                <div className="mb-3">
                  <label htmlFor="slotDate" className="form-label">
                    Date des nouveaux slots
                  </label>
                  <input
                    type="date"
                    id="slotDate"
                    className="form-control"
                    value={reassignSlotDate}
                    onChange={(e) => setReassignSlotDate(e.target.value)}
                  />
                </div>

                {availableSlotsForReassign.length > 0 && (
                  <div className="mb-3">
                    <label className="form-label">Slots disponibles</label>
                    {availableSlotsForReassign.map((slot) => (
                      <div key={slot._id} className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="reassignSlot"
                          id={`slot-${slot._id}`}
                          value={slot._id}
                          checked={selectedSlots.includes(slot._id)} // Ici, on utilise includes
                          onChange={() => handleSlotSelection(slot._id)} // Nouvelle fonction pour gérer la sélection multiple
                        />
                        <label
                          className="form-check-label"
                          htmlFor={`slot-${slot._id}`}
                        >
                          {formatUTCHourMinute(slot.startTime)} -{" "}
                          {formatUTCHourMinute(slot.endTime)} (
                          {slot.evaluator.name})
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-danger">{error}</p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowReassignModal(false)}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="btn btn-warning"
                  onClick={handleConfirmReassign}
                  disabled={selectedSlots.length !== 2} // Désactiver si le nombre de slots sélectionnés n'est pas 2
                >
                  Confirmer la réassignation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showReassignModal && <div className="modal-backdrop fade show"></div>}
    </div>
  );
}
