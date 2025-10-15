import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getAuthToken } from "../utils/auth"; // Importer la fonction getAuthToken
import { getAvatarUrl } from "../utils/imageHelper";
import styles from "../styles/profile.module.css";
import EditProfileForm from "../components/EditProfileForm";
import ProfileImageSelector from "../components/ProfileImageSelector";
import Loader from "../components/Loader";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [selectedFile, setSelectedFile] = useState(null); // Pour le fichier de la photo de profil
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false); // État pour la modale du mot de passe
  const [showImageSelector, setShowImageSelector] = useState(false); // État pour le sélecteur d'image
  const [showEditInfoModal, setShowEditInfoModal] = useState(false); // État pour la modale d'édition des infos
  const router = useRouter();
  const token = getAuthToken(); // Utiliser la fonction d'aide

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    const fetchUserProfile = async () => {
      try {
        const res = await fetch(`${API}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch user profile.");
        const data = await res.json();
        setUser(data);
        // console.log("Données utilisateur reçues:", data); // LOG pour débogage: Afficher toutes les données utilisateur
      } catch (e) {
        console.error("Error fetching user profile:", e);
        setError(e.message);
      }
    };
    fetchUserProfile();
  }, [token]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmNewPassword) {
      setError("Les nouveaux mots de passe ne correspondent pas.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Le nouveau mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    try {
      const res = await fetch(`${API}/users/me/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Mot de passe mis à jour avec succès !");
        setOldPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
        setShowPasswordModal(false); // Fermer la modale
      } else {
        throw new Error(
          data.message || "Échec de la mise à jour du mot de passe."
        );
      }
    } catch (e) {
      setError(e.message);
    }
  };

  const handlePredefinedImageSelect = async (imagePath) => {
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${API}/users/me/profile-picture`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ profilePicture: imagePath }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        console.error('Erreur backend:', data);
        throw new Error(
          data.message || data.error || "Échec de la mise à jour de la photo de profil."
        );
      }
      
      const data = await res.json();
      setSuccess("Photo de profil mise à jour avec succès !");
      setUser((prevUser) => ({
        ...prevUser,
        profilePicture: data.profilePicture || imagePath,
      }));
      setShowImageSelector(false);
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      console.error("Error updating profile picture:", e);
      setError(e.message || "Erreur lors de la mise à jour de la photo");
    }
  };

  const handleFileUpload = async (file) => {
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append("profilePicture", file);

    try {
      const res = await fetch(`${API}/users/me/profile-picture/upload`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Photo de profil mise à jour avec succès !");
        setUser((prevUser) => ({
          ...prevUser,
          profilePicture: data.profilePicture,
        }));
        setShowImageSelector(false);
        
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(
          data.message || data.error || "Échec de la mise à jour de la photo de profil."
        );
      }
    } catch (e) {
      console.error("Error updating profile picture:", e);
      setError(e.message);
    }
  };

  const handleUpdatePersonalInfo = async (formData) => {
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${API}/users/me/info`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          firstName: formData.firstName,
          email: formData.email,
          gender: formData.gender,
          dateOfBirth: formData.dateOfBirth || null,
          nationality: formData.nationality,
          phoneNumber: formData.phoneNumber,
          address: formData.address,
          emergencyContact: formData.emergencyContact,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Informations personnelles mises à jour avec succès !");
        setUser((prevUser) => ({
          ...prevUser,
          name: data.name,
          firstName: data.firstName,
          email: data.email,
          gender: data.gender,
          dateOfBirth: data.dateOfBirth,
          nationality: data.nationality,
          phoneNumber: data.phoneNumber,
          address: data.address,
          emergencyContact: data.emergencyContact,
        })); // Mettre à jour localement
        
        // Fermer la modale après un court délai pour voir le message de succès
        setTimeout(() => {
          setShowEditInfoModal(false);
          setSuccess(null);
        }, 1500);
      } else {
        throw new Error(
          data.error || data.message || "Échec de la mise à jour des informations."
        );
      }
    } catch (e) {
      console.error("Error updating personal info:", e);
      setError(e.message);
    }
  };

  const openEditInfoModal = () => {
    setError(null);
    setSuccess(null);
    setShowEditInfoModal(true);
  };

  const closeEditInfoModal = () => {
    setError(null);
    setSuccess(null);
    setShowEditInfoModal(false);
  };

  if (!user) {
    return <Loader message="Chargement du profil..." />;
  }

  return (
    <div className="container-fluid mt-4 pt-5 px-4">
      {success && (
        <div className="alert alert-success mt-3" role="alert">
          <i className="bi bi-check-circle me-2"></i>{success}
        </div>
      )}
      {error && (
        <div className="alert alert-danger mt-3" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i>{error}
        </div>
      )}

      {/* Header Section */}
      <div className={styles.profileHeader}>
        <div className="row align-items-center">
            <div className="col-md-auto text-center mb-3 mb-md-0">
              <div className={styles.profileImageContainer}>
                <img
                  src={getAvatarUrl(user.profilePicture)}
                  alt="Photo de profil"
                  className={styles.profileAvatar}
                />
                <button
                  className={styles.editProfileImageBtn}
                  onClick={() => setShowImageSelector(true)}
                  title="Changer la photo de profil"
                >
                  <i className="bi bi-pencil-fill"></i>
                </button>
              </div>
            </div>
            <div className="col-md">
            <h1 className="mb-2" style={{ fontSize: '36px', fontWeight: '700' }}>{user.name}</h1>
            <p className="mb-3" style={{ fontSize: '16px', opacity: '0.9' }}>
              <i className="bi bi-envelope me-2"></i>{user.email}
            </p>
            <div className="d-flex flex-wrap gap-2 mb-3">
              <span className={styles.infoBadge}>
                <i className="bi bi-briefcase"></i>
                {user.role}
              </span>
              <span className={styles.infoBadge}>
                <i className="bi bi-check-circle"></i>
                {user.status}
              </span>
              <span className={styles.infoBadge}>
                <i className="bi bi-clock"></i>
                Connecté le {new Date(user.lastLogin).toLocaleDateString('fr-FR')}
              </span>
            </div>
            <div className="d-flex flex-wrap gap-3 mt-4">
              <button
                className={styles.actionBtn}
                onClick={openEditInfoModal}
              >
                <i className="bi bi-pencil-square"></i> Modifier mes infos
              </button>
              <button
                className={styles.actionBtn}
                onClick={() => setShowPasswordModal(true)}
              >
                <i className="bi bi-key"></i> Changer le mot de passe
              </button>
            </div>
          </div>
            </div>
          </div>



      {/* Stats Section */}
      {user.role === "apprenant" && (
        <div className="row mb-4">
          <div className="col-md-3 mb-3">
            <div className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.green}`}>
                <i className="bi bi-trophy"></i>
              </div>
              <div>
                <div className={styles.statValue}>{user.level}</div>
                <div className={styles.statLabel}>Niveau</div>
              </div>
            </div>
          </div>
          <div className="col-md-3 mb-3">
            <div className={`${styles.statCard} ${styles.orange}`}>
              <div className={`${styles.statIcon} ${styles.orange}`}>
                <i className="bi bi-star"></i>
              </div>
              <div>
                <div className={styles.statValue}>{user.evaluationPoints || 0}</div>
                <div className={styles.statLabel}>Points d'évaluation</div>
              </div>
            </div>
          </div>
          <div className="col-md-3 mb-3">
            <div className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.green}`}>
                <i className="bi bi-hourglass-split"></i>
              </div>
              <div>
                <div className={styles.statValue}>{user.daysRemaining}</div>
                <div className={styles.statLabel}>Jours restants</div>
              </div>
            </div>
          </div>
          <div className="col-md-3 mb-3">
            <div className={`${styles.statCard} ${styles.orange}`}>
              <div className={`${styles.statIcon} ${styles.orange}`}>
                <i className="bi bi-check-circle"></i>
              </div>
              <div>
                <div className={styles.statValue}>{user.totalProjectsCompleted || 0}</div>
                <div className={styles.statLabel}>Projets complétés</div>
              </div>
            </div>
          </div>
        </div>
      )}


            {/* Informations personnelles détaillées - Pour tous les rôles */}
        <div className="row mb-4">
          <div className="col-12">
            <div className={styles.progressCard}>
              <h3 className={styles.sectionTitle}>
                <i className="bi bi-person-vcard"></i>
                Informations personnelles
              </h3>
          <div className="row">
            <div className="col-md-6 mb-3">
                  <p className="mb-2">
                    <strong className={styles.textPrimary}>
                      <i className="bi bi-person me-2"></i>Nom complet:
                    </strong>{" "}
                    <span className={styles.textDark}>
                      {user.firstName ? `${user.name} ${user.firstName}` : user.name}
                    </span>
                  </p>
                  <p className="mb-2">
                    <strong className={styles.textPrimary}>
                      <i className="bi bi-envelope me-2"></i>Email:
                </strong>{" "}
                    <span className={styles.textDark}>{user.email}</span>
                  </p>
                  {user.phoneNumber && (
                    <p className="mb-2">
                      <strong className={styles.textPrimary}>
                        <i className="bi bi-telephone me-2"></i>Téléphone:
                </strong>{" "}
                      <span className={styles.textDark}>{user.phoneNumber}</span>
                    </p>
                  )}
                  {user.gender && (
                    <p className="mb-2">
                      <strong className={styles.textPrimary}>
                        <i className="bi bi-gender-ambiguous me-2"></i>Genre:
                      </strong>{" "}
                      <span className={styles.textDark}>{user.gender}</span>
                    </p>
                  )}
            </div>
            <div className="col-md-6 mb-3">
                  {user.dateOfBirth && (
                    <p className="mb-2">
                      <strong className={styles.textPrimary}>
                        <i className="bi bi-calendar me-2"></i>Date de naissance:
                      </strong>{" "}
                      <span className={styles.textDark}>
                        {new Date(user.dateOfBirth).toLocaleDateString('fr-FR')}
                      </span>
                    </p>
                  )}
                  {user.nationality && (
                    <p className="mb-2">
                      <strong className={styles.textPrimary}>
                        <i className="bi bi-flag me-2"></i>Nationalité:
                      </strong>{" "}
                      <span className={styles.textDark}>{user.nationality}</span>
                    </p>
                  )}
                  {(user.address?.street || user.address?.city || user.address?.country) && (
                    <p className="mb-2">
                      <strong className={styles.textPrimary}>
                        <i className="bi bi-geo-alt me-2"></i>Adresse:
                      </strong>{" "}
                      <span className={styles.textDark}>
                        {[user.address?.street, user.address?.city, user.address?.country]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    </p>
                  )}
                </div>
              </div>
              
              {/* Contact d'urgence */}
              {(user.emergencyContact?.name || user.emergencyContact?.phone) && (
                <>
                  <hr className={styles.hrSeparator} style={{ margin: '20px 0' }} />
                  <h5 className={styles.textSecondary} style={{ fontWeight: '600', marginBottom: '15px' }}>
                    <i className="bi bi-telephone-fill me-2"></i>
                    Contact d'urgence
                  </h5>
                  <div className="row">
                    <div className="col-md-6 mb-2">
                      {user.emergencyContact?.name && (
                        <p className="mb-2">
                          <strong className={styles.textSecondary}>
                            <i className="bi bi-person me-2"></i>Nom:
                          </strong>{" "}
                          <span className={styles.textDark}>{user.emergencyContact.name}</span>
                        </p>
                      )}
                      {user.emergencyContact?.relationship && (
                        <p className="mb-2">
                          <strong className={styles.textSecondary}>
                            <i className="bi bi-people me-2"></i>Lien:
                          </strong>{" "}
                          <span className={styles.textDark}>{user.emergencyContact.relationship}</span>
                        </p>
                      )}
                    </div>
                    <div className="col-md-6 mb-2">
                      {user.emergencyContact?.phone && (
                        <p className="mb-2">
                          <strong className={styles.textSecondary}>
                            <i className="bi bi-telephone me-2"></i>Téléphone:
                          </strong>{" "}
                          <span className={styles.textDark}>{user.emergencyContact.phone}</span>
                        </p>
                      )}
                      {user.emergencyContact?.address && (
                        <p className="mb-2">
                          <strong className={styles.textSecondary}>
                            <i className="bi bi-geo-alt me-2"></i>Adresse:
                          </strong>{" "}
                          <span className={styles.textDark}>{user.emergencyContact.address}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>


      {/* Progress Section */}
      {user.role === "apprenant" && user.progress && (
        <div className="row mb-4">
          <div className="col-12">
            <div className={styles.progressCard}>
              <h3 className={styles.sectionTitle}>
                <i className="bi bi-graph-up"></i>
                Progression du Curriculum
              </h3>
              <div className="d-flex justify-content-between mb-2">
                <span className={styles.textMuted} style={{ fontSize: '15px' }}>
                  Projet {user.progress.currentProject} sur {user.progress.totalProjectsOverall}
                </span>
                <span className={styles.textPrimary} style={{ fontWeight: '600', fontSize: '15px' }}>
                  {Math.round((user.progress.currentProject / user.progress.totalProjectsOverall) * 100)}%
                </span>
              </div>
              <div className={styles.progressBarCustom}>
                <div 
                  className={styles.progressBarFill} 
                  style={{ width: `${(user.progress.currentProject / user.progress.totalProjectsOverall) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Badges Section */}
      {user.role === "apprenant" && user.badges && user.badges.length > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            <div className={styles.progressCard}>
              <h3 className={styles.sectionTitle}>
                <i className="bi bi-award"></i>
                Badges
              </h3>
              <div className="d-flex flex-wrap">
                {user.badges.map((badge, index) => (
                  <span key={index} className={styles.badgeItem} title={badge.description}>
                    <i className="bi bi-award-fill"></i>
                    {badge.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current Project Section */}
      {user.role === "apprenant" && user.projects && user.projects.length > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            <h3 className={styles.sectionTitle}>
              <i className="bi bi-folder"></i>
              Projet en cours
            </h3>
            {user.projects.map((project, index) => (
              <div key={index} className={styles.projectCard}>
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <h4 className={styles.textPrimary} style={{ fontWeight: '600', marginBottom: '8px' }}>
                      {project.title}
                    </h4>
                    <span className="badge" style={{ background: '#F36F35', color: 'white' }}>
                      {project.module}
                    </span>
                  </div>
                  <span className="badge" style={{ background: '#179349', color: 'white', fontSize: '14px' }}>
                    {project.size === 'short' ? 'Court' : project.size === 'medium' ? 'Moyen' : 'Long'}
                  </span>
                </div>
                <p className={styles.textMuted} style={{ marginBottom: '15px' }}>
                  {project.description}
                </p>
                <div className="row">
                  <div className="col-md-6">
                    <h5 className={styles.textPrimary} style={{ fontSize: '16px', marginBottom: '10px' }}>
                      <i className="bi bi-bullseye me-2"></i>Objectifs
                    </h5>
                    <ul className={styles.textMuted} style={{ paddingLeft: '20px' }}>
                      {project.objectives && project.objectives.map((obj, idx) => (
                        <li key={idx} style={{ marginBottom: '5px' }}>{obj}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="col-md-6">
                    <h5 className={styles.textSecondary} style={{ fontSize: '16px', marginBottom: '10px' }}>
                      <i className="bi bi-list-check me-2"></i>Affectations
                    </h5>
                    <p className={styles.textMuted}>
                      {project.assignments ? project.assignments.length : 0} tâche(s) assignée(s)
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modale pour modifier les informations personnelles */}
      {showEditInfoModal && (
        <>
          <div className={styles.customModal}>
            <div className={styles.modalContentCustom}>
              <div className={styles.modalHeaderCustom}>
                <h5 className="mb-0" style={{ fontSize: '20px', fontWeight: '600' }}>
                  <i className="bi bi-pencil-square me-2"></i>
                  Modifier mes informations
                </h5>
                <button
                  className={styles.closeBtnCustom}
                  onClick={() => setShowEditInfoModal(false)}
                >
                  <i className="bi bi-x" style={{ fontSize: '24px' }}></i>
                </button>
              </div>
              <div className={styles.modalBodyCustom} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <EditProfileForm
                  user={user}
                  onSubmit={handleUpdatePersonalInfo}
                  onCancel={closeEditInfoModal}
                  error={error}
                  success={success}
                />
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}

      {/* Sélecteur de photo de profil */}
      {showImageSelector && (
        <ProfileImageSelector
          currentImage={user.profilePicture}
          onImageSelect={handlePredefinedImageSelect}
          onFileUpload={handleFileUpload}
          onClose={() => setShowImageSelector(false)}
        />
      )}

      {/* Modale pour changer le mot de passe */}
      {showPasswordModal && (
        <>
          <div className={styles.customModal}>
            <div className={styles.modalContentCustom}>
              <div className={styles.modalHeaderCustom}>
                <h5 className="mb-0" style={{ fontSize: '20px', fontWeight: '600' }}>
                  <i className="bi bi-key me-2"></i>
                  Changer le Mot de Passe
                </h5>
                <button
                  className={styles.closeBtnCustom}
                  onClick={() => setShowPasswordModal(false)}
                >
                  <i className="bi bi-x" style={{ fontSize: '24px' }}></i>
                </button>
              </div>
              <div className={styles.modalBodyCustom}>
                {error && (
                  <div className="alert alert-danger mb-3" role="alert">
                    <i className="bi bi-exclamation-circle me-2"></i>
                    {error}
                  </div>
                )}
                {success && (
                  <div className="alert alert-success mb-3" role="alert">
                    <i className="bi bi-check-circle me-2"></i>
                    {success}
                  </div>
                )}
                <form onSubmit={handleChangePassword}>
                  <div className="mb-3">
                    <label htmlFor="oldPassword" className="form-label" style={{ fontWeight: '600', color: '#333' }}>
                      Ancien Mot de Passe
                    </label>
                    <input
                      type="password"
                      className={`form-control ${styles.formControlCustom}`}
                      id="oldPassword"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="newPassword" className="form-label" style={{ fontWeight: '600', color: '#333' }}>
                      Nouveau Mot de Passe
                    </label>
                    <input
                      type="password"
                      className={`form-control ${styles.formControlCustom}`}
                      id="newPassword"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <small style={{ color: '#666', fontSize: '13px' }}>
                      Minimum 6 caractères
                    </small>
                  </div>
                  <div className="mb-4">
                    <label htmlFor="confirmNewPassword" className="form-label" style={{ fontWeight: '600', color: '#333' }}>
                      Confirmer Nouveau Mot de Passe
                    </label>
                    <input
                      type="password"
                      className={`form-control ${styles.formControlCustom}`}
                      id="confirmNewPassword"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className={styles.submitBtnCustom}>
                    <i className="bi bi-save"></i>
                    Changer le Mot de Passe
                  </button>
                </form>
              </div>
            </div>
          </div>
        <div className="modal-backdrop fade show"></div>
        </>
      )}
    </div>
  );
}
