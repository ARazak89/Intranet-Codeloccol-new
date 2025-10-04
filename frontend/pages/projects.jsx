import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { getAuthToken } from '../utils/auth';
import React from 'react'; // Added for React.Fragment

import HtmlRenderer from '../utils/HtmlRenderer';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// Fonction utilitaire pour s'assurer que les propriétés sont des tableaux
const sanitizeProjectArrays = (project) => ({
  ...project,
  objectives: project.objectives || [],
  specifications: project.specifications || [],
  exerciseStatements: project.exerciseStatements || [],
  resourceLinks: project.resourceLinks || [],
});

function ProjectsPage() {
  const [projects, setProjects] = useState([]); // Garde pour les projets combinés si besoin, ou réaffecter
  const [myProjects, setMyProjects] = useState([]); // NOUVEL ÉTAT pour les projets de l'apprenant
  const [projectsToEvaluate, setProjectsToEvaluate] = useState([]); // NOUVEL ÉTAT pour les projets à évaluer
  const [groupedProjectsByModule, setGroupedProjectsByModule] = useState({}); // Nouveau: Projets regroupés par module
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showProjectModal, setShowProjectModal] = useState(false); // Nouvel état pour la modale
  const [selectedProject, setSelectedProject] = useState(null); // Nouvel état pour le projet sélectionné
  const [me, setMe] = useState(null); // Pour stocker les infos de l'utilisateur (rôle)
  const [allProjects, setAllProjects] = useState([]); // Pour stocker tous les projets (staff/admin)
  const allProjectsRef = useRef(allProjects); // Créez une réf pour allProjects
  
  // Synchronisez la réf avec l'état actuel d'allProjects
  useEffect(() => {
    allProjectsRef.current = allProjects;
  }, [allProjects]);

  // États pour les modales CRUD des projets
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [showDeleteProjectModal, setShowDeleteProjectModal] = useState(false);
  const [currentProjectToEdit, setCurrentProjectToEdit] = useState(null);
  const [currentProjectToDelete, setCurrentProjectToDelete] = useState(null);
  const [confirmProjectTitle, setConfirmProjectTitle] = useState('');
  const [selectedModule, setSelectedModule] = useState(null); // Nouveau champ pour le module sélectionné
  // États pour le formulaire d'ajout/modification de projet
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectRepoUrl, setProjectRepoUrl] = useState('');
  const [projectDemoVideoUrl, setProjectDemoVideoUrl] = useState('');
  const [projectSpecifications, setProjectSpecifications] = useState([]); // Changé de chaîne à tableau
  const [projectSize, setProjectSize] = useState('short');
  const [projectExerciseStatements, setProjectExerciseStatements] = useState([]); // Changé de chaîne à tableau
  const [projectResourceLinks, setProjectResourceLinks] = useState([]); // Changé de chaîne à tableau
  const [projectObjectives, setProjectObjectives] = useState([]); // Changé de chaîne à tableau
  const [projectOrder, setProjectOrder] = useState(0); // Nouvel état pour l'ordre du projet
  const [projectModule, setProjectModule] = useState(''); // Nouveau champ pour le module
  
  // États pour la soumission de projet par un apprenant
  const [showSubmitProjectModal, setShowSubmitProjectModal] = useState(false);
  const [currentProjectToSubmit, setCurrentProjectToSubmit] = useState(null);
  const [projectSubmissionRepoUrl, setProjectSubmissionRepoUrl] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlotIds, setSelectedSlotIds] = useState([]);
  const [success, setSuccess] = useState(null);
  const [showErrorPopup, setShowErrorPopup] = useState(false); // Nouvel état pour le popup d'erreur
  const [errorPopupMessage, setErrorPopupMessage] = useState(''); // Message pour le popup d'erreur
  const [popupType, setPopupType] = useState('error'); // 'error' ou 'warning'
  
  const router = useRouter();

  const loadData = useCallback(async (token) => {
      try {
        setLoading(true);
    setError(null);

        // Charger les informations de l'utilisateur
        const userRes = await fetch(`${API}/users/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (!userRes.ok) {
          const errorData = await userRes.json();
          throw new Error(errorData.error || 'Échec du chargement des données utilisateur.');
        }
        const userData = await userRes.json();
        setMe(userData);

        // Chargement conditionnel des projets
        let projectsToSet = [];
        if (userData.role === 'staff' || userData.role === 'admin') {
        // Pour staff/admin: charger tous les projets templates avec leurs assignations peuplées
          const allProjectsRes = await fetch(`${API}/projects/all`, { headers: { Authorization: `Bearer ${token}` } });
          if (!allProjectsRes.ok) {
            const errorData = await allProjectsRes.json();
          throw new Error(errorData.error || 'Échec du chargement de tous les projets maîtres.');
          }
          const rawProjects = await allProjectsRes.json();
        // Assainir les projets maîtres et leurs assignations
        const sanitizedProjects = rawProjects.map(project => ({
          ...sanitizeProjectArrays(project),
          assignments: (project.assignments || []).map(assign => ({
            ...assign,
            student: assign.student ? { _id: assign.student._id, name: assign.student.name, email: assign.student.email } : null, // S'assurer que student est un objet
            evaluations: (assign.evaluations || []).map(evalItem => ({
              ...evalItem,
              evaluator: evalItem.evaluator ? { _id: evalItem.evaluator._id, name: evalItem.evaluator.name } : null,
            })),
          })),
        }));
        setAllProjects(sanitizedProjects);
        setProjects([]); // Les apprenants n'ont pas de projets "template" directement ici
        } else {
        // Pour apprenant: charger leurs projets maîtres avec leurs assignations
          const myProjectsRes = await fetch(`${API}/projects/my-projects`, { headers: { Authorization: `Bearer ${token}` } });
          if (!myProjectsRes.ok) {
            const errorData = await myProjectsRes.json();
            throw new Error(errorData.error || 'Échec du chargement de mes projets.');
          }
          const rawProjects = await myProjectsRes.json();
        // Les projets reçus sont déjà filtrés pour l'utilisateur et contiennent seulement l'assignation pertinente
        const formattedStudentProjects = rawProjects.map(project => {
            const sanitizedProject = sanitizeProjectArrays(project);
            // Le backend renvoie déjà projectId comme une propriété distincte, nous n'avons qu'à l'assurer.
            // S'assurer que l'ID du projet maître est disponible sous `projectId` et `_id` est l'ID de l'assignation.
            return { ...sanitizedProject, _id: sanitizedProject.assignmentId, projectId: sanitizedProject.projectId };
        });

        // myProjects doit contenir TOUS les projets assignés à l'apprenant, y compris ceux soumis, en attente, etc.
        // La logique d'affichage des cartes gérera les statuts individuels.
        const allStudentAssignments = formattedStudentProjects.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        // Regrouper les projets par module
        const grouped = allStudentAssignments.reduce((acc, project) => {
          const moduleName = project.module || 'Sans module';
          if (!acc[moduleName]) {
            acc[moduleName] = [];
          }
          acc[moduleName].push(project);
          return acc;
        }, {});
        setGroupedProjectsByModule(grouped);

        setMyProjects(allStudentAssignments);
        setProjectsToEvaluate([]); // Vider cette liste ici, elle est gérée dans le dashboard si nécessaire
        setProjects([]); // On n'utilise plus cet état directement pour l'affichage apprenant
      }
    } catch (e) {
        setError('Error loading data: ' + e.message);
      } finally {
        setLoading(false);
      }
  }, [API, setMe, setProjects, setAllProjects, setError, setLoading, setMyProjects, setProjectsToEvaluate, setGroupedProjectsByModule]); // Ajouter toutes les dépendances ici

  const handleShowAddProjectModal = useCallback(() => {
    // Calculer le plus grand numéro d'ordre existant parmi les templates de projet
    const maxOrder = allProjectsRef.current.reduce((max, projectGroup) => {
      return Math.max(max, projectGroup.order || 0);
    }, 0);
    setProjectOrder(maxOrder + 1);
    setShowAddProjectModal(true);
    // Réinitialiser les autres champs du formulaire pour un nouveau projet
    setProjectTitle('');
    setProjectDescription('');
    setProjectRepoUrl('');
    setProjectDemoVideoUrl('');
    setProjectSpecifications([]);
    setProjectSize('short');
    setProjectExerciseStatements([]);
    setProjectResourceLinks([]);
    setProjectObjectives([]);
    setProjectModule(''); // Réinitialiser le module
    setError(null);
  }, [setProjectOrder, setShowAddProjectModal, setProjectTitle, setProjectDescription, setProjectRepoUrl, setProjectDemoVideoUrl, setProjectSpecifications, setProjectSize, setProjectExerciseStatements, setProjectResourceLinks, setProjectObjectives, setProjectModule, setError]); // allProjects est retiré des dépendances ici

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    loadData(token); // Passer le token à loadData

    // Vérifier les paramètres d'URL pour ouvrir la modale d'ajout de projet si nécessaire
    const { openAddProject } = router.query;
    if (openAddProject === 'true') {
      handleShowAddProjectModal();
      // Supprimer le paramètre d'URL après l'avoir utilisé pour éviter de réouvrir la modale à chaque rafraîchissement
      router.replace('/projects', undefined, { shallow: true });
    }
  }, [router, loadData, handleShowAddProjectModal]); // handleShowAddProjectModal est toujours une dépendance

  const getEmbedUrl = (url) => {
    if (!url) return null;
    // Gérer YouTube
    const youtubeMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:embed\/|watch\?v=|v\/)|youtu\.be\/)([\w-]{11})(?:\S+)?/);
    if (youtubeMatch && youtubeMatch[1]) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }
    // Gérer Vimeo (simple - peut nécessiter plus de robustesse)
    const vimeoMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com\/(?:video\/|)([0-9]+))(?:\S+)?/);
    if (vimeoMatch && vimeoMatch[1]) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    return null;
  };

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
  };

  const handleCloseModal = () => {
    setShowProjectModal(false);
    setSelectedProject(null);
  };

  // Fonctions CRUD pour les projets (pour staff/admin)
  const handleAddProject = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Token not found. Please log in.');
      }

      const res = await fetch(`${API}/projects`, {
      method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          title: projectTitle, 
          description: projectDescription, 
          demoVideoUrl: projectDemoVideoUrl, 
          specifications: projectSpecifications, 
          size: projectSize, 
          order: projectOrder, 
          objectives: projectObjectives, 
          exerciseStatements: projectExerciseStatements, 
          resourceLinks: projectResourceLinks,
          module: projectModule // Ajouter le module
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Projet ajouté avec succès !');
        setShowAddProjectModal(false);
        // Réinitialiser les champs du formulaire
        setProjectTitle('');
        setProjectDescription('');
        setProjectDemoVideoUrl('');
        setProjectSpecifications([]); // Réinitialiser
        setProjectSize('short');
        setProjectExerciseStatements([]); // Réinitialiser
        setProjectResourceLinks([]); // Réinitialiser
        setProjectObjectives([]); // Réinitialiser
        setProjectOrder(0); // Réinitialiser
        setProjectModule(''); // Réinitialiser le module
        loadData(token); // Recharger toutes les données
      } else {
        throw new Error(data.error || 'Échec de l\'ajout du projet.');
      }
    } catch (e) {
      console.error("Error adding project:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProject = (project) => {
    setCurrentProjectToEdit(project);
    setProjectTitle(project.title);
    setProjectDescription(project.description);
    setProjectRepoUrl(project.repoUrl || ''); // Sera utilisé pour les assignations
    setProjectDemoVideoUrl(project.demoVideoUrl || '');
    setProjectSpecifications(project.specifications || []);
    setProjectSize(project.size || 'short');
    setProjectExerciseStatements(project.exerciseStatements || []);
    setProjectResourceLinks(project.resourceLinks || []);
    setProjectObjectives(project.objectives || []);
    setProjectOrder(project.order || 0);
    setProjectModule(project.module || ''); // Récupérer le module
    setShowEditProjectModal(true);
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!currentProjectToEdit) return;

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Token not found. Please log in.');
      }

      const body = {
          projectTitle: projectTitle, 
          projectDescription: projectDescription, 
          projectDemoVideoUrl: projectDemoVideoUrl, 
          projectSpecifications: projectSpecifications, 
          projectSize: projectSize, 
          projectOrder: projectOrder,
          projectObjectives: projectObjectives,
          projectExerciseStatements: projectExerciseStatements,
          projectResourceLinks: projectResourceLinks,
          module: projectModule // Ajouter le module
      };

      let url = `${API}/projects/${currentProjectToEdit._id}`;
      if (currentProjectToEdit.assignmentId) { // Si c'est une assignation d'étudiant
        url = `${API}/projects/${currentProjectToEdit.projectId}`; // L'ID du projet maître
        body.assignmentId = currentProjectToEdit.assignmentId; // Passer l'ID de l'assignation
        body.repoUrl = projectRepoUrl; // Mettre à jour le repoUrl de l'assignation
        body.status = currentProjectToEdit.assignmentStatus; // Ajouter le statut de l'assignation
      }

      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Projet mis à jour avec succès !');
        setShowEditProjectModal(false);
        setCurrentProjectToEdit(null);
        // Réinitialiser les champs du formulaire
        setProjectTitle('');
        setProjectDescription('');
        setProjectRepoUrl('');
        setProjectDemoVideoUrl('');
        setProjectSpecifications([]);
        setProjectSize('short');
        setProjectExerciseStatements([]);
        setProjectResourceLinks([]);
        setProjectObjectives([]);
        setProjectOrder(0);
        setProjectModule(''); // Réinitialiser le module
        loadData(getAuthToken()); // Recharger toutes les données
      } else {
        throw new Error(data.error || 'Échec de la mise à jour du projet.');
      }
    } catch (e) {
      console.error("Error updating project:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = (projectToDelete) => {
    setCurrentProjectToDelete(projectToDelete);
      setShowDeleteProjectModal(true);
  };

  const handleDeleteProjectConfirmed = async () => {
    setError(null);
    setLoading(true);

    if (!currentProjectToDelete || confirmProjectTitle !== currentProjectToDelete.title) {
      setError('Le titre de confirmation ne correspond pas.');
      setLoading(false);
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Token not found. Please log in.');
      }

      const body = {};
      let url = `${API}/projects/${currentProjectToDelete._id}`;

      if (currentProjectToDelete.assignmentId) {
        // Si c'est une assignation, l'ID à supprimer est l'assignation
        url = `${API}/projects/${currentProjectToDelete.projectId}`; // L'ID du projet maître
        body.assignmentId = currentProjectToDelete.assignmentId; // Passer l'ID de l'assignation
      }

      const res = await fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
        });
        const data = await res.json();
      if (res.ok) {
        alert('Suppression effectuée avec succès !');
        setShowDeleteProjectModal(false);
        setCurrentProjectToDelete(null);
        setConfirmProjectTitle('');
        loadData(getAuthToken()); // Recharger toutes les données
      } else {
        throw new Error(data.error || 'Échec de la suppression.');
      }
    } catch (e) {
      console.error("Error deleting project:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Fonctions pour la soumission de projet par un apprenant
  const handleOpenSubmitProjectModal = async (project) => {
    setCurrentProjectToSubmit(project);
    setProjectSubmissionRepoUrl('');
    setSelectedSlotIds([]);
    setError(null);
    setSuccess(null);
    
    try {
      const token = getAuthToken();
      // Charger les slots disponibles pour ce projet
      // La route doit maintenant prendre projectId et assignmentId
      const slotsRes = await fetch(`${API}/availability/available-for-project/${project.projectId}/${project.assignmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (slotsRes.ok) {
        const slotsData = await slotsRes.json();
        setAvailableSlots(slotsData);
      } else {
        // Ici, nous affichons l'erreur dans le popup au lieu de setError(null)
        const errorData = await slotsRes.json();
        setErrorPopupMessage(errorData.error || 'Impossible de charger les créneaux disponibles.');
        setShowErrorPopup(true);
      }
    } catch (e) {
      setErrorPopupMessage('Erreur lors du chargement des créneaux.');
      setShowErrorPopup(true);
    }
    
    setShowSubmitProjectModal(true);
  };

  const handleCloseErrorPopup = () => {
    setShowErrorPopup(false);
    setErrorPopupMessage('');
    setPopupType('error'); // Réinitialiser le type à 'error' par défaut
  };

  const handleSubmitProject = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    setShowErrorPopup(false); // Réinitialiser le popup d'erreur au début de la soumission
    setErrorPopupMessage('');
    setPopupType('error'); // S'assurer que le type est 'error' par défaut pour les erreurs de soumission

    if (!currentProjectToSubmit || selectedSlotIds.length !== 2 || (!isRepoUrlOptional && !projectSubmissionRepoUrl)) {
      let errorMessage = 'Veuillez sélectionner exactement 2 créneaux d\'évaluateurs différents.';
      if (!isRepoUrlOptional && !projectSubmissionRepoUrl) {
        errorMessage = 'Veuillez fournir l\'URL du dépôt GitHub et sélectionner exactement 2 créneaux d\'évaluateurs différents.';
      }
      if (isRepoUrlOptional && selectedSlotIds.length !== 2) {
        errorMessage = 'Veuillez sélectionner exactement 2 créneaux d\'évaluateurs différents.';
      }
      setErrorPopupMessage(errorMessage); // Utiliser le nouvel état
      setShowErrorPopup(true); // Afficher le popup
      setPopupType('error'); // C'est une erreur de validation de soumission
      setLoading(false);
      return;
    }

    // Vérifier que les créneaux sélectionnés sont uniques
    if (new Set(selectedSlotIds).size !== selectedSlotIds.length) {
      setErrorPopupMessage('Veuillez sélectionner des créneaux distincts.');
      setShowErrorPopup(true);
      setPopupType('error'); // C'est une erreur de validation de soumission
      setLoading(false);
      return;
    }

    // Vérifier que les 2 slots sont d'évaluateurs différents
    const selectedSlots = availableSlots.filter(slot => selectedSlotIds.includes(slot._id));
    const evaluatorIds = selectedSlots.map(slot => slot.evaluator._id);
    const uniqueEvaluators = [...new Set(evaluatorIds)];
    
    if (uniqueEvaluators.length !== 2) {
      setErrorPopupMessage('Vous devez sélectionner exactement 2 créneaux, chacun d\'un évaluateur différent.');
      setShowErrorPopup(true);
      setPopupType('error'); // C'est une erreur de validation de soumission
      setLoading(false);
      return;
    }

    try {
      const token = getAuthToken();
      // L'API submitProjectSolution doit maintenant prendre projectId et assignmentId
      const res = await fetch(`${API}/projects/${currentProjectToSubmit.projectId}/submit-solution`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          assignmentId: currentProjectToSubmit.assignmentId, // Passer l'ID de l'assignation
          repoUrl: projectSubmissionRepoUrl,
          selectedSlotIds: selectedSlotIds
        }),
        });
        const data = await res.json();
      if (res.ok) {
        setSuccess('Projet soumis avec succès ! Il sera évalué par vos pairs.');
        setShowSubmitProjectModal(false);
        setCurrentProjectToSubmit(null);
        setProjectSubmissionRepoUrl('');
        setSelectedSlotIds([]);
        setAvailableSlots([]);
        loadData(getAuthToken()); // Recharger les données
      } else {
        setErrorPopupMessage(data.error || 'Échec de la soumission du projet.'); // Utiliser le popup
        setShowErrorPopup(true);
        setPopupType('error');
      }
    } catch (e) {
      console.error("Error submitting project:", e);
      setErrorPopupMessage(e.message || 'Erreur lors de la communication avec le serveur.'); // Utiliser le popup
      setShowErrorPopup(true);
      setPopupType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSubmitProjectModal = () => {
    setShowSubmitProjectModal(false);
    setCurrentProjectToSubmit(null);
    setProjectSubmissionRepoUrl('');
    setSelectedSlotIds([]);
    setAvailableSlots([]);
    setError(null);
    setSuccess(null);
    // Réinitialiser les états du popup d'erreur/avertissement
    setShowErrorPopup(false);
    setErrorPopupMessage('');
    setPopupType('error');
  };

  // Déplacer la définition de isRepoUrlOptional ici pour la rendre disponible dans le JSX de la modale
  const isRepoUrlOptional = [
    "CLI (Command Line Interface)",
    "Pratique guidée Git / GitHub"
  ].includes(currentProjectToSubmit?.title);

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Chargement...</span>
      </div>
      <p className="ms-2">Chargement des projets...</p>
    </div>
  );
  if (error) return <div className="alert alert-danger text-center mt-5">Error loading projects: {error}</div>;

  return (
    <div className="container-fluid mt-4 pt-5 px-4">
      <h1 className="mb-4">{me && (me.role === 'staff' || me.role === 'admin') ? 'Gestion des Projets' : 'Mes Projets'}</h1>
      {error && <div className="alert alert-danger text-center mt-5">Error: {error}</div>}

      {me && (me.role === 'staff' || me.role === 'admin') ? (
        // Vue pour Staff/Admin: Tableau de tous les projets avec CRUD
        <div className="row">
          <div className="col-12 mb-3 d-flex justify-content-end">
            <button className="btn btn-primary" onClick={handleShowAddProjectModal}>
              <i className="bi bi-plus-circle me-2"></i> Ajouter un Nouveau Projet
            </button>
          </div>
          <div className="col-12">
            {allProjects.length === 0 ? (
              <div className="alert alert-info text-center mt-4">
                <i className="bi bi-info-circle me-2"></i> Aucun projet disponible pour le moment.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Ordre</th>
                      <th>Titre du Projet</th>
                      <th>Description</th>
                      <th>Type</th>
                      <th>Étudiant Assigné</th>
                      <th>Statut</th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allProjects.map(projectGroup => (
                      <React.Fragment key={projectGroup._id}>
                        <tr className="table-primary">
                          <td><strong>{projectGroup.order}</strong></td>
                          <td><i className="bi bi-folder-fill me-2 text-primary"></i><strong>{projectGroup.title}</strong></td>
                          <td>{(projectGroup.description || '').substring(0, 70)}...</td>
                          <td><span className="badge bg-dark rounded-pill"><i className="bi bi-gear me-1"></i> Maître</span></td>
                          <td>N/A</td>
                          <td><span className="badge bg-secondary rounded-pill"><i className="bi bi-puzzle-fill me-1"></i> Actif</span></td>
                          <td className="text-center">
                            <div className="btn-group btn-group-sm" role="group" aria-label="Actions pour projet maître">
                              <button className="btn btn-outline-info" onClick={() => handleEditProject(projectGroup)} title="Modifier Projet Maître">
                              <i className="bi bi-pencil-square"></i>
                            </button>
                              <button className="btn btn-outline-danger" onClick={() => handleDeleteProject(projectGroup)} title="Supprimer Projet Maître">
                              <i className="bi bi-trash"></i>
                            </button>
                            </div>
                          </td>
                        </tr>
                        {projectGroup.assignments.length > 0 ? (
                          projectGroup.assignments.map(assignedProject => (
                            <tr key={assignedProject._id}>
                              <td></td> {/* Cellule vide pour l'alignement */}
                              <td><i className="bi bi-arrow-return-right me-2 text-muted"></i> {assignedProject.title}</td>
                              <td><small>{(assignedProject.description || '').substring(0, 50)}...</small></td>
                              <td><span className="badge bg-success rounded-pill"><i className="bi bi-person-check me-1"></i> Apprenant</span></td>
                              <td>{assignedProject.student ? assignedProject.student.name : 'N/A'}</td>
                              <td>
                                <span className={`badge rounded-pill bg-${ 
                                  assignedProject.status === 'assigned' ? 'warning text-dark' : 
                                  assignedProject.status === 'submitted' ? 'info' : 
                                  assignedProject.status === 'awaiting_staff_review' ? 'primary' : 
                                  assignedProject.status === 'approved' ? 'success' : 
                                  assignedProject.status === 'rejected' ? 'danger' : 
                                  'secondary' 
                                }`}>
                                  <i className={`bi bi-${ 
                                  assignedProject.status === 'assigned' ? 'clock' : 
                                  assignedProject.status === 'submitted' ? 'hourglass-split' : 
                                  assignedProject.status === 'awaiting_staff_review' ? 'person-workspace' : 
                                  assignedProject.status === 'approved' ? 'check-circle' : 
                                  assignedProject.status === 'rejected' ? 'x-circle' : 
                                  'question-circle' 
                                  } me-1`}></i>
                                  {assignedProject.status === 'assigned' ? 'Assigné' : 
                                   assignedProject.status === 'submitted' ? 'Soumis (en attente des pairs)' : 
                                   assignedProject.status === 'awaiting_staff_review' ? 'En attente de révision staff' : 
                                   assignedProject.status === 'approved' ? 'Approuvé' : 
                                   assignedProject.status === 'rejected' ? 'Rejeté' : 
                                   'Inconnu'}
                                </span>
                              </td>
                              <td className="text-center">
                                <div className="btn-group btn-group-sm" role="group" aria-label="Actions pour projet d'apprenant">
                                  <button className="btn btn-outline-info" onClick={() => handleEditProject(assignedProject)} title="Modifier Projet de l'Apprenant">
                                  <i className="bi bi-pencil-square"></i>
                                </button>
                                  <button className="btn btn-outline-danger" onClick={() => handleDeleteProject(assignedProject)} title="Supprimer Projet de l'Apprenant">
                                  <i className="bi bi-trash"></i>
                                </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td></td>
                            <td colSpan="5" className="text-center text-muted py-2">Aucun projet assigné pour ce projet maître.</td>
                            <td></td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Vue pour Apprenant: Cartes de projets
        <div className="row">
          <div className="col-12 mb-4">
            <h3>Mes Projets</h3>
            {selectedModule ? (
              // Afficher les projets individuels pour le module sélectionné
              <div className="mb-3">
                <button className="btn btn-secondary mb-3" onClick={() => setSelectedModule(null)}>
                  <i className="bi bi-arrow-left me-2"></i> Retour aux Modules
                </button>
                <h4>Projets du module : {selectedModule}</h4>
                <div className="row">
                  {groupedProjectsByModule[selectedModule] && groupedProjectsByModule[selectedModule].length > 0 ? (
                    groupedProjectsByModule[selectedModule].map(project => (
                      <div key={project._id} className="col-md-6 col-lg-4 mb-4">
                        <div 
                          className="card h-100 shadow-hover-3d border-0"
                          onClick={() => handleCardClick(project)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="card-body d-flex flex-column">
                            <div>
                              <h5 className="card-title text-primary mb-2">
                                <i className="bi bi-folder-check me-2"></i> {project.title}
                              </h5>
                              {project.templateProject && project.templateProject.order && (
                                <p className="card-text text-muted"><small>(Projet {project.templateProject.order})</small></p>
                              )}
                            </div>
                            <div className="mt-3 mb-3 d-flex align-items-center">
                              <span className={`badge rounded-pill bg-${ 
                                project.assignmentStatus === 'assigned' ? 'warning text-dark' : 
                                project.assignmentStatus === 'submitted' ? 'info' : 
                                project.assignmentStatus === 'approved' ? 'success' : 
                                project.assignmentStatus === 'rejected' ? 'danger' : 
                                'secondary' 
                              } me-2`}>
                                <i className={`bi bi-${ 
                                project.assignmentStatus === 'assigned' ? 'clock' : 
                                project.assignmentStatus === 'submitted' ? 'hourglass-split' : 
                                project.assignmentStatus === 'approved' ? 'check-circle' : 
                                project.assignmentStatus === 'rejected' ? 'x-circle' : 
                                'question-circle'
                                } me-1`}></i>
                                {project.assignmentStatus === 'assigned' ? 'Assigné' : 
                                 project.assignmentStatus === 'submitted' ? 'Soumis (en attente d\'évaluation)' : 
                                 project.assignmentStatus === 'approved' ? 'Approuvé' : 
                                 project.assignmentStatus === 'rejected' ? 'Rejeté' : 
                                 'Inconnu'}
                              </span>
                              {project.assignmentStatus === 'approved' && (
                                <span className="text-success small"><i className="bi bi-trophy-fill me-1"></i> Projet Approuvé !</span>
                              )}
                            </div>
                            {project.assignmentStatus === 'assigned' && (
                              <div className="mt-auto">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if ((me?.evaluationPoints ?? 0) < 2) {
                                      setErrorPopupMessage("Vous devez avoir au moins 2 points d'évaluation pour soumettre un projet.");
                                      setPopupType('error');
                                      setShowErrorPopup(true);
                                      return;
                                    }
                                    handleOpenSubmitProjectModal(project);
                                  }}
                                  className="btn btn-primary w-100 btn-sm"
                                  title="Soumettre ce projet"
                                  disabled={(me?.evaluationPoints ?? 0) < 2}
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
                      <i className="bi bi-info-circle me-2"></i> Aucun projet disponible pour ce module.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Afficher les cartes de module
              Object.keys(groupedProjectsByModule).length > 0 ? (
                <div className="row">
                  {Object.entries(groupedProjectsByModule).map(([moduleName, projectsInModule]) => (
                    <div key={moduleName} className="col-md-6 col-lg-4 mb-4">
                      <div 
                        className="card h-100 shadow-hover-3d border-0 module-card"
                        onClick={() => setSelectedModule(moduleName)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="card-body d-flex flex-column justify-content-center align-items-center">
                          <i className="bi bi-folder-fill fs-1 text-primary mb-3"></i>
                          <h5 className="card-title text-center text-primary">{moduleName}</h5>
                          <p className="card-text text-muted">{projectsInModule.length} projet(s)</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="alert alert-info text-center mt-3">
                  <i className="bi bi-info-circle me-2"></i> Aucun projet assigné pour le moment.
                </div>
              )
            )}
          </div>

          {/* Ancienne section "Corrections à Venir" supprimée pour éviter les erreurs de compilation */}
        </div>
      )}

      {/* Modale d'affichage des détails du projet (pour apprenant) */}
      {me && me.role === 'apprenant' && showProjectModal && selectedProject && (
        <div className="modal" tabIndex="-1" style={{ display: 'block' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-gradient bg-primary text-white">
                <h5 className="modal-title d-flex align-items-center"><i className="bi bi-folder-check me-2"></i> Détails du Projet: {selectedProject.title}</h5>
                <button type="button" className="btn-close" onClick={handleCloseModal}></button>
              </div>
              <div className="modal-body">
                {/* Bannière de félicitations pour les projets approuvés */}
                {selectedProject.status === 'approved' && selectedProject.type === 'my_project' && (
                  <div className="alert alert-success border-0 mb-4">
                    <div className="d-flex align-items-center">
                      <i className="bi bi-trophy-fill fs-1 me-3 text-warning"></i>
                      <div>
                        <h5 className="mb-1">🎉 Félicitations !</h5>
                        <p className="mb-0">Votre projet a été approuvé avec succès. Excellent travail !</p>
                          </div>
                    </div>
                    </div>
                  )}

                {/* Message spécifique pour les projets à évaluer */}
                {selectedProject.type === 'to_evaluate' && (
                  <div className="alert alert-warning border-0 mb-4">
                    <div className="d-flex align-items-center">
                      <i className="bi bi-pencil-square fs-1 me-3 text-warning"></i>
                      <div>
                        <h5 className="mb-1">Projet à Évaluer</h5>
                        <p className="mb-0">Ceci est un projet soumis par <strong>{selectedProject.student.name}</strong> en attente de votre évaluation.</p>
                          </div>
                    </div>
                    </div>
                  )}

                <div className="row">
                  <div className="">
                    <h6 className="text-primary mb-3">Informations du Projet</h6>
                    
                    {/* Section Description */}
                    <div className="card mb-3 shadow-sm">
                      <div className="card-body">
                        <h6 className="card-title d-flex align-items-center text-primary"><i className="bi bi-journal-text me-2"></i> Description</h6>
                        <HtmlRenderer htmlContent={selectedProject.description}/>
                      </div>
                    </div>
                    
                    {/* Objectives */}
                    {selectedProject.objectives && (selectedProject.objectives || []).length > 0 && (
                      <div className="card mb-3 shadow-sm">
                        <div className="card-body">
                          <h6 className="card-title d-flex align-items-center text-primary"><i className="bi bi-bullseye me-2"></i> Objectifs</h6>
                          <ul className="list-group list-group-flush">
                            {(selectedProject.objectives || []).map((objective, index) => (
                            <li key={index} className="list-group-item d-flex align-items-start border-0 py-1 px-0">
                              <i className="bi bi-check-lg text-success me-2 mt-1"></i> {objective}
                            </li>
                          ))}
                        </ul>
                        </div>
                      </div>
                    )}

                    {/* Spécifications */}
                    {selectedProject.specifications && (selectedProject.specifications || []).length > 0 && (
                      <div className="card mb-3 shadow-sm">
                        <div className="card-body">
                          <h6 className="card-title d-flex align-items-center text-primary"><i className="bi bi-file-earmark-text me-2"></i> Spécifications</h6>
                          <ul className="list-group list-group-flush">
                            {(selectedProject.specifications || []).map((spec, index) => (
                              <li key={index} className="list-group-item d-flex align-items-start border-0 py-1 px-0">
                                <i className="bi bi-check-lg text-success me-2 mt-1"></i> {spec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                    
                    {/* Statut avec icône */}
                    {selectedProject.assignmentStatus && (
                      <div className="card mb-3 shadow-sm">
                        <div className="card-body d-flex align-items-center">
                          <h6 className="mb-0 me-2 text-primary"><i className="bi bi-info-circle me-2"></i> Statut:</h6> 
                          <span className={`badge rounded-pill bg-${(() => {
                            if (selectedProject.assignmentStatus === 'assigned') return 'primary';
                            if (selectedProject.assignmentStatus === 'submitted') return 'warning text-dark';
                            if (selectedProject.assignmentStatus === 'pending_review') return 'info';
                            if (selectedProject.assignmentStatus === 'approved') return 'success';
                            if (selectedProject.assignmentStatus === 'rejected') return 'danger';
                            return 'secondary'; // Fallback
                          })()}`}>
                            <i className={`bi bi-${(() => {
                              if (selectedProject.assignmentStatus === 'assigned') return 'clock';
                              if (selectedProject.assignmentStatus === 'submitted') return 'hourglass-split';
                              if (selectedProject.assignmentStatus === 'pending_review') return 'person-workspace';
                              if (selectedProject.assignmentStatus === 'approved') return 'check-circle';
                              if (selectedProject.assignmentStatus === 'rejected') return 'x-circle';
                              return 'question-circle';
                            })()} me-1`}></i>
                            {(() => {
                              if (selectedProject.assignmentStatus === 'assigned') return 'Assigné';
                              if (selectedProject.assignmentStatus === 'submitted') return 'Soumis (en attente)';
                              if (selectedProject.assignmentStatus === 'pending_review') return 'En attente Staff';
                              if (selectedProject.assignmentStatus === 'approved') return 'Approuvé';
                              if (selectedProject.assignmentStatus === 'rejected') return 'Rejeté';
                              return 'Statut Inconnu';
                            })()}
                      </span>
                    </div>
                      </div>
                    )}

                    {/* Date de Soumission */}
                    {selectedProject.submissionDate && (
                      <div className="card mb-3 shadow-sm">
                        <div className="card-body d-flex align-items-center">
                          <h6 className="mb-0 me-2 text-primary"><i className="bi bi-calendar-event me-2"></i> Date de Soumission:</h6> 
                          <span className="text-muted">{new Date(selectedProject.submissionDate).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                          })}</span>
                        </div>
                      </div>
                    )}

                    {selectedProject.repoUrl && (
                      <div className="card mb-3 shadow-sm">
                        <div className="card-body d-flex align-items-center">
                          <h6 className="mb-0 me-2 text-primary"><i className="bi bi-github me-2"></i> Dépôt du projet soumis:</h6> 
                          <a href={selectedProject.repoUrl} target="_blank" rel="noopener noreferrer" className="text-info text-decoration-none">{selectedProject.repoUrl}</a>
                        </div>
                      </div>
                    )}

                    {/* Resource Links */}
                    {selectedProject.resourceLinks && (selectedProject.resourceLinks || []).length > 0 && (
                      <div className="card mb-3 shadow-sm">
                        <div className="card-body">
                          <h6 className="card-title d-flex align-items-center text-primary"><i className="bi bi-link-45deg me-2"></i> Ressources Supplémentaires</h6>
                          <ul className="list-group list-group-flush">
                            {(selectedProject.resourceLinks || []).map((link, index) => (
                            <li key={index} className="list-group-item d-flex align-items-start border-0 py-1 px-0">
                              <i className="bi bi-box-arrow-up-right text-info me-2 mt-1"></i>
                              <a href={link} target="_blank" rel="noopener noreferrer" className="text-info text-decoration-none">{link}</a>
                            </li>
                          ))}
                        </ul>
                        </div>
                      </div>
                    )}

                    {selectedProject.exerciseStatements && (selectedProject.exerciseStatements || []).length > 0 && (
                      <div className="mb-3 shadow-sm">
                        <div className="container pt-3">
                          <h6 className="card-title d-flex align-items-center text-primary mb-4 mt-3"><i className="bi bi-list-task me-2"></i> Énoncés d'Exercice</h6>
                          <ul className="list-group list-group-flush">
                            {(selectedProject.exerciseStatements || []).map((statement, index) => (
                              
                            <li key={index} className="list-group-item align-items-start border-0 py-1 px-0">
                              <h5>Exercice N°{index + 1}</h5>
                              <div>
                                <HtmlRenderer htmlContent={statement}/>
                              </div>
                            </li>
                          ))}
                        </ul>
                        </div>
                      </div>
                    )}

                  </div>
                  
                  
                </div>
                
                
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Fermer</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {me && me.role === 'apprenant' && showProjectModal && <div className="modal-backdrop fade show"></div>}

      {/* Modale pour ajouter/modifier un projet (staff/admin) */}
      {me && (me.role === 'staff' || me.role === 'admin') && (showAddProjectModal || showEditProjectModal) && (
        <div className="modal" tabIndex="-1" style={{ display: 'block' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-gradient bg-success text-white">
                <h5 className="modal-title">{currentProjectToEdit ? 'Modifier le Projet' : 'Ajouter un Projet'}</h5>
                <button type="button" className="btn-close" onClick={() => {setShowAddProjectModal(false); setShowEditProjectModal(false); setCurrentProjectToEdit(null);}}></button>
              </div>
              <div className="modal-body">
                {error && <div className="alert alert-danger mb-3" role="alert">{error}</div>}
                <form onSubmit={currentProjectToEdit ? handleUpdateProject : handleAddProject}>
                  {/* Titre */}
                  <div className="mb-3">
                    <label htmlFor="projectTitle" className="form-label">Titre du Projet <span className="text-danger">*</span></label>
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
                    <label htmlFor="projectObjectives" className="form-label d-block">Objectifs (Optionnel)</label>
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
                            const newObjectives = projectObjectives.filter((_, i) => i !== index);
                            setProjectObjectives(newObjectives);
                          }}
                        >
                          <i className="bi bi-x"></i>
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary mt-2"
                      onClick={() => setProjectObjectives([...projectObjectives, ''])}
                    >
                      <i className="bi bi-plus-circle me-2"></i> Ajouter un objectif
                    </button>
                    <div className="form-text text-muted">Décrivez les principaux objectifs que l'apprenant doit atteindre.</div>
                  </div>

                  {/* Description */}
                  <div className="mb-3">
                    <label htmlFor="projectDescription" className="form-label">Description <span className="text-danger">*</span></label>
                    <textarea
                      className="form-control"
                      id="projectDescription"
                      rows="3"
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      required
                    ></textarea>
                  </div>
                  
                  {/* Spécifications */}
                  <div className="mb-3">
                    <label htmlFor="projectSpecifications" className="form-label d-block">Spécifications (Optionnel)</label>
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
                            const newSpecs = projectSpecifications.filter((_, i) => i !== index);
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
                      onClick={() => setProjectSpecifications([...projectSpecifications, ''])}
                    >
                      <i className="bi bi-plus-circle me-2"></i> Ajouter une spécification
                    </button>
                  </div>

                  {/* Liens de Ressources */}
                  <div className="mb-3">
                    <label htmlFor="projectResourceLinks" className="form-label">Liens de Ressources (un par ligne, Optionnel)</label>
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
                            const newLinks = projectResourceLinks.filter((_, i) => i !== index);
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
                      onClick={() => setProjectResourceLinks([...projectResourceLinks, ''])}
                    >
                      <i className="bi bi-plus-circle me-2"></i> Ajouter un lien
                    </button>
                    <div className="form-text text-muted">Fournissez des liens vers des documentations, tutoriels, ou autres ressources utiles.</div>
                  </div>

                  {/* URL Vidéo de Démonstration (Optionnel) */}
                  <div className="mb-3">
                    <label htmlFor="projectDemoVideoUrl" className="form-label">URL Vidéo de Démonstration (Optionnel)</label>
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
                    <label htmlFor="projectExerciseStatements" className="form-label d-block">Énoncés d'Exercice</label>
                    {projectExerciseStatements.map((statement, index) => (
                      <div key={index} className="input-group mb-2">
                        <input
                          type="text"
                        className="form-control"
                          value={statement}
                          onChange={(e) => {
                            const newStatements = [...projectExerciseStatements];
                            newStatements[index] = e.target.value;
                            setProjectExerciseStatements(newStatements);
                          }}
                          placeholder="Entrez un énoncé d'exercice"
                        />
                        <button
                          className="btn btn-outline-danger"
                          type="button"
                          onClick={() => {
                            const newStatements = projectExerciseStatements.filter((_, i) => i !== index);
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
                      onClick={() => setProjectExerciseStatements([...projectExerciseStatements, ''])}
                    >
                      <i className="bi bi-plus-circle me-2"></i> Ajouter un énoncé d'exercice
                    </button>
                      <div className="form-text text-muted">Ajoutez les étapes ou les consignes de l'exercice, une par ligne.</div>
                    </div>

                  {/* Ordre du Projet (Numéro) */}
                  <div className="mb-3">
                    <label htmlFor="projectOrder" className="form-label">Ordre du Projet <span className="text-danger">*</span></label>
                    <input
                      type="number"
                      className="form-control"
                      id="projectOrder"
                      value={projectOrder}
                      onChange={(e) => setProjectOrder(parseInt(e.target.value, 10))}
                      required
                    />
                    <div className="form-text text-muted">Définissez un numéro d'ordre pour ce projet (ex: 1, 2, 3...).</div>
                  </div>

                  {/* Taille du Projet */}
                  <div className="mb-3">
                    <label htmlFor="projectSize" className="form-label">Taille du Projet <span className="text-danger">*</span></label>
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
                    <label htmlFor="projectModule" className="form-label">Module <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      id="projectModule"
                      value={projectModule}
                      onChange={(e) => setProjectModule(e.target.value)}
                      required
                    >
                      <option value="">Sélectionner un module</option>
                      <option value="CLI/Git & GIt Hub">CLI/Git & GIt Hub</option>
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
                    <div className="form-text text-muted">Sélectionnez le module auquel appartient le projet.</div>
                  </div>

                  <button type="submit" className="btn btn-success mt-3">{currentProjectToEdit ? 'Modifier' : 'Ajouter'} le Projet</button>
                </form>
              </div>
            </div>
          </div>
                  </div>
                )}
      {me && (me.role === 'staff' || me.role === 'admin') && (showAddProjectModal || showEditProjectModal) && <div className="modal-backdrop fade show"></div>}

      {/* Modale de confirmation de suppression de projet (staff/admin) */}
      {me && (me.role === 'staff' || me.role === 'admin') && showDeleteProjectModal && currentProjectToDelete && (
        <div className="modal" tabIndex="-1" style={{ display: 'block' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-gradient bg-danger text-white">
                <h5 className="modal-title">Confirmer la Suppression</h5>
                <button type="button" className="btn-close" onClick={() => {setShowDeleteProjectModal(false); setCurrentProjectToDelete(null); setConfirmProjectTitle('');}}></button>
              </div>
              <div className="modal-body">
                {error && <div className="alert alert-danger mb-3" role="alert">{error}</div>}
                <p>Êtes-vous sûr de vouloir supprimer le projet "<strong>{currentProjectToDelete.title}</strong>" ? Cette action est irréversible.</p>
                <p>Veuillez taper le titre du projet (exactement) pour confirmer :</p>
                <input
                  type="text"
                  className="form-control"
                  value={confirmProjectTitle}
                  onChange={(e) => setConfirmProjectTitle(e.target.value)}
                  placeholder={currentProjectToDelete.title}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => {setShowDeleteProjectModal(false); setCurrentProjectToDelete(null); setConfirmProjectTitle('');}}>Annuler</button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDeleteProjectConfirmed}
                  disabled={confirmProjectTitle !== currentProjectToDelete.title} // Désactivé si le titre ne correspond pas
                >
                  <i className="bi bi-trash me-2"></i> Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {me && (me.role === 'staff' || me.role === 'admin') && showDeleteProjectModal && <div className="modal-backdrop fade show"></div>}

      {/* Modale de soumission de projet (apprenant) */}
      {me && me.role === 'apprenant' && showSubmitProjectModal && currentProjectToSubmit && (
        <div className="modal" tabIndex="-1" style={{ display: 'block' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-gradient bg-primary text-white">
                <h5 className="modal-title">
                  <i className="bi bi-upload me-2"></i>
                  Soumettre le Projet: {currentProjectToSubmit.title}
                </h5>
                <button type="button" className="btn-close" onClick={handleCloseSubmitProjectModal}></button>
              </div>
              <div className="modal-body">
                {error && <div className="alert alert-danger mb-3" role="alert">{error}</div>}
                {success && <div className="alert alert-success mb-3" role="alert">{success}</div>}

                <form onSubmit={handleSubmitProject}>
                  <div className="mb-3">
                    <label htmlFor="repoUrl" className="form-label">
                      <i className="bi bi-github me-1"></i>
                      URL du Dépôt GitHub {!(isRepoUrlOptional) && <span className="text-danger">*</span>}
                    </label>
                    <input
                      type="url"
                      className="form-control form-control-lg"
                      id="repoUrl"
                      value={projectSubmissionRepoUrl}
                      onChange={(e) => setProjectSubmissionRepoUrl(e.target.value)}
                      placeholder="https://github.com/votre-username/votre-projet"
                      required={!isRepoUrlOptional}
                    />
                    <div className="form-text text-muted">Assurez-vous que votre dépôt est public et contient le code source du projet.</div>
                  </div>

                  <div className="mb-4 p-3 bg-light border rounded">
                    <label className="form-label d-block mb-3">
                      <i className="bi bi-calendar-check me-1"></i>
                      Sélectionner 2 Créneaux d'Évaluation (Obligatoire) <span className="text-danger">*</span>
                    </label>
                    <div className="alert alert-info py-2">
                      <i className="bi bi-info-circle me-2"></i>
                      <strong>Important :</strong> Vous devez sélectionner exactement 2 créneaux d'évaluateurs différents pour que votre projet soit évalué.
                    </div>
                    {availableSlots.length > 0 ? (
                      <div className="row">
                        {availableSlots.map((slot) => (
                          <div key={slot._id} className="col-md-6 mb-3">
                            <div className="form-check form-check-inline border rounded p-3 w-100 bg-white shadow-sm">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id={`slot-${slot._id}`}
                                value={slot._id}
                                checked={selectedSlotIds.includes(slot._id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    if (selectedSlotIds.length < 2) {
                                      setSelectedSlotIds([...selectedSlotIds, slot._id]);
                                      setError(null); // Clear any previous inline error
                                    } else {
                                      // Afficher le popup d'avertissement
                                      setErrorPopupMessage('Vous ne pouvez sélectionner que 2 créneaux maximum.');
                                      setShowErrorPopup(true);
                                      setPopupType('warning');
                                    }
                                  } else {
                                    setSelectedSlotIds(selectedSlotIds.filter(id => id !== slot._id));
                                    setError(null);
                                    // Si l'utilisateur décoche et qu'il n'y a plus de créneaux sélectionnés ou si c'est une erreur résolue, on peut cacher le popup d'avertissement
                                    if (selectedSlotIds.length <= 2 && popupType === 'warning') {
                                      setShowErrorPopup(false);
                                      setErrorPopupMessage('');
                                      setPopupType('error');
                                    }
                                  }
                                }}
                              />
                              <label className="form-check-label" htmlFor={`slot-${slot._id}`}>
                                <div className="d-flex flex-column align-items-start ms-2">
                                  <strong className="text-dark">Le {new Date(slot.startTime).toLocaleDateString('fr-FR')}</strong>
                                  <small className="text-muted">
                                    de {new Date(slot.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} à 
                                    {new Date(slot.endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                  </small>
                                  <small className="text-info mt-1 d-flex align-items-center"><i className="bi bi-calendar-check me-1"></i> Créneau d'évaluation disponible</small>
                                </div>
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="alert alert-warning py-2">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        Aucun créneau d'évaluation disponible pour le moment. Veuillez réessayer plus tard.
                      </div>
                    )}
                    <div className="form-text mt-3 text-dark">
                      <i className="bi bi-clipboard-check me-1"></i> Créneaux sélectionnés: <strong>{selectedSlotIds.length}</strong>/2
                      {selectedSlotIds.length === 2 && (
                        <span className="text-success ms-2 d-inline-flex align-items-center">
                          <i className="bi bi-check-circle me-1"></i>
                          Parfait ! Vous avez sélectionné 2 créneaux.
                        </span>
                      )}
                    </div>
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseSubmitProjectModal}>
                  <i className="bi bi-x-circle me-2"></i> Annuler
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  onClick={handleSubmitProject}
                  disabled={loading || !projectSubmissionRepoUrl || selectedSlotIds.length !== 2}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
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
      {me && me.role === 'apprenant' && showSubmitProjectModal && <div className="modal-backdrop fade show"></div>}

      {/* Modale d'erreur personnalisée */}
      {showErrorPopup && (
        <div className="modal" tabIndex="-1" style={{ display: 'block' }}>
          <div className="modal-dialog modal-sm">
            <div className="modal-content">
              <div className={`modal-header bg-${popupType === 'warning' ? 'warning text-dark' : 'danger text-white'}`}>
                <h5 className="modal-title"><i className={`bi bi-exclamation-triangle me-2`}></i> {popupType === 'warning' ? 'Avertissement' : 'Erreur'}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={handleCloseErrorPopup}></button>
              </div>
              <div className="modal-body">
                <p>{errorPopupMessage}</p>
              </div>
              <div className="modal-footer">
                <button type="button" className={`btn btn-${popupType === 'warning' ? 'warning text-dark' : 'danger'}`} onClick={handleCloseErrorPopup}>Fermer</button>
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
