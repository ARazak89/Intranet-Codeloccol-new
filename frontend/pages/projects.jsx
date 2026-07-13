import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import { getAuthToken } from "../utils/auth";
import React from "react"; // Added for React.Fragment
import { marked } from "marked"; // Import de marked

import HtmlRenderer from "../utils/HtmlRenderer";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

// Fonction utilitaire pour s'assurer que les propriétés sont des tableaux, gérant les valeurs nulles ou indéfinies.
const sanitizeProjectArrays = (project) => ({
  ...project,
  objectives: project.objectives || [],
  specifications: project.specifications || [],
  exerciseStatements: project.exerciseStatements || [],
  resourceLinks: project.resourceLinks || [],
});

/**
 * `ProjectsPage` est le composant principal pour afficher et gérer les projets.
 * Il gère l'affichage des projets pour les apprenants (par module) et pour le staff/admin (vue tableau avec CRUD).
 * Il inclut la logique pour les modales d'ajout, modification, suppression et soumission de projet.
 */
function ProjectsPage() {
  // États pour la gestion des données et de l'UI
  const [projects, setProjects] = useState([]); // Utilisé principalement pour des besoins historiques ou de filtrage si nécessaire.
  const [myProjects, setMyProjects] = useState([]); // Stocke les projets assignés à l'apprenant connecté.
  const [projectsToEvaluate, setProjectsToEvaluate] = useState([]); // Stocke les projets que le staff/admin doit évaluer.
  const [groupedProjectsByModule, setGroupedProjectsByModule] = useState({}); // Regroupe les projets de l'apprenant par module pour l'affichage.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showProjectModal, setShowProjectModal] = useState(false); // Contrôle l'affichage de la modale de détails du projet.
  const [selectedProject, setSelectedProject] = useState(null); // Stocke le projet sélectionné pour affichage dans la modale.
  const [me, setMe] = useState(null); // Informations de l'utilisateur connecté (rôle, etc.).
  const [projectMarkdownContent, setProjectMarkdownContent] = useState(""); // Contenu Markdown d'un projet sélectionné.
  const [allProjects, setAllProjects] = useState([]); // Stocke tous les projets maîtres pour le staff/admin.
  const [expandedProjectAssignments, setExpandedProjectAssignments] = useState({}); // Liste déroulante des apprenants par projet (fermée par défaut).
  const allProjectsRef = useRef(allProjects); // Référence mutable pour accéder à `allProjects` dans les callbacks sans le lister comme dépendance.

  // Synchronisation de la référence avec l'état actuel d'allProjects.
  useEffect(() => {
    allProjectsRef.current = allProjects;
  }, [allProjects]);

  // États pour la gestion des modales CRUD des projets (staff/admin)
  const [showAddProjectModal, setShowAddProjectModal] = useState(false); // Affiche la modale d'ajout de projet.
  const [showEditProjectModal, setShowEditProjectModal] = useState(false); // Affiche la modale de modification de projet.
  const [showDeleteProjectModal, setShowDeleteProjectModal] = useState(false); // Affiche la modale de confirmation de suppression.
  const [currentProjectToEdit, setCurrentProjectToEdit] = useState(null); // Projet actuellement en cours d'édition.
  const [currentProjectToDelete, setCurrentProjectToDelete] = useState(null); // Projet actuellement en cours de suppression.
  const [confirmProjectTitle, setConfirmProjectTitle] = useState(""); // Champ de confirmation de suppression.
  const [selectedModule, setSelectedModule] = useState(null); // Module sélectionné par l'apprenant pour filtrer les projets.

  // États pour le formulaire d'ajout/modification de projet
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectRepoUrl, setProjectRepoUrl] = useState("");
  const [projectDemoVideoUrl, setProjectDemoVideoUrl] = useState("");
  const [projectSpecifications, setProjectSpecifications] = useState([]); // Spécifications du projet (tableau de chaînes).
  const [projectSize, setProjectSize] = useState("short"); // Taille du projet (short, medium, long).
  const [projectExerciseStatements, setProjectExerciseStatements] = useState(
    []
  ); // Énoncés d'exercices (tableau de chaînes).
  const [projectResourceLinks, setProjectResourceLinks] = useState([]); // Liens de ressources (tableau de chaînes).
  const [projectObjectives, setProjectObjectives] = useState([]); // Objectifs du projet (tableau de chaînes).
  const [projectOrder, setProjectOrder] = useState(0); // Ordre d'affichage/progression du projet.
  const [projectModule, setProjectModule] = useState(""); // Module auquel appartient le projet.
  const [markdownFile, setMarkdownFile] = useState(null); // Fichier Markdown pour upload.
  const [existingMarkdownUrl, setExistingMarkdownUrl] = useState(null); // URL du fichier Markdown existant pour modification.

  // États pour la soumission de projet par un apprenant
  const [showSubmitProjectModal, setShowSubmitProjectModal] = useState(false); // Affiche la modale de soumission de projet.
  const [currentProjectToSubmit, setCurrentProjectToSubmit] = useState(null); // Projet en cours de soumission.
  const [projectSubmissionRepoUrl, setProjectSubmissionRepoUrl] = useState(""); // URL du dépôt GitHub pour la soumission.
  const [projectSubmissionGithubPagesUrl, setProjectSubmissionGithubPagesUrl] = useState(""); // URL GitHub Pages pour la soumission (conditionnel).
  const [success, setSuccess] = useState(null); // Message de succès.

  // États pour les popups d'erreur/avertissement personnalisés
  const [showErrorPopup, setShowErrorPopup] = useState(false); // Contrôle l'affichage du popup.
  const [errorPopupMessage, setErrorPopupMessage] = useState(""); // Message affiché dans le popup.
  const [popupType, setPopupType] = useState("error"); // Type du popup ('error' ou 'warning').

  const router = useRouter(); // Hook Next.js pour la navigation.

  // Détermine si l'URL du dépôt est optionnelle pour le projet en cours de soumission.
  const isRepoUrlOptional = [
    "CLI (Command Line Interface)",
    "Pratique guidée Git / GitHub",
  ].includes(currentProjectToSubmit?.title);

  // Détermine si l'URL GitHub Pages est obligatoire pour le projet en cours de soumission.
  const requiresGithubPages = ["HTML / CSS", "Framework"].includes(
    currentProjectToSubmit?.module
  );

  /**
   * `loadData` est une fonction de rappel qui charge toutes les données nécessaires (projets de l'utilisateur, projets à évaluer, etc.)
   * en fonction du rôle de l'utilisateur. Elle met à jour les états pertinents et gère les états de chargement/erreur.
   * @param {string} token - Le jeton d'authentification de l'utilisateur.
   */
  const loadData = useCallback(
    async (token) => {
      try {
        setLoading(true);
        setError(null);

        // Charger les informations de l'utilisateur connecté
        const userRes = await fetch(`${API}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!userRes.ok) {
          const errorData = await userRes.json();
          throw new Error(
            errorData.error || "Échec du chargement des données utilisateur."
          );
        }
        const userData = await userRes.json();
        setMe(userData);

        // Chargement conditionnel des projets en fonction du rôle de l'utilisateur
        if (userData.role === "staff" || userData.role === "admin") {
          // Pour le staff/admin: charger tous les projets templates avec leurs assignations et étudiants.
          const allProjectsRes = await fetch(`${API}/projects/all`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!allProjectsRes.ok) {
            const errorData = await allProjectsRes.json();
            throw new Error(
              errorData.error ||
                "Échec du chargement de tous les projets maîtres."
            );
          }
          const rawProjects = await allProjectsRes.json();
          // Assainir les projets maîtres et leurs assignations pour une meilleure cohérence des données.
          const sanitizedProjects = rawProjects
            .map((project) => ({
              ...sanitizeProjectArrays(project),
              assignments: (project.assignments || []).map((assign) => ({
                ...assign,
                student: assign.student
                  ? {
                      _id: assign.student._id,
                      name: assign.student.name,
                      email: assign.student.email,
                    }
                  : null, // S'assurer que student est un objet simple.
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
            }))
            .sort((a, b) => (b.order || 0) - (a.order || 0)); // Ordre décroissant (numéro d'ordre)
          setAllProjects(sanitizedProjects); // Stocke tous les projets pour la vue admin.
          setProjects([]); // Cet état n'est pas directement utilisé pour le staff/admin dans la nouvelle structure.
        } else {
          // Pour l'apprenant: charger ses projets assignés.
          const myProjectsRes = await fetch(`${API}/projects/my-projects`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!myProjectsRes.ok) {
            const errorData = await myProjectsRes.json();
            throw new Error(
              errorData.error || "Échec du chargement de mes projets."
            );
          }
          const rawProjects = await myProjectsRes.json();
          // Formater les projets de l'apprenant, assurant la présence de `projectId` et `_id`.
          const formattedStudentProjects = rawProjects.map((project) => {
            const sanitizedProject = sanitizeProjectArrays(project);
            return {
              ...sanitizedProject,
              _id: sanitizedProject.assignmentId,
              projectId: sanitizedProject.projectId,
            };
          });

          // Trier les projets de l'apprenant par ordre.
          const allStudentAssignments = formattedStudentProjects.sort(
            (a, b) => (a.order || 0) - (b.order || 0)
          );

          // Regrouper les projets de l'apprenant par module pour l'affichage.
          const grouped = allStudentAssignments.reduce((acc, project) => {
            const moduleName = project.module || "Sans module";
            if (!acc[moduleName]) {
              acc[moduleName] = [];
            }
            acc[moduleName].push(project);
            return acc;
          }, {});
          setGroupedProjectsByModule(grouped);

          setMyProjects(allStudentAssignments); // Stocke tous les projets assignés de l'apprenant.
          setProjectsToEvaluate([]); // Non pertinent pour les apprenants dans cette section.
          setProjects([]); // Non pertinent pour les apprenants dans cette section.
        }
      } catch (e) {
        setError("Error loading data: " + e.message);
      } finally {
        setLoading(false);
      }
    },
    [
      API,
      setMe,
      setProjects,
      setAllProjects,
      setError,
      setLoading,
      setMyProjects,
      setProjectsToEvaluate,
      setGroupedProjectsByModule,
    ]
  ); // Liste complète des dépendances de useCallback.

  /**
   * `handleShowAddProjectModal` ouvre la modale d'ajout de projet et initialise les champs du formulaire.
   * Calcule automatiquement un nouvel ordre pour le projet basé sur les projets existants.
   */
  const handleShowAddProjectModal = useCallback(() => {
    // Calculer le plus grand numéro d'ordre existant pour les projets templates.
    const maxOrder = allProjectsRef.current.reduce((max, projectGroup) => {
      return Math.max(max, projectGroup.order || 0);
    }, 0);
    setProjectOrder(maxOrder + 1); // Définit le prochain ordre disponible.
    setShowAddProjectModal(true); // Ouvre la modale.
    // Réinitialiser tous les champs du formulaire pour un ajout propre.
    setProjectTitle("");
    setProjectDescription("");
    setProjectRepoUrl("");
    setProjectDemoVideoUrl("");
    setProjectSpecifications([]);
    setProjectSize("short");
    setProjectExerciseStatements([]);
    setProjectResourceLinks([]);
    setProjectObjectives([]);
    setProjectModule("");
    setMarkdownFile(null); // Réinitialiser le champ d'upload de fichier Markdown.
    setExistingMarkdownUrl(null); // Réinitialiser l'URL du fichier Markdown existant.
    setError(null);
  }, [
    setProjectOrder,
    setShowAddProjectModal,
    setProjectTitle,
    setProjectDescription,
    setProjectRepoUrl,
    setProjectDemoVideoUrl,
    setProjectSpecifications,
    setProjectSize,
    setProjectExerciseStatements,
    setProjectResourceLinks,
    setProjectObjectives,
    setProjectModule,
    setError,
  ]);

  /**
   * `useEffect` pour charger les données initiales au montage du composant et gérer la redirection si non authentifié.
   * Gère également l'ouverture de la modale d'ajout de projet via un paramètre d'URL.
   */
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push("/login"); // Redirige vers la page de connexion si pas de token.
      return;
    }

    loadData(token); // Charge les données du projet.

    // Vérifier les paramètres d'URL pour ouvrir la modale d'ajout de projet.
    const { openAddProject } = router.query;
    if (openAddProject === "true") {
      handleShowAddProjectModal(); // Ouvre la modale d'ajout.
      router.replace("/projects", undefined, { shallow: true }); // Nettoie l'URL.
    }
  }, [router, loadData, handleShowAddProjectModal]); // Dépendances du hook.

  /**
   * `getEmbedUrl` est une fonction utilitaire qui génère une URL d'intégration pour les vidéos YouTube et Vimeo.
   * @param {string} url - L'URL complète de la vidéo.
   * @returns {string|null} L'URL d'intégration ou `null` si l'URL n'est pas supportée.
   */
  const getEmbedUrl = (url) => {
    if (!url) return null;
    // Gérer les URL YouTube.
    const youtubeMatch = url.match(
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:embed\/|watch\?v=|v\/)|youtu\.be\/)([\w-]{11})(?:\S+)?/
    );
    if (youtubeMatch && youtubeMatch[1]) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }
    // Gérer les URL Vimeo.
    const vimeoMatch = url.match(
      /(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com\/(?:video\/|)([0-9]+))(?:\S+)?/
    );
    if (vimeoMatch && vimeoMatch[1]) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    return null; // Retourne null si l'URL n'est ni YouTube ni Vimeo.
  };

  /**
   * `handleCardClick` gère le clic sur une carte de projet d'un apprenant, ouvrant la modale de détails.
   * Si un fichier Markdown est associé, il est récupéré via l'API.
   * @param {object} project - L'objet projet cliqué.
   */
  const handleCardClick = (project) => {
    const sanitizedProject = {
      ...project,
      objectives: project.objectives || [],
      specifications: project.specifications || [],
      exerciseStatements: project.exerciseStatements || [],
      resourceLinks: project.resourceLinks || [],
    };
    setSelectedProject(sanitizedProject);
    setShowProjectModal(true);

    if (sanitizedProject.markdownFilePath) {
      // Récupérer le contenu du fichier Markdown via une requête API.
      const token = getAuthToken();
      fetch(`${API}/projects/${sanitizedProject.projectId}/markdown`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error("Échec du chargement du fichier Markdown.");
          }
          return res.text(); // Le contenu Markdown est renvoyé en tant que texte brut.
        })
        .then((content) => setProjectMarkdownContent(content)) // Met à jour l'état avec le contenu Markdown.
        .catch((err) => {
          console.error("Error loading markdown content:", err);
          setProjectMarkdownContent(
            "Erreur lors du chargement du contenu Markdown."
          ); // Affiche un message d'erreur si la récupération échoue.
        });
    } else {
      setProjectMarkdownContent(""); // Réinitialise le contenu Markdown si aucun fichier n'est associé.
    }
  };

  /**
   * `handleCloseModal` ferme la modale de détails du projet et réinitialise l'état du projet sélectionné.
   */
  const handleCloseModal = () => {
    setShowProjectModal(false);
    setSelectedProject(null);
  };

  /**
   * `handleAddProject` gère la soumission du formulaire pour créer un nouveau projet template (staff/admin).
   * Utilise `FormData` pour l'upload de fichiers et l'envoi de données.
   * @param {Event} e - L'événement de soumission du formulaire.
   */
  const handleAddProject = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error("Token not found. Please log in.");
      }

      const formData = new FormData();
      formData.append("title", projectTitle);
      formData.append("description", projectDescription);
      formData.append("demoVideoUrl", projectDemoVideoUrl);
      formData.append("specifications", JSON.stringify(projectSpecifications)); // Les tableaux sont stringifiés pour FormData.
      formData.append("size", projectSize);
      formData.append("order", projectOrder);
      formData.append("objectives", JSON.stringify(projectObjectives));
      formData.append(
        "exerciseStatements",
        JSON.stringify(projectExerciseStatements)
      );
      formData.append("resourceLinks", JSON.stringify(projectResourceLinks));
      formData.append("module", projectModule);
      if (markdownFile) {
        formData.append("markdownFile", markdownFile);
      }

      const res = await fetch(`${API}/projects`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }, // Le Content-Type est géré automatiquement par le navigateur pour FormData.
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        alert("Projet ajouté avec succès !");
        setShowAddProjectModal(false);
        // Réinitialise les champs du formulaire après un ajout réussi.
        setProjectTitle("");
        setProjectDescription("");
        setProjectDemoVideoUrl("");
        setProjectSpecifications([]);
        setProjectSize("short");
        setProjectExerciseStatements([]);
        setProjectResourceLinks([]);
        setProjectObjectives([]);
        setProjectOrder(0);
        setProjectModule("");
        loadData(token); // Recharge toutes les données pour mettre à jour l'affichage.
      } else {
        throw new Error(data.error || "Échec de l'ajout du projet.");
      }
    } catch (e) {
      console.error("Error adding project:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * `handleEditProject` pré-remplit le formulaire de modification avec les données du projet sélectionné.
   * Gère également l'état du fichier Markdown existant.
   * @param {object} project - L'objet projet à modifier.
   */
  const handleEditProject = (project) => {
    setCurrentProjectToEdit(project);
    setProjectTitle(project.title);
    setProjectDescription(project.description);
    setProjectRepoUrl(project.repoUrl || "");
    setProjectDemoVideoUrl(project.demoVideoUrl || "");
    setProjectSpecifications(project.specifications || []);
    setProjectSize(project.size || "short");
    setProjectExerciseStatements(project.exerciseStatements || []);
    setProjectResourceLinks(project.resourceLinks || []);
    setProjectObjectives(project.objectives || []);
    setProjectOrder(project.order || 0);
    setProjectModule(project.module || "");
    setMarkdownFile(null); // Réinitialise l'input file à null pour un nouvel upload.
    if (project.markdownFilePath) {
      setExistingMarkdownUrl(`${API}${project.markdownFilePath}`); // Affiche le lien de l'ancien fichier.
    } else {
      setExistingMarkdownUrl(null);
    }
    setShowEditProjectModal(true); // Ouvre la modale de modification.
  };

  /**
   * `handleUpdateProject` gère la soumission du formulaire pour mettre à jour un projet existant (staff/admin).
   * Gère l'envoi de données en `FormData` (si fichier Markdown) ou JSON, et la suppression de l'ancien fichier Markdown.
   * @param {Event} e - L'événement de soumission du formulaire.
   */
  const handleUpdateProject = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!currentProjectToEdit) return;

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error("Token not found. Please log in.");
      }

      let url;
      let method;
      let bodyToSend;
      let headers = { Authorization: `Bearer ${token}` };

      // Déterminer l'ID du projet principal (maître) ou de l'assignation.
      const mainProjectId = currentProjectToEdit.assignmentId
        ? currentProjectToEdit.projectId
        : currentProjectToEdit._id;

      // Logique pour déterminer si un fichier Markdown est impliqué dans la modification.
      const isMarkdownChange =
        markdownFile ||
        (existingMarkdownUrl === null && currentProjectToEdit.markdownFilePath);

      if (isMarkdownChange) {
        // Envoyer via FormData si un fichier Markdown est uploadé ou si l'ancien est supprimé.
        url = `${API}/projects/${mainProjectId}/upload-markdown`;
        method = "POST"; // Note: Cette route utilise POST pour l'upload de fichier Multer.
        const formData = new FormData();

        formData.append("projectTitle", projectTitle);
        formData.append("projectDescription", projectDescription);
        formData.append("projectDemoVideoUrl", projectDemoVideoUrl);
        formData.append(
          "projectSpecifications",
          JSON.stringify(projectSpecifications)
        );
        formData.append("projectSize", projectSize);
        formData.append("projectOrder", projectOrder);
        formData.append("projectObjectives", JSON.stringify(projectObjectives));
        formData.append(
          "projectExerciseStatements",
          JSON.stringify(projectExerciseStatements)
        );
        formData.append(
          "projectResourceLinks",
          JSON.stringify(projectResourceLinks)
        );
        formData.append("projectModule", projectModule);

        if (markdownFile) {
          formData.append("markdownFile", markdownFile);
        } else if (
          existingMarkdownUrl === null &&
          currentProjectToEdit.markdownFilePath
        ) {
          formData.append("clearMarkdown", "true"); // Indique au backend de supprimer l'ancien fichier.
        }

        // Ajouter l'assignmentId et d'autres champs spécifiques si c'est une assignation de projet.
        if (currentProjectToEdit.assignmentId) {
          formData.append("assignmentId", currentProjectToEdit.assignmentId);
          formData.append("repoUrl", projectRepoUrl);
          formData.append("status", currentProjectToEdit.assignmentStatus);
        }
        bodyToSend = formData;
        // Le Content-Type est géré automatiquement par le navigateur pour FormData.
        headers = { Authorization: `Bearer ${token}` };
      } else {
        // Envoyer via JSON pour les mises à jour sans fichier Markdown.
        url = `${API}/projects/${mainProjectId}`;
        method = "PUT";
        const jsonBody = {
          projectTitle: projectTitle,
          projectDescription: projectDescription,
          projectDemoVideoUrl: projectDemoVideoUrl,
          projectSpecifications: projectSpecifications,
          projectSize: projectSize,
          projectOrder: projectOrder,
          projectObjectives: projectObjectives,
          projectExerciseStatements: projectExerciseStatements,
          projectResourceLinks: projectResourceLinks,
          projectModule: projectModule,
        };
        bodyToSend = JSON.stringify(jsonBody);
        headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };
        // console.log('Frontend - Sending JSON Body:', jsonBody);
      }

      // console.log('Frontend - Final URL:', url);
      // console.log('Frontend - Final Method:', method);
      // Note: bodyToSend ne peut pas être loggé directement s'il est un FormData
      // console.log('Frontend - Final Body:', bodyToSend);

      const res = await fetch(url, {
        method: method,
        headers: headers,
        body: bodyToSend,
      });
      const data = await res.json();
      if (res.ok) {
        alert("Projet mis à jour avec succès !");
        setShowEditProjectModal(false);
        setCurrentProjectToEdit(null);
        // Réinitialiser les champs du formulaire après une mise à jour réussie.
        setProjectTitle("");
        setProjectDescription("");
        setProjectRepoUrl("");
        setProjectDemoVideoUrl("");
        setProjectSpecifications([]);
        setProjectSize("short");
        setProjectExerciseStatements([]);
        setProjectResourceLinks([]);
        setProjectObjectives([]);
        setProjectOrder(0);
        setProjectModule("");
        loadData(getAuthToken()); // Recharger toutes les données pour mettre à jour l'affichage.
      } else {
        throw new Error(data.error || "Échec de la mise à jour du projet.");
      }
    } catch (e) {
      console.error("Error updating project:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * `handleDeleteProject` ouvre la modale de confirmation de suppression pour un projet.
   * @param {object} projectToDelete - Le projet à supprimer.
   */
  const handleDeleteProject = (projectToDelete) => {
    setCurrentProjectToDelete(projectToDelete);
    setShowDeleteProjectModal(true);
  };

  /**
   * `handleDeleteProjectConfirmed` gère la suppression confirmée d'un projet (staff/admin).
   * Gère la suppression d'un projet maître ou d'une assignation spécifique.
   */
  const handleDeleteProjectConfirmed = async () => {
    setError(null);
    setLoading(true);

    if (
      !currentProjectToDelete ||
      confirmProjectTitle !== currentProjectToDelete.title
    ) {
      setError("Le titre de confirmation ne correspond pas.");
      setLoading(false);
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error("Token not found. Please log in.");
      }

      const body = {};
      let url = `${API}/projects/${currentProjectToDelete._id}`;

      if (currentProjectToDelete.assignmentId) {
        // Si c'est une assignation, la requête DELETE cible le projet maître avec l'ID de l'assignation dans le corps.
        url = `${API}/projects/${currentProjectToDelete.projectId}`; // L'ID du projet maître.
        body.assignmentId = currentProjectToDelete.assignmentId; // Passer l'ID de l'assignation à supprimer.
      }

      const res = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Suppression effectuée avec succès !");
        setShowDeleteProjectModal(false);
        setCurrentProjectToDelete(null);
        setConfirmProjectTitle("");
        loadData(getAuthToken()); // Recharger toutes les données.
      } else {
        throw new Error(data.error || "Échec de la suppression.");
      }
    } catch (e) {
      console.error("Error deleting project:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * `handleOpenSubmitProjectModal` ouvre la modale de soumission de projet pour un apprenant.
   * Charge les créneaux d'évaluation disponibles pour le projet sélectionné.
   * @param {object} project - Le projet à soumettre.
   */
  const handleOpenSubmitProjectModal = async (project) => {
    setCurrentProjectToSubmit(project);
    setProjectSubmissionRepoUrl("");
    setProjectSubmissionGithubPagesUrl("");
    setSuccess(null);

    console.log("[handleOpenSubmitProjectModal] Projet soumis:", project);
    console.log(
      "[handleOpenSubmitProjectModal] Module du projet:",
      project.module
    );

    try {
      const token = getAuthToken();
      // La sélection des créneaux est maintenant automatique au backend, pas besoin de les charger ici.
      // S'assurer que l'apprenant a les points d'évaluation nécessaires sera géré par le backend.
    } catch (e) {
      console.error(
        "Erreur lors de l'ouverture de la modale de soumission:",
        e
      );
      setErrorPopupMessage(
        "Erreur inattendue lors de la préparation de la soumission."
      );
      setShowErrorPopup(true);
      setPopupType("error");
    }

    setShowSubmitProjectModal(true);
  };

  /**
   * `handleCloseErrorPopup` ferme le popup d'erreur/avertissement et réinitialise son état.
   */
  const handleCloseErrorPopup = () => {
    setShowErrorPopup(false);
    setErrorPopupMessage("");
    setPopupType("error"); // Réinitialise le type à 'error' par défaut.
  };

  /**
   * `handleSubmitProject` gère la soumission d'une solution de projet par un apprenant.
   * Valide les créneaux sélectionnés et envoie les données de soumission au backend.
   * @param {Event} e - L'événement de soumission du formulaire.
   */
  const handleSubmitProject = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    setShowErrorPopup(false); // Réinitialiser le popup d'erreur au début de la soumission.
    setErrorPopupMessage("");
    setPopupType("error"); // S'assurer que le type est 'error' par défaut pour les erreurs de soumission.

    // Validation des champs de soumission.
    if (
      !currentProjectToSubmit ||
      (!isRepoUrlOptional && !projectSubmissionRepoUrl)
    ) {
      setErrorPopupMessage(
        "Veuillez fournir l'URL du dépôt GitHub pour soumettre le projet."
      );
      setShowErrorPopup(true);
      setPopupType("error");
      setLoading(false);
      return;
    }

    try {
      const token = getAuthToken();
      // Envoi de la soumission de projet à l'API.
      const res = await fetch(
        `${API}/projects/${currentProjectToSubmit.projectId}/submit-solution`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            assignmentId: currentProjectToSubmit.assignmentId,
            repoUrl: projectSubmissionRepoUrl,
            ...(requiresGithubPages && {
              githubPagesUrl: projectSubmissionGithubPagesUrl,
            }), // Ajoute conditionnellement githubPagesUrl
          }),
        }
      );
      const data = await res.json();

      if (res.ok) {
        setSuccess("Projet soumis avec succès ! Il sera évalué par vos pairs.");
        setShowSubmitProjectModal(false);
        setCurrentProjectToSubmit(null);
        setProjectSubmissionRepoUrl("");
        setProjectSubmissionGithubPagesUrl("");
        loadData(getAuthToken()); // Recharger les données pour refléter le changement de statut.
      } else {
        setErrorPopupMessage(data.error || "Échec de la soumission du projet.");
        setShowErrorPopup(true);
        setPopupType("error");
      }
    } catch (e) {
      console.error("Error submitting project:", e);
      setErrorPopupMessage(
        e.message || "Erreur lors de la communication avec le serveur."
      );
      setShowErrorPopup(true);
      setPopupType("error");
    } finally {
      setLoading(false);
    }
  };

  /**
   * `handleCloseSubmitProjectModal` ferme la modale de soumission de projet et réinitialise ses états.
   */
  const handleCloseSubmitProjectModal = () => {
    setShowSubmitProjectModal(false);
    setCurrentProjectToSubmit(null);
    setProjectSubmissionRepoUrl("");
    setProjectSubmissionGithubPagesUrl("");
    setSuccess(null);
    setShowErrorPopup(false);
    setErrorPopupMessage("");
    setPopupType("error");
  };

  // Affiche un écran de chargement si les données sont en cours de chargement.
  if (loading)
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
        <p className="ms-2">Chargement des projets...</p>
      </div>
    );
  // Affiche un message d'erreur si une erreur critique est survenue lors du chargement initial.
  if (error)
    return (
      <div className="alert alert-danger text-center mt-5">
        Error loading projects: {error}
      </div>
    );

  return (
    <div className="container-fluid mt-4 pt-5 px-4">
      <h1 className="mb-4">
        {me && (me.role === "staff" || me.role === "admin")
          ? "Gestion des Projets"
          : "Mes Projets"}
      </h1>
      {error && (
        <div className="alert alert-danger text-center mt-5">
          Error: {error}
        </div>
      )}

      {me && (me.role === "staff" || me.role === "admin") ? (
        // Vue pour Staff/Admin: Tableau de tous les projets avec fonctionnalités CRUD.
        <div className="row">
          <div className="col-12 mb-3 d-flex justify-content-end">
            <button
              className="btn thm-bg-light thm-shadow-s"
              onClick={handleShowAddProjectModal}
            >
              <i className="bi bi-plus-circle me-2"></i> Ajouter un Nouveau
              Projet
            </button>
          </div>
          <div className="col-12">
            {allProjects.length === 0 ? (
              <div className="alert alert-info text-center mt-4">
                <i className="bi bi-info-circle me-2"></i> Aucun projet
                disponible pour le moment.
              </div>
            ) : (
              <div className="card p-3 thm-bg thm-shadow-s">
                <table className="table table-dark table-hover thm-bg align-middle rounded-3 p-3">
                  <thead className="m-3">
                    <tr>
                      <th>Ordre</th>
                      <th>Titre du Projet</th>
                      <th className="text-start">Description</th>
                      <th className="text-center">Assignations</th>
                      <th className="text-center">Statut</th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="">
                    {allProjects.map((projectGroup) => {
                      const isAssignmentsExpanded =
                        !!expandedProjectAssignments[projectGroup._id];
                      const assignmentsCount =
                        projectGroup.assignments?.length || 0;

                      return (
                      <React.Fragment key={projectGroup._id}>
                        <tr>
                          <td>
                            <strong>{projectGroup.order}</strong>
                          </td>
                          <td>
                            <i className="bi bi-folder-fill me-2 text-primary"></i>
                            <strong>{projectGroup.title}</strong>
                          </td>
                          <td>
                            {(projectGroup.description || "").substring(0, 70)}
                            ...
                          </td>
                          <td className="text-center">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-2"
                              onClick={() => {
                                setExpandedProjectAssignments((prev) => ({
                                  ...prev,
                                  [projectGroup._id]: !prev[projectGroup._id],
                                }));
                              }}
                              aria-expanded={isAssignmentsExpanded}
                              aria-controls={`project-assignments-${projectGroup._id}`}
                              title={
                                isAssignmentsExpanded
                                  ? "Masquer les apprenants"
                                  : "Afficher les apprenants"
                              }
                            >
                              <i className="bi bi-people-fill"></i>
                              <span>{assignmentsCount}</span>
                              <i
                                className={`bi bi-chevron-${
                                  isAssignmentsExpanded ? "up" : "down"
                                }`}
                              ></i>
                            </button>
                          </td>
                          <td>
                            <span className="badge bg-secondary rounded-pill">
                              <i className="bi bi-puzzle-fill me-1"></i> Actif
                            </span>
                          </td>
                          <td className="text-center">
                            <div
                              className="btn-group btn-group-sm"
                              role="group"
                              aria-label="Actions pour projet maître"
                            >
                              <button
                                className="btn btn-outline-info"
                                onClick={() => handleEditProject(projectGroup)}
                                title="Modifier Projet Maître"
                              >
                                <i className="bi bi-pencil-square"></i>
                              </button>
                              <button
                                className="btn btn-outline-danger"
                                onClick={() =>
                                  handleDeleteProject(projectGroup)
                                }
                                title="Supprimer Projet Maître"
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isAssignmentsExpanded && (
                          <tr id={`project-assignments-${projectGroup._id}`}>
                            <td colSpan="6" className="p-0 border-0">
                              <div className="p-3 ms-3 me-3 mb-2 border-start border-success border-3 rounded thm-bg-light">
                                <h6 className="mb-3 d-flex align-items-center gap-2">
                                  <i className="bi bi-person-check"></i>
                                  Apprenants assignés
                                  <span className="badge bg-success rounded-pill">
                                    {assignmentsCount}
                                  </span>
                                </h6>
                                {assignmentsCount > 0 ? (
                                  <ul className="list-group list-group-flush">
                                    {projectGroup.assignments.map(
                                      (assignedProject) => (
                                        <li
                                          key={assignedProject._id}
                                          className="list-group-item thm-bg d-flex flex-wrap align-items-center justify-content-between gap-2 py-2"
                                        >
                                          <div className="d-flex flex-column">
                                            <strong>
                                              {assignedProject.student
                                                ? assignedProject.student.name
                                                : "N/A"}
                                            </strong>
                                            {assignedProject.student?.email && (
                                              <small className="text-muted">
                                                {assignedProject.student.email}
                                              </small>
                                            )}
                                          </div>
                                          <span
                                            className={`badge rounded-pill bg-${
                                              assignedProject.status ===
                                              "assigned"
                                                ? "warning text-dark"
                                                : assignedProject.status ===
                                                  "submitted"
                                                ? "info"
                                                : assignedProject.status ===
                                                  "awaiting_staff_review"
                                                ? "primary"
                                                : assignedProject.status ===
                                                  "approved"
                                                ? "success"
                                                : assignedProject.status ===
                                                  "rejected"
                                                ? "danger"
                                                : "secondary"
                                            }`}
                                          >
                                            <i
                                              className={`bi bi-${
                                                assignedProject.status ===
                                                "assigned"
                                                  ? "clock"
                                                  : assignedProject.status ===
                                                    "submitted"
                                                  ? "hourglass-split"
                                                  : assignedProject.status ===
                                                    "awaiting_staff_review"
                                                  ? "person-workspace"
                                                  : assignedProject.status ===
                                                    "approved"
                                                  ? "check-circle"
                                                  : assignedProject.status ===
                                                    "rejected"
                                                  ? "x-circle"
                                                  : "question-circle"
                                              } me-1`}
                                            ></i>
                                            {assignedProject.status ===
                                            "assigned"
                                              ? "Assigné"
                                              : assignedProject.status ===
                                                "submitted"
                                              ? "Soumis (en attente des pairs)"
                                              : assignedProject.status ===
                                                "awaiting_staff_review"
                                              ? "En attente de révision staff"
                                              : assignedProject.status ===
                                                "approved"
                                              ? "Approuvé"
                                              : assignedProject.status ===
                                                "rejected"
                                              ? "Rejeté"
                                              : "Inconnu"}
                                          </span>
                                        </li>
                                      )
                                    )}
                                  </ul>
                                ) : (
                                  <p className="mb-0 text-muted">
                                    <i className="bi bi-info-circle me-2"></i>
                                    Aucun apprenant assigné à ce projet.
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Vue pour Apprenant: Affichage des projets regroupés par modules.
        <div className="row">
          <div className="col-12 mb-4">
            <h3>Mes Projets</h3>
            {selectedModule ? (
              // Afficher les projets individuels pour le module sélectionné.
              <div className="mb-3">
                <button
                  className="btn thm-bg thm-shadow-s mb-3"
                  onClick={() => setSelectedModule(null)}
                >
                  <i className="bi bi-arrow-left me-2"></i> Retour aux Modules
                </button>
                <h4>Projets du module : {selectedModule}</h4>
                <div className="row mt-3">
                  {groupedProjectsByModule[selectedModule] &&
                  groupedProjectsByModule[selectedModule].length > 0 ? (
                    groupedProjectsByModule[selectedModule].map((project) => (
                      <div key={project._id} className="col-md-6 col-lg-4 mb-4">
                        <div
                          className="thm-bg thm-shadow-s rounded-3 p-3 h-100 shadow-hover-3d border-0"
                          onClick={() => handleCardClick(project)}
                          style={{ cursor: "pointer" }}
                        >
                          <div className="d-flex flex-column">
                            <div className="">
                              <h5 className="card-title mb-2">
                                <i className="bi bi-folder-check me-2"></i>{" "}
                                {project.title}
                              </h5>
                              {project.templateProject &&
                                project.templateProject.order && (
                                  <p className="card-text">
                                    <small>
                                      (Projet {project.templateProject.order})
                                    </small>
                                  </p>
                                )}
                            </div>
                            <div className="mt-3 mb-3 d-flex align-items-center">
                              <span
                                className={`badge rounded-pill bg-${
                                  project.assignmentStatus === "assigned"
                                    ? "warning text-dark"
                                    : project.assignmentStatus === "submitted"
                                    ? "info"
                                    : project.assignmentStatus === "approved"
                                    ? "success"
                                    : project.assignmentStatus === "rejected"
                                    ? "danger"
                                    : "secondary"
                                } me-2`}
                              >
                                <i
                                  className={`bi bi-${
                                    project.assignmentStatus === "assigned"
                                      ? "clock"
                                      : project.assignmentStatus === "submitted"
                                      ? "hourglass-split"
                                      : project.assignmentStatus === "approved"
                                      ? "check-circle"
                                      : project.assignmentStatus === "rejected"
                                      ? "x-circle"
                                      : "question-circle"
                                  } me-1`}
                                ></i>
                                {project.assignmentStatus === "assigned"
                                  ? "Assigné"
                                  : project.assignmentStatus === "submitted"
                                  ? "Soumis (en attente d'évaluation)"
                                  : project.assignmentStatus === "approved"
                                  ? "Approuvé"
                                  : project.assignmentStatus === "rejected"
                                  ? "Rejeté"
                                  : "Inconnu"}
                              </span>
                              {project.assignmentStatus === "approved" && (
                                <span className="text-success small">
                                  <i className="bi bi-trophy-fill me-1"></i>{" "}
                                  Projet Approuvé !
                                </span>
                              )}
                            </div>
                            {project.assignmentStatus === "assigned" && (
                              <div className="mt-auto">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if ((me?.evaluationPoints ?? 0) < 1) {
                                      setErrorPopupMessage(
                                        "Vous devez avoir au moins 1 point d'évaluation pour soumettre un projet."
                                      );
                                      setPopupType("error");
                                      setShowErrorPopup(true);
                                      return;
                                    }
                                    handleOpenSubmitProjectModal(project);
                                  }}
                                  className="btn btn-primary w-100 btn-sm"
                                  title="Soumettre ce projet"
                                  disabled={(me?.evaluationPoints ?? 0) < 1}
                                >
                                  <i className="bi bi-upload me-2"></i>
                                  Soumettre le Projet
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="alert alert-info text-center mt-3">
                      <i className="bi bi-info-circle me-2"></i> Aucun projet
                      disponible pour ce module.
                    </div>
                  )}
                </div>
              </div>
            ) : // Afficher les cartes de module.
            Object.keys(groupedProjectsByModule).length > 0 ? (
              <div className="row">
                {Object.entries(groupedProjectsByModule).map(
                  ([moduleName, projectsInModule]) => (
                    <div key={moduleName} className="col-md-6 col-lg-4 mb-4">
                      <div
                        className="thm-bg thm-shadow-s card h-100 shadow-hover-3d border-0 module-card"
                        onClick={() => setSelectedModule(moduleName)}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="card-body d-flex flex-column justify-content-center align-items-center">
                          <i className="bi bi-folder-fill fs-1 mb-3"></i>
                          <h5 className="card-title text-center">
                            {moduleName}
                          </h5>
                          <p className="card-text">
                            {projectsInModule.length} projet(s)
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="alert alert-info text-center mt-3">
                <i className="bi bi-info-circle me-2"></i> Aucun projet assigné
                pour le moment.
              </div>
            )}
          </div>

          {/* Ancienne section "Corrections à Venir" supprimée pour éviter les erreurs de compilation */}
        </div>
      )}

      {/* Modale d'affichage des détails du projet (pour apprenant) */}
      {me && me.role === "apprenant" && showProjectModal && selectedProject && (
        <div className="modal" tabIndex="-1" style={{ display: "block" }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-gradient thm-bg text-white">
                <h5 className="modal-title d-flex align-items-center">
                  <i className="bi bi-folder-check me-2"></i> Détails du Projet:{" "}
                  {selectedProject.title}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCloseModal}
                ></button>
              </div>
              <div className="modal-body thm-bg">
                {/* Bannière de félicitations pour les projets approuvés */}
                {selectedProject.status === "approved" &&
                  selectedProject.type === "my_project" && (
                    <div className="alert alert-success border-0 mb-4">
                      <div className="d-flex align-items-center">
                        <i className="bi bi-trophy-fill fs-1 me-3 text-warning"></i>
                        <div>
                          <h5 className="mb-1">🎉 Félicitations !</h5>
                          <p className="mb-0">
                            Votre projet a été approuvé avec succès. Excellent
                            travail !
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Message spécifique pour les projets à évaluer */}
                {selectedProject.type === "to_evaluate" && (
                  <div className="alert alert-warning border-0 mb-4">
                    <div className="d-flex align-items-center">
                      <i className="bi bi-pencil-square fs-1 me-3 text-warning"></i>
                      <div>
                        <h5 className="mb-1">Projet à Évaluer</h5>
                        <p className="mb-0">
                          Ceci est un projet soumis par{" "}
                          <strong>{selectedProject.student.name}</strong> en
                          attente de votre évaluation.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="row">
                  <div className="">
                    <h6 className=" mb-3">Informations du Projet</h6>

                    {/* Lecteur Vidéo de Démonstration */}
                    {selectedProject.demoVideoUrl &&
                      getEmbedUrl(selectedProject.demoVideoUrl) && (
                        <div className="thm-bg-light p-3 rounded-3 mb-3 shadow-sm">
                          <div className="card-body">
                            <h6 className="d-flex align-items-center">
                              <i className="bi bi-play-circle me-2"></i> Vidéo
                              de Démonstration
                            </h6>
                            <div className="ratio ratio-16x9">
                              <iframe
                                src={getEmbedUrl(selectedProject.demoVideoUrl)}
                                title="Vidéo de démonstration du projet"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                loading="lazy"
                              ></iframe>
                            </div>
                          </div>
                        </div>
                      )}

                    {/* Section Description */}
                    <div className="thm-bg-light p-3 rounded-3 mb-3 shadow-sm">
                      <div className="">
                        <h6 className="d-flex align-items-center">
                          <i className="bi bi-journal-text me-2"></i>{" "}
                          Description
                        </h6>
                        <HtmlRenderer
                          htmlContent={selectedProject.description}
                        />
                      </div>
                    </div>

                    {/* Objectives */}
                    {selectedProject.objectives &&
                      (selectedProject.objectives || []).length > 0 && (
                        <div className="thm-bg-light p-3 rounded-3 mb-3 shadow-sm">
                          <div className="">
                            <h6 className="d-flex align-items-center ">
                              <i className="bi bi-bullseye me-2"></i> Objectifs
                            </h6>
                            <ul>
                              {(selectedProject.objectives || []).map(
                                (objective, index) => (
                                  <li
                                    key={index}
                                    className="d-flex align-items-start border-0 py-1 px-0"
                                  >
                                    <p>
                                      <i className="bi bi-check-lg text-success me-2 mt-1"></i>{" "}
                                      {objective}
                                    </p>
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        </div>
                      )}

                    {/* Spécifications */}
                    {selectedProject.specifications &&
                      (selectedProject.specifications || []).length > 0 && (
                        <div className="thm-bg-light p-3 rounded-3 mb-3 shadow-sm">
                          <div className="">
                            <h6 className=" d-flex align-items-center ">
                              <i className="bi bi-file-earmark-text me-2"></i>{" "}
                              Spécifications
                            </h6>
                            <ul className="">
                              {(selectedProject.specifications || []).map(
                                (spec, index) => (
                                  <li
                                    key={index}
                                    className="d-flex align-items-start border-0 py-1 px-0"
                                  >
                                    <p>
                                      <i className="bi bi-check-lg text-success me-2 mt-1"></i>{" "}
                                      {spec}
                                    </p>
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        </div>
                      )}

                    {/* Section Style-Guide (Markdown) */}
                    {projectMarkdownContent && (
                      <div className="thm-bg-light p-3 rounded-3 mb-3 shadow-sm">
                        <div className="">
                          <h6 className="d-flex align-items-center">
                            <i className="bi bi-book me-2"></i> Style-Guide
                          </h6>
                          <div
                            className="markdown-content"
                            dangerouslySetInnerHTML={{
                              __html: marked.parse(projectMarkdownContent),
                            }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Statut avec icône */}
                    {selectedProject.assignmentStatus && (
                      <div className="thm-bg-light p-3 rounded-3 mb-3 shadow-sm">
                        <div className="d-flex align-items-center">
                          <h6 className="mb-0 me-2">
                            <i className="bi bi-info-circle me-2"></i> Statut:
                          </h6>
                          <span
                            className={`badge rounded-pill bg-${(() => {
                              if (
                                selectedProject.assignmentStatus === "assigned"
                              )
                                return "primary";
                              if (
                                selectedProject.assignmentStatus === "submitted"
                              )
                                return "warning text-dark";
                              if (
                                selectedProject.assignmentStatus ===
                                "pending_review"
                              )
                                return "info";
                              if (
                                selectedProject.assignmentStatus === "approved"
                              )
                                return "success";
                              if (
                                selectedProject.assignmentStatus === "rejected"
                              )
                                return "danger";
                              return "secondary"; // Fallback
                            })()}`}
                          >
                            <i
                              className={`bi bi-${(() => {
                                if (
                                  selectedProject.assignmentStatus ===
                                  "assigned"
                                )
                                  return "clock";
                                if (
                                  selectedProject.assignmentStatus ===
                                  "submitted"
                                )
                                  return "hourglass-split";
                                if (
                                  selectedProject.assignmentStatus ===
                                  "pending_review"
                                )
                                  return "person-workspace";
                                if (
                                  selectedProject.assignmentStatus ===
                                  "approved"
                                )
                                  return "check-circle";
                                if (
                                  selectedProject.assignmentStatus ===
                                  "rejected"
                                )
                                  return "x-circle";
                                return "question-circle";
                              })()} me-1`}
                            ></i>
                            {(() => {
                              if (
                                selectedProject.assignmentStatus === "assigned"
                              )
                                return "Assigné";
                              if (
                                selectedProject.assignmentStatus === "submitted"
                              )
                                return "Soumis (en attente)";
                              if (
                                selectedProject.assignmentStatus ===
                                "pending_review"
                              )
                                return "En attente Staff";
                              if (
                                selectedProject.assignmentStatus === "approved"
                              )
                                return "Approuvé";
                              if (
                                selectedProject.assignmentStatus === "rejected"
                              )
                                return "Rejeté";
                              return "Statut Inconnu";
                            })()}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Date de Soumission */}
                    {selectedProject.submissionDate && (
                      <div className="card thm-bg-light mb-3 shadow-sm">
                        <div className="card-body d-flex align-items-center">
                          <h6 className="mb-0 me-2 text-primary">
                            <i className="bi bi-calendar-event me-2"></i> Date
                            de Soumission:
                          </h6>
                          <span>
                            {new Date(
                              selectedProject.submissionDate
                            ).toLocaleDateString("fr-FR", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    )}

                    {selectedProject.repoUrl && (
                      <div className="card thm-bg-light mb-3 shadow-sm">
                        <div className="card-body d-flex align-items-center">
                          <h6 className="mb-0 me-2 text-primary">
                            <i className="bi bi-github me-2"></i> Dépôt du
                            projet soumis:
                          </h6>
                          <a
                            href={selectedProject.repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-info text-decoration-none"
                          >
                            {selectedProject.repoUrl}
                          </a>
                        </div>
                      </div>
                    )}

                    {selectedProject.githubPagesUrl && (
                      <div className="card thm-bg-light mb-3 shadow-sm">
                        <div className="card-body d-flex align-items-center">
                          <h6 className="mb-0 me-2 text-primary">
                            <i className="bi bi-globe me-2"></i> GitHub Pages:
                          </h6>
                          <a
                            href={selectedProject.githubPagesUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-info text-decoration-none"
                          >
                            {selectedProject.githubPagesUrl}
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Resource Links */}
                    {selectedProject.resourceLinks &&
                      (selectedProject.resourceLinks || []).length > 0 && (
                        <div className="thm-bg-light p-3 rounded-3 mb-3 shadow-sm">
                          <div className="">
                            <h6 className="d-flex align-items-center">
                              <i className="bi bi-link-45deg me-2"></i>{" "}
                              Ressources Supplémentaires
                            </h6>
                            <ul className="">
                              {(selectedProject.resourceLinks || []).map(
                                (link, index) => (
                                  <li
                                    key={index}
                                    className="d-flex align-items-start border-0 py-1 px-0"
                                  >
                                    <i className="bi bi-box-arrow-up-right text-info me-2 mt-1"></i>
                                    <a
                                      href={link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-info text-decoration-none"
                                    >
                                      {link}
                                    </a>
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        </div>
                      )}

                    {selectedProject.exerciseStatements &&
                      (selectedProject.exerciseStatements || []).length > 0 && (
                        <div className="thm-bg-light p-3 rounded-3 mb-3 shadow-sm">
                          <div className="container pt-3">
                            <h6 className="card-title d-flex align-items-center mb-4 mt-3">
                              <i className="bi bi-list-task me-2"></i> Énoncés
                              d'Exercice
                            </h6>
                            <ul className="">
                              {(selectedProject.exerciseStatements || []).map(
                                (statement, index) => (
                                  <li
                                    key={index}
                                    className="align-items-start border-0 py-1 px-0"
                                  >
                                    <h5>Exercice N°{index + 1}</h5>
                                    <div>
                                      <HtmlRenderer htmlContent={statement} />
                                    </div>
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              </div>
              <div className="modal-footer thm-bg">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseModal}
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {me && me.role === "apprenant" && showProjectModal && (
        <div className="modal-backdrop fade show"></div>
      )}

      {/* Modale pour ajouter/modifier un projet (staff/admin) */}
      {me &&
        (me.role === "staff" || me.role === "admin") &&
        (showAddProjectModal || showEditProjectModal) && (
          <div className="modal" tabIndex="-1" style={{ display: "block" }}>
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header bg-gradient thm-bg text-white">
                  <h5 className="modal-title">
                    {currentProjectToEdit
                      ? "Modifier le Projet"
                      : "Ajouter un Projet"}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowAddProjectModal(false);
                      setShowEditProjectModal(false);
                      setCurrentProjectToEdit(null);
                    }}
                  ></button>
                </div>
                <div className="modal-body thm-bg">
                  {error && (
                    <div className="alert alert-danger mb-3" role="alert">
                      {error}
                    </div>
                  )}
                  <form
                    onSubmit={
                      currentProjectToEdit
                        ? handleUpdateProject
                        : handleAddProject
                    }
                  >
                    {/* Titre */}
                    <div className="mb-3">
                      <label htmlFor="projectTitle" className="form-label">
                        Titre du Projet
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="projectTitle"
                        value={projectTitle}
                        onChange={(e) => setProjectTitle(e.target.value)}
                        required
                      />
                    </div>

                    {/* Objectifs */}
                    <div className="mb-3">
                      <label
                        htmlFor="projectObjectives"
                        className="form-label d-block"
                      >
                        Objectifs (Optionnel)
                      </label>
                      {projectObjectives.map((objective, index) => (
                        <div key={index} className="input-group mb-2">
                          <input
                            type="text"
                            className="form-control"
                            value={objective}
                            onChange={(e) => {
                              const newObjectives = [...projectObjectives];
                              newObjectives[index] = e.target.value;
                              setProjectObjectives(newObjectives);
                            }}
                            placeholder="Entrez un objectif"
                          />
                          <button
                            className="btn btn-outline-danger"
                            type="button"
                            onClick={() => {
                              const newObjectives = projectObjectives.filter(
                                (_, i) => i !== index
                              );
                              setProjectObjectives(newObjectives);
                            }}
                          >
                            <i className="bi bi-x"></i>
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="btn btn-sm thm-bg-light thm-shadow-s mt-2"
                        onClick={() =>
                          setProjectObjectives([...projectObjectives, ""])
                        }
                      >
                        <i className="bi bi-plus-circle me-2"></i> Ajouter un
                        objectif
                      </button>
                      <div className="form-text ">
                        <p>
                          Décrivez les principaux objectifs que l'apprenant doit
                          atteindre.
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="mb-3">
                      <label
                        htmlFor="projectDescription"
                        className="form-label"
                      >
                        Description <span className="text-danger">*</span>
                      </label>
                      <textarea
                        className="form-control"
                        id="projectDescription"
                        rows="3"
                        value={projectDescription}
                        onChange={(e) => setProjectDescription(e.target.value)}
                        required
                      ></textarea>
                    </div>

                    {/* Upload Fichier Markdown (Optionnel) */}
                    <div className="mb-3">
                      <label htmlFor="markdownFile" className="form-label">
                        Fichier Markdown (Optionnel, .md)
                      </label>
                      <input
                        type="file"
                        className="form-control"
                        id="markdownFile"
                        accept=".md"
                        onChange={(e) => setMarkdownFile(e.target.files[0])}
                      />
                      {existingMarkdownUrl && (
                        <div className="d-flex align-items-center mt-2">
                          <p className="mb-0 me-2">
                            Fichier existant:{" "}
                            <a
                              href={existingMarkdownUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Voir le .md
                            </a>
                          </p>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => {
                              setExistingMarkdownUrl(null);
                              // Une option pour indiquer au backend de supprimer le fichier existant
                              // Nous gérons cela côté backend via `clearMarkdown` dans updateFields
                            }}
                          >
                            <i className="bi bi-x-circle me-1"></i> Supprimer le
                            fichier
                          </button>
                        </div>
                      )}
                      <div className="form-text">
                        <p>
                          Téléchargez un fichier Markdown pour la description
                          détaillée du projet.
                        </p>
                      </div>
                    </div>

                    {/* Spécifications */}
                    <div className="mb-3">
                      <label
                        htmlFor="projectSpecifications"
                        className="form-label d-block"
                      >
                        Spécifications (Optionnel)
                      </label>
                      {projectSpecifications.map((spec, index) => (
                        <div key={index} className="input-group mb-2">
                          <textarea
                            className="form-control"
                            rows="2"
                            value={spec}
                            onChange={(e) => {
                              const newSpecs = [...projectSpecifications];
                              newSpecs[index] = e.target.value;
                              setProjectSpecifications(newSpecs);
                            }}
                            placeholder="Entrez une spécification"
                          ></textarea>
                          <button
                            className="btn btn-outline-danger"
                            type="button"
                            onClick={() => {
                              const newSpecs = projectSpecifications.filter(
                                (_, i) => i !== index
                              );
                              setProjectSpecifications(newSpecs);
                            }}
                          >
                            <i className="bi bi-x"></i>
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary mt-2"
                        onClick={() =>
                          setProjectSpecifications([
                            ...projectSpecifications,
                            "",
                          ])
                        }
                      >
                        <i className="bi bi-plus-circle me-2"></i> Ajouter une
                        spécification
                      </button>
                    </div>

                    {/* Liens de Ressources */}
                    <div className="mb-3">
                      <label
                        htmlFor="projectResourceLinks"
                        className="form-label"
                      >
                        Liens de Ressources (un par ligne, Optionnel)
                      </label>
                      {projectResourceLinks.map((link, index) => (
                        <div key={index} className="input-group mb-2">
                          <input
                            type="url"
                            className="form-control"
                            value={link}
                            onChange={(e) => {
                              const newLinks = [...projectResourceLinks];
                              newLinks[index] = e.target.value;
                              setProjectResourceLinks(newLinks);
                            }}
                            placeholder="https://example.com/doc.pdf"
                          />
                          <button
                            className="btn btn-outline-danger"
                            type="button"
                            onClick={() => {
                              const newLinks = projectResourceLinks.filter(
                                (_, i) => i !== index
                              );
                              setProjectResourceLinks(newLinks);
                            }}
                          >
                            <i className="bi bi-x"></i>
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary mt-2"
                        onClick={() =>
                          setProjectResourceLinks([...projectResourceLinks, ""])
                        }
                      >
                        <i className="bi bi-plus-circle me-2"></i> Ajouter un
                        lien
                      </button>
                      <div className="form-text">
                        <p>
                          Fournissez des liens vers des documentations,
                          tutoriels, ou autres ressources utiles.
                        </p>
                      </div>
                    </div>

                    {/* URL Vidéo de Démonstration (Optionnel) */}
                    <div className="mb-3">
                      <label
                        htmlFor="projectDemoVideoUrl"
                        className="form-label"
                      >
                        URL Vidéo de Démonstration (Optionnel)
                      </label>
                      <input
                        type="url"
                        className="form-control"
                        id="projectDemoVideoUrl"
                        value={projectDemoVideoUrl}
                        onChange={(e) => setProjectDemoVideoUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=exemple"
                      />
                    </div>

                    {/* Champ pour les énoncés d'exercice */}
                    <div className="mb-3">
                      <label
                        htmlFor="projectExerciseStatements"
                        className="form-label d-block"
                      >
                        Énoncés d'Exercice
                      </label>
                      {projectExerciseStatements.map((statement, index) => (
                        <div key={index} className="input-group mb-2">
                          <input
                            type="text"
                            className="form-control"
                            value={statement}
                            onChange={(e) => {
                              const newStatements = [
                                ...projectExerciseStatements,
                              ];
                              newStatements[index] = e.target.value;
                              setProjectExerciseStatements(newStatements);
                            }}
                            placeholder="Entrez un énoncé d'exercice"
                          />
                          <button
                            className="btn btn-outline-danger"
                            type="button"
                            onClick={() => {
                              const newStatements =
                                projectExerciseStatements.filter(
                                  (_, i) => i !== index
                                );
                              setProjectExerciseStatements(newStatements);
                            }}
                          >
                            <i className="bi bi-x"></i>
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary mt-2"
                        onClick={() =>
                          setProjectExerciseStatements([
                            ...projectExerciseStatements,
                            "",
                          ])
                        }
                      >
                        <i className="bi bi-plus-circle me-2"></i> Ajouter un
                        énoncé d'exercice
                      </button>
                      <div className="form-text">
                        <p>
                          Ajoutez les étapes ou les consignes de l'exercice, une
                          par ligne.
                        </p>
                      </div>
                    </div>

                    {/* Ordre du Projet (Numéro) */}
                    <div className="mb-3">
                      <label htmlFor="projectOrder" className="form-label">
                        Ordre du Projet <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        id="projectOrder"
                        value={projectOrder}
                        onChange={(e) =>
                          setProjectOrder(parseInt(e.target.value, 10))
                        }
                        required
                      />
                      <div className="form-text">
                        <p>
                          Définissez un numéro d'ordre pour ce projet (ex: 1, 2,
                          3...).
                        </p>
                      </div>
                    </div>

                    {/* Taille du Projet */}
                    <div className="mb-3">
                      <label htmlFor="projectSize" className="form-label">
                        Taille du Projet <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        id="projectSize"
                        value={projectSize}
                        onChange={(e) => setProjectSize(e.target.value)}
                        required
                      >
                        <option value="short">Court (1 jour)</option>
                        <option value="medium">Moyen (2 jours)</option>
                        <option value="long">Long (3 jours)</option>
                      </select>
                    </div>

                    {/* Module */}
                    <div className="mb-3">
                      <label htmlFor="projectModule" className="form-label">
                        Module <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        id="projectModule"
                        value={projectModule}
                        onChange={(e) => setProjectModule(e.target.value)}
                        required
                      >
                        <option value="">Sélectionner un module</option>
                        <option value="CLI/Git & GIt Hub">
                          CLI/Git & GIt Hub
                        </option>
                        <option value="HTML / CSS">HTML / CSS</option>
                        <option value="Framework">Framework</option>
                        <option value="WordPress">WordPress</option>
                        <option value="JavaScript">JavaScript</option>
                        <option value="Node Js (API)">Node Js (API)</option>
                        <option value="React JS">React JS</option>
                        <option value="Electron JS">Electron JS</option>
                        <option value="Mobile">Mobile</option>
                        <option value="Full Stack">Full Stack</option>
                        <option value="Soft Skills">Soft Skills</option>
                      </select>
                      <div className="form-text">
                        <p>
                          Sélectionnez le module auquel appartient le projet.
                        </p>
                      </div>
                    </div>

                    <button type="submit" className="btn btn-success mt-3">
                      {currentProjectToEdit ? "Modifier" : "Ajouter"} le Projet
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      {me &&
        (me.role === "staff" || me.role === "admin") &&
        (showAddProjectModal || showEditProjectModal) && (
          <div className="modal-backdrop fade show"></div>
        )}

      {/* Modale de confirmation de suppression de projet (staff/admin) */}
      {me &&
        (me.role === "staff" || me.role === "admin") &&
        showDeleteProjectModal &&
        currentProjectToDelete && (
          <div className="modal" tabIndex="-1" style={{ display: "block" }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header bg-gradient bg-danger text-white">
                  <h5 className="modal-title">Confirmer la Suppression</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowDeleteProjectModal(false);
                      setCurrentProjectToDelete(null);
                      setConfirmProjectTitle("");
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  {error && (
                    <div className="alert alert-danger mb-3" role="alert">
                      {error}
                    </div>
                  )}
                  <p>
                    Êtes-vous sûr de vouloir supprimer le projet "
                    <strong>{currentProjectToDelete.title}</strong>" ? Cette
                    action est irréversible.
                  </p>
                  <p>
                    Veuillez taper le titre du projet (exactement) pour
                    confirmer :
                  </p>
                  <input
                    type="text"
                    className="form-control"
                    value={confirmProjectTitle}
                    onChange={(e) => setConfirmProjectTitle(e.target.value)}
                    placeholder={currentProjectToDelete.title}
                  />
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowDeleteProjectModal(false);
                      setCurrentProjectToDelete(null);
                      setConfirmProjectTitle("");
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleDeleteProjectConfirmed}
                    disabled={
                      confirmProjectTitle !== currentProjectToDelete.title
                    } // Désactivé si le titre ne correspond pas
                  >
                    <i className="bi bi-trash me-2"></i> Supprimer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      {me &&
        (me.role === "staff" || me.role === "admin") &&
        showDeleteProjectModal && (
          <div className="modal-backdrop fade show"></div>
        )}

      {/* Modale de soumission de projet (apprenant) */}
      {me &&
        me.role === "apprenant" &&
        showSubmitProjectModal &&
        currentProjectToSubmit && (
          <div className="modal" tabIndex="-1" style={{ display: "block" }}>
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header bg-gradient thm-bg">
                  <h5 className="modal-title">
                    <i className="bi bi-upload me-2"></i>
                    Soumettre le Projet: {currentProjectToSubmit.title}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={handleCloseSubmitProjectModal}
                  ></button>
                </div>
                <div className="modal-body thm-bg-light">
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

                  <form onSubmit={handleSubmitProject}>
                    <div className="mb-3">
                      <label htmlFor="repoUrl" className="form-label">
                        <i className="bi bi-github me-1"></i>
                        URL du Dépôt GitHub{" "}
                        {!isRepoUrlOptional && (
                          <span className="text-danger">*</span>
                        )}
                      </label>
                      <input
                        type="url"
                        className="form-control form-control-lg"
                        id="repoUrl"
                        value={projectSubmissionRepoUrl}
                        onChange={(e) =>
                          setProjectSubmissionRepoUrl(e.target.value)
                        }
                        placeholder="https://github.com/votre-username/votre-projet"
                        required={!isRepoUrlOptional}
                      />
                      <div className="form-text">
                        <p>
                          Assurez-vous que votre dépôt est public et contient le
                          code source du projet.
                        </p>
                      </div>
                    </div>

                    {/* Champ pour l'URL GitHub Pages (conditionnel) */}
                    {requiresGithubPages && (
                      <div className="mb-3">
                        <label htmlFor="githubPagesUrl" className="form-label">
                          <i className="bi bi-globe me-1"></i>
                          URL GitHub Pages{" "}
                          <span className="text-danger">*</span>
                        </label>
                        <input
                          type="url"
                          className="form-control form-control-lg"
                          id="githubPagesUrl"
                          value={projectSubmissionGithubPagesUrl}
                          onChange={(e) =>
                            setProjectSubmissionGithubPagesUrl(e.target.value)
                          }
                          placeholder="https://username.github.io/repo-name/"
                          required
                        />
                        <div className="form-text">
                          <p>
                            L'URL de la page GitHub Pages de votre projet (pour
                            les modules HTML/CSS et Framework).
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Message informant l'utilisateur que les créneaux seront choisis automatiquement */}
                    <div className="mb-4 p-3 bg-light border rounded">
                      <p className="mb-0 ">
                        <i className="bi bi-info-circle me-2"></i>
                        Les deux créneaux d'évaluation seront automatiquement et
                        aléatoirement sélectionnés pour vous après la
                        soumission.
                      </p>
                    </div>
                  </form>
                </div>
                <div className="modal-footer thm-bg">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCloseSubmitProjectModal}
                  >
                    <i className="bi bi-x-circle me-2"></i> Annuler
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    onClick={handleSubmitProject}
                    disabled={
                      loading ||
                      (!isRepoUrlOptional && !projectSubmissionRepoUrl) ||
                      (requiresGithubPages && !projectSubmissionGithubPagesUrl)
                    }
                  >
                    {loading ? (
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
                        <i className="bi bi-upload me-2"></i>
                        Soumettre le Projet
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      {me && me.role === "apprenant" && showSubmitProjectModal && (
        <div className="modal-backdrop fade show"></div>
      )}

      {/* Modale d'erreur personnalisée */}
      {showErrorPopup && (
        <div className="modal" tabIndex="-1" style={{ display: "block" }}>
          <div className="modal-dialog modal-sm">
            <div className="modal-content">
              <div
                className={`modal-header bg-${
                  popupType === "warning"
                    ? "warning text-dark"
                    : "danger text-white"
                }`}
              >
                <h5 className="modal-title">
                  <i className={`bi bi-exclamation-triangle me-2`}></i>{" "}
                  {popupType === "warning" ? "Avertissement" : "Erreur"}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={handleCloseErrorPopup}
                ></button>
              </div>
              <div className="modal-body">
                <p>{errorPopupMessage}</p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className={`btn btn-${
                    popupType === "warning" ? "warning text-dark" : "danger"
                  }`}
                  onClick={handleCloseErrorPopup}
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showErrorPopup && <div className="modal-backdrop fade show"></div>}
    </div>
  );
}

export default ProjectsPage;
