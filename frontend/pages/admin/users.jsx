import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { getAuthToken } from '../../utils/auth';
import Loader from '../../components/Loader';
import styles from '../../styles/adminUsers.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [me, setMe] = useState(null); // Pour stocker les infos de l'utilisateur (rôle)

  // États pour les modales CRUD
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [showToggleStatusModal, setShowToggleStatusModal] = useState(false);
  const [showAssignProjectModal, setShowAssignProjectModal] = useState(false); // Nouveau: modale d'assignation de projet

  // États pour le formulaire d'ajout/édition
  const [currentUser, setCurrentUser] = useState(null); // Utilisateur actuellement sélectionné pour modification/suppression/statut
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState('apprenant');
  const [userLevel, setUserLevel] = useState(1);
  const [userStatus, setUserStatus] = useState('active');
  const [userDaysRemaining, setUserDaysRemaining] = useState(30);
  const [confirmUserName, setConfirmUserName] = useState(''); // Pour la confirmation de suppression
  const [availableProjects, setAvailableProjects] = useState([]); // Nouveau: liste des projets templates disponibles
  const [selectedProjectToAssignId, setSelectedProjectToAssignId] = useState(''); // Nouveau: projet sélectionné pour assignation

  const router = useRouter();

  const fetchUsers = useCallback(async (token) => {
    try {
      setLoading(true);
      setError(null);

      const userRes = await fetch(`${API}/users/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (!userRes.ok) {
        const errorData = await userRes.json();
        throw new Error(errorData.error || 'Échec du chargement des données utilisateur.');
      }
      const userData = await userRes.json();
      setMe(userData);

      if (userData.role !== 'staff' && userData.role !== 'admin') {
        router.push('/'); // Rediriger si non autorisé
        return;
      }

      const usersRes = await fetch(`${API}/users`, { headers: { Authorization: `Bearer ${token}` } });
      if (!usersRes.ok) {
        const errorData = await usersRes.json();
        throw new Error(errorData.error || 'Échec du chargement des utilisateurs.');
      }
      const usersData = await usersRes.json();
      setUsers(usersData);
    } catch (e) {
      setError('Erreur lors du chargement des utilisateurs: ' + e.message);
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [API, router]);

  // Nouvelle fonction pour récupérer les projets templates
  const fetchProjectTemplates = useCallback(async (token) => {
    try {
      const res = await fetch(`${API}/projects`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Échec du chargement des projets templates.');
      }
      const data = await res.json();
      setAvailableProjects(data);
    } catch (e) {
      console.error('Error fetching project templates:', e);
      setError('Erreur lors du chargement des projets templates: ' + e.message);
    }
  }, [API]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }
    fetchUsers(token);
    fetchProjectTemplates(token); // Charger les projets templates au démarrage
  }, [router, fetchUsers, fetchProjectTemplates]);

  // Fonctions de gestion des modales
  const handleShowAddUserModal = () => {
    setUserName('');
    setUserEmail('');
    setUserPassword('');
    setUserRole('apprenant');
    setUserLevel(1);
    setUserStatus('active');
    setUserDaysRemaining(30); // Reset days remaining
    setCurrentUser(null);
    setError(null);
    setShowAddUserModal(true);
  };

  const handleCloseAddUserModal = () => {
    setShowAddUserModal(false);
    setError(null);
  };

  const handleShowEditUserModal = (user) => {
    setCurrentUser(user);
    setUserName(user.name);
    setUserEmail(user.email);
    setUserRole(user.role);
    setUserLevel(user.level || 1);
    setUserStatus(user.status || 'active');
    setUserDaysRemaining(user.daysRemaining || 30); // Set days remaining
    setUserPassword(''); // Laisser vide pour ne pas modifier si non renseigné
    setError(null);
    setShowEditUserModal(true);
  };

  const handleCloseEditUserModal = () => {
    setShowEditUserModal(false);
    setError(null);
    setCurrentUser(null);
  };

  const handleShowDeleteUserModal = (user) => {
    setCurrentUser(user);
    setConfirmUserName('');
    setError(null);
    setShowDeleteUserModal(true);
  };

  const handleCloseDeleteUserModal = () => {
    setShowDeleteUserModal(false);
    setCurrentUser(null);
    setError(null);
  };

  const handleShowToggleStatusModal = (user) => {
    setCurrentUser(user);
    setUserStatus(user.status);
    setError(null);
    setShowToggleStatusModal(true);
  };

  const handleCloseToggleStatusModal = () => {
    setShowToggleStatusModal(false);
    setCurrentUser(null);
    setError(null);
  };

  // Nouveau: Fonctions pour l'assignation de projet
  const handleShowAssignProjectModal = (user) => {
    setCurrentUser(user); // L'apprenant à qui assigner le projet
    setSelectedProjectToAssignId(''); // Réinitialiser le projet sélectionné
    setError(null);
    setShowAssignProjectModal(true);
  };

  const handleCloseAssignProjectModal = () => {
    setShowAssignProjectModal(false);
    setCurrentUser(null);
    setSelectedProjectToAssignId('');
    setError(null);
  };

  // Fonctions CRUD
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: userName, email: userEmail, password: userPassword, role: userRole, level: userLevel, status: userStatus, daysRemaining: userDaysRemaining }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Utilisateur créé avec succès !');
        handleCloseAddUserModal();
        fetchUsers(token);
      } else {
        throw new Error(data.error || "Échec de la création de l'utilisateur.");
      }
    } catch (e) {
      console.error('Error creating user:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const token = getAuthToken();
      const body = { name: userName, email: userEmail, role: userRole, level: userLevel, status: userStatus, daysRemaining: userDaysRemaining };
      if (userPassword) { // N'envoyer le mot de passe que s'il est renseigné
        body.password = userPassword;
      }
      const res = await fetch(`${API}/users/${currentUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Utilisateur mis à jour avec succès !');
        handleCloseEditUserModal();
        fetchUsers(token);
      } else {
        throw new Error(data.error || "Échec de la mise à jour de l utilisateur.");
      }
    } catch (e) {
      console.error('Error updating user:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    setError(null);
    setLoading(true);
    if (confirmUserName !== currentUser.name) {
      setError('Le nom de confirmation ne correspond pas.');
      setLoading(false);
      return;
    }
    try {
      const token = getAuthToken();
      const res = await fetch(`${API}/users/${currentUser._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        alert('Utilisateur supprimé avec succès !');
        handleCloseDeleteUserModal();
        fetchUsers(token);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Échec de la suppression de l'utilisateur.");
      }
    } catch (e) {
      console.error('Error deleting user:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (newStatus) => {
    setError(null);
    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API}/users/${currentUser._id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Statut de l'utilisateur mis à jour à '${newStatus}' avec succès !`);
        handleCloseToggleStatusModal();
        fetchUsers(token);
      } else {
        throw new Error(data.error || 'Échec de la mise à jour du statut.');
      }
    } catch (e) {
      console.error('Error toggling user status:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignProject = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (!currentUser || !selectedProjectToAssignId) {
        throw new Error('Apprenant ou projet non sélectionné.');
      }

      const token = getAuthToken();
      const res = await fetch(`${API}/projects/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ studentId: currentUser._id, projectId: selectedProjectToAssignId }),
      });

      const data = await res.json();
      if (res.ok) {
        alert('Projet assigné avec succès !');
        handleCloseAssignProjectModal();
        fetchUsers(token); // Recharger les utilisateurs pour mettre à jour l'affichage
      } else {
        throw new Error(data.error || 'Échec de l\'assignation du projet.');
      }
    } catch (e) {
      console.error('Error assigning project:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !me) {
    return <Loader message="Chargement des données..." />;
  }

  if (error) return (
    <div className="container-fluid mt-5">
      <div className={`${styles.alert} ${styles.danger}`}>
        <i className="bi bi-exclamation-triangle"></i>
        Erreur: {error}
      </div>
    </div>
  );

  if (me && me.role !== 'staff' && me.role !== 'admin') {
    return (
      <div className="container-fluid mt-5">
        <div className={`${styles.alert} ${styles.danger}`}>
          <i className="bi bi-shield-exclamation"></i>
          Accès non autorisé.
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.pageContainer} container-fluid pt-5`}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>
          <i className="bi bi-people-fill"></i>
          Gestion des Utilisateurs
        </h1>
        <button className={styles.addButton} onClick={handleShowAddUserModal}>
          <i className="bi bi-person-plus"></i>
          Ajouter un Utilisateur
        </button>
      </div>

      {users.length === 0 ? (
        <div className={`${styles.alert} ${styles.info}`}>
          <i className="bi bi-info-circle"></i>
          Aucun utilisateur trouvé.
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <div className={styles.tableWrapper}>
            <table className={styles.customTable}>
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
                <th style={{ textAlign: 'center' }}>
                  <i className="bi bi-shield-fill-check me-2"></i>
                  Rôle
                </th>
                <th style={{ textAlign: 'center' }}>
                  <i className="bi bi-bar-chart-fill me-2"></i>
                  Niveau
                </th>
                <th style={{ textAlign: 'center' }}>
                  <i className="bi bi-hourglass-split me-2"></i>
                  Jours
                </th>
                <th style={{ textAlign: 'center' }}>
                  <i className="bi bi-check-circle-fill me-2"></i>
                  Statut
                </th>
                <th>
                  <i className="bi bi-folder-fill me-2"></i>
                  Projet Assigné
                </th>
                <th>
                  <i className="bi bi-gear-fill me-2"></i>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id}>
                  <td><strong>{user.name}</strong></td>
                  <td style={{ fontSize: '12px' }}>{user.email}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`${styles.roleBadge} ${styles[user.role]}`}>
                       {user.role === 'admin' ? 'Admin' : 
                        user.role === 'staff' ? 'Staff' : 
                        user.role === 'evaluator' ? 'Évaluateur' : 
                        'Apprenant'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>{user.level || '-'}</td>
                  <td style={{ textAlign: 'center' }}>{user.daysRemaining || '-'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`${styles.statusBadge} ${styles[user.status]}`}>
                      <i className={`bi bi-${user.status === 'active' ? 'check-circle' : user.status === 'inactive' ? 'pause-circle' : 'x-circle'}`}></i>
                      {user.status === 'active' ? 'Actif' : user.status === 'inactive' ? 'Inactif' : 'Bloqué'}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px' }}>
                    {user.assignedProject ? (
                      <div className="d-flex flex-column align-items-start">
                        <span title={user.assignedProject.title} className="fw-bold mb-1">
                          {user.assignedProject.title.length > 25
                            ? `${user.assignedProject.title.substring(0, 25)}...`
                            : user.assignedProject.title}
                        </span>
                        <span
                          className={`badge rounded-pill bg-${(() => {
                            if (user.assignedProject.status === "assigned") return "warning text-dark";
                            if (user.assignedProject.status === "submitted") return "info";
                            if (user.assignedProject.status === "awaiting_staff_review") return "primary";
                            if (user.assignedProject.status === "approved") return "success";
                            if (user.assignedProject.status === "rejected") return "danger";
                            return "secondary";
                          })()}`}
                        >
                          <i
                            className={`bi bi-${(() => {
                              if (user.assignedProject.status === "assigned") return "clock";
                              if (user.assignedProject.status === "submitted") return "hourglass-split";
                              if (user.assignedProject.status === "awaiting_staff_review") return "person-workspace";
                              if (user.assignedProject.status === "approved") return "check-circle";
                              if (user.assignedProject.status === "rejected") return "x-circle";
                              return "question-circle";
                            })()} me-1`}
                          ></i>
                          {user.assignedProject.status === "assigned"
                            ? "Assigné"
                            : user.assignedProject.status === "submitted"
                            ? "Soumis"
                            : user.assignedProject.status === "awaiting_staff_review"
                            ? "En révision Staff"
                            : user.assignedProject.status === "approved"
                            ? "Approuvé"
                            : user.assignedProject.status === "rejected"
                            ? "Rejeté"
                            : "Inconnu"}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: '#999', fontStyle: 'italic' }}>Aucun</span>
                    )}
                  </td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button 
                        className={`${styles.actionBtn} ${styles.edit}`} 
                        onClick={() => handleShowEditUserModal(user)} 
                        title="Modifier Utilisateur"
                      >
                        <i className="bi bi-pencil-square"></i>
                      </button>
                      {me && me.role === 'admin' && (
                        <button 
                          className={`${styles.actionBtn} ${styles.toggle}`} 
                          onClick={() => handleShowToggleStatusModal(user)} 
                          title="Changer Statut"
                        >
                          <i className={`bi bi-${user.status === 'active' ? 'person-x' : 'person-check'}`}></i>
                        </button>
                      )}
                      {me && me.role === 'admin' && (
                        <button 
                          className={`${styles.actionBtn} ${styles.delete}`} 
                          onClick={() => handleShowDeleteUserModal(user)} 
                          title="Supprimer Utilisateur"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      )}
                      {user.role === 'apprenant' && me && me.role === 'admin' && (
                        <button 
                          className={`${styles.actionBtn} ${styles.assign}`} 
                          onClick={() => handleShowAssignProjectModal(user)} 
                          title="Assigner Projet"
                        >
                          <i className="bi bi-folder-plus"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Modale d'ajout/édition d'utilisateur */}
      {(showAddUserModal || showEditUserModal) && (
        <div className={styles.modalOverlay} onClick={currentUser ? handleCloseEditUserModal : handleCloseAddUserModal}>
          <div className={styles.modalDialog} onClick={(e) => e.stopPropagation()}>
            <div className={`${styles.modalHeader} ${styles.green}`}>
              <h5 className={styles.modalTitle}>
                <i className={`bi bi-${currentUser ? 'pencil-square' : 'person-plus'}`}></i>
                {currentUser ? 'Modifier Utilisateur' : 'Ajouter un Utilisateur'}
              </h5>
              <button type="button" className={styles.closeBtn} onClick={currentUser ? handleCloseEditUserModal : handleCloseAddUserModal}>
                <i className="bi bi-x"></i>
              </button>
            </div>
            <div className={styles.modalBody}>
              {error && (
                <div className={`${styles.alert} ${styles.danger}`}>
                  <i className="bi bi-exclamation-triangle"></i>
                  {error}
                </div>
              )}
                <form onSubmit={currentUser ? handleUpdateUser : handleCreateUser}>
                  <div className={styles.formGroup}>
                    <label htmlFor="userName" className={styles.formLabel}>Nom</label>
                    <input type="text" className={styles.formControl} id="userName" value={userName} onChange={(e) => setUserName(e.target.value)} required />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="userEmail" className={styles.formLabel}>Email</label>
                    <input type="email" className={styles.formControl} id="userEmail" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} required />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="userPassword" className={styles.formLabel}>Mot de passe {currentUser ? '(Laisser vide pour ne pas modifier)' : ''}</label>
                    <input type="password" className={styles.formControl} id="userPassword" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} { ...(!currentUser && { required: true }) } />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="userRole" className={styles.formLabel}>Rôle</label>
                    <select className={styles.formControl} id="userRole" value={userRole} onChange={(e) => setUserRole(e.target.value)}>
                      <option value="apprenant">Apprenant</option>
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                      <option value="evaluator">Évaluateur</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="userLevel" className={styles.formLabel}>Niveau</label>
                    <input type="number" className={styles.formControl} id="userLevel" value={userLevel} onChange={(e) => setUserLevel(parseInt(e.target.value))} min="1" />
                  </div>
                  {me && me.role === 'admin' && (
                    <div className={styles.formGroup}>
                      <label htmlFor="userDaysRemaining" className={styles.formLabel}>Jours Restants</label>
                      <input type="number" className={styles.formControl} id="userDaysRemaining" value={userDaysRemaining} onChange={(e) => setUserDaysRemaining(parseInt(e.target.value))} min="0" />
                    </div>
                  )}
                  <div className={styles.formGroup}>
                    <label htmlFor="userStatus" className={styles.formLabel}>Statut</label>
                    <select className={styles.formControl} id="userStatus" value={userStatus} onChange={(e) => setUserStatus(e.target.value)}>
                      <option value="active">Actif</option>
                      <option value="inactive">Inactif</option>
                      <option value="blocked">Bloqué</option>
                    </select>
                  </div>
                  <button type="submit" className={styles.submitBtn} disabled={loading}>
                    {loading ? (
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    ) : (
                      <i className="bi bi-save"></i>
                    )}
                    {currentUser ? 'Modifier' : 'Ajouter'}
                  </button>
                </form>
            </div>
          </div>
        </div>
      )}

      {/* Modale de suppression d'utilisateur */}
      {showDeleteUserModal && currentUser && (
        <div className={styles.modalOverlay} onClick={handleCloseDeleteUserModal}>
          <div className={styles.modalDialog} onClick={(e) => e.stopPropagation()}>
            <div className={`${styles.modalHeader} ${styles.red}`}>
              <h5 className={styles.modalTitle}>
                <i className="bi bi-trash"></i>
                Confirmer la Suppression
              </h5>
              <button type="button" className={styles.closeBtn} onClick={handleCloseDeleteUserModal}>
                <i className="bi bi-x"></i>
              </button>
            </div>
            <div className={styles.modalBody}>
              {error && (
                <div className={`${styles.alert} ${styles.danger}`}>
                  <i className="bi bi-exclamation-triangle"></i>
                  {error}
                </div>
              )}
              <p style={{ marginBottom: '15px' }}>
                Êtes-vous sûr de vouloir supprimer l'utilisateur "<strong>{currentUser.name}</strong>" ({currentUser.email}) ? 
                Cette action est <strong>irréversible</strong> et supprimera également toutes les données associées (projets, évaluations, etc.).
              </p>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Veuillez taper le nom de l'utilisateur (exactement) pour confirmer :</label>
                <input 
                  type="text" 
                  className={styles.formControl} 
                  value={confirmUserName} 
                  onChange={(e) => setConfirmUserName(e.target.value)} 
                  placeholder={currentUser.name} 
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={handleCloseDeleteUserModal}>
                Annuler
              </button>
              <button 
                type="button" 
                className={styles.deleteBtn} 
                onClick={handleDeleteUser} 
                disabled={loading || confirmUserName !== currentUser.name}
              >
                {loading ? (
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

      {/* Modale de changement de statut */}
      {showToggleStatusModal && currentUser && (
        <div className={styles.modalOverlay} onClick={handleCloseToggleStatusModal}>
          <div className={styles.modalDialog} onClick={(e) => e.stopPropagation()}>
            <div className={`${styles.modalHeader} ${styles.yellow}`}>
              <h5 className={styles.modalTitle}>
                <i className="bi bi-arrow-repeat"></i>
                Changer le Statut de l'Utilisateur
              </h5>
              <button type="button" className={styles.closeBtn} onClick={handleCloseToggleStatusModal}>
                <i className="bi bi-x"></i>
              </button>
            </div>
            <div className={styles.modalBody}>
              {error && (
                <div className={`${styles.alert} ${styles.danger}`}>
                  <i className="bi bi-exclamation-triangle"></i>
                  {error}
                </div>
              )}
              <p style={{ marginBottom: '15px' }}>
                Modifier le statut de l'utilisateur "<strong>{currentUser.name}</strong>" (actuel: <span className="fw-bold">{currentUser.status}</span>) :
              </p>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Nouveau statut</label>
                <select className={styles.formControl} value={userStatus} onChange={(e) => setUserStatus(e.target.value)}>
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                  <option value="blocked">Bloqué</option>
                </select>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={handleCloseToggleStatusModal}>
                Annuler
              </button>
              <button 
                type="button" 
                className={styles.updateBtn} 
                onClick={() => handleToggleUserStatus(userStatus)} 
                disabled={loading || userStatus === currentUser.status}
              >
                {loading ? (
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                ) : (
                  <i className="bi bi-arrow-repeat"></i>
                )}
                Mettre à jour le statut
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nouveau: Modale d'assignation de projet */}
      {showAssignProjectModal && currentUser && (
        <div className={styles.modalOverlay} onClick={handleCloseAssignProjectModal}>
          <div className={styles.modalDialog} onClick={(e) => e.stopPropagation()}>
            <div className={`${styles.modalHeader} ${styles.orange}`}>
              <h5 className={styles.modalTitle}>
                <i className="bi bi-folder-plus"></i>
                Assigner un Projet à {currentUser.name}
              </h5>
              <button type="button" className={styles.closeBtn} onClick={handleCloseAssignProjectModal}>
                <i className="bi bi-x"></i>
              </button>
            </div>
            <div className={styles.modalBody}>
              {error && (
                <div className={`${styles.alert} ${styles.danger}`}>
                  <i className="bi bi-exclamation-triangle"></i>
                  {error}
                </div>
              )}
              <form onSubmit={handleAssignProject}>
                <div className={styles.formGroup}>
                  <label htmlFor="projectToAssign" className={styles.formLabel}>Sélectionner un Projet</label>
                  <select
                    className={styles.formControl}
                    id="projectToAssign"
                    value={selectedProjectToAssignId}
                    onChange={(e) => setSelectedProjectToAssignId(e.target.value)}
                    required
                  >
                    <option value="">-- Choisir un projet --</option>
                    {availableProjects.filter(p =>
                      p.status === 'template' && !p.assignments.some(a => a.student === currentUser._id)
                    ).map(project => (
                      <option key={project._id} value={project._id}>
                        {project.title} (Order: {project.order})
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit" className={styles.submitBtn} disabled={loading || !selectedProjectToAssignId}>
                  {loading ? (
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  ) : (
                    <i className="bi bi-share"></i>
                  )}
                  Assigner le Projet
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminUsersPage;
