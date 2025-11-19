import React from "react";
import { getAvatarUrl } from "../utils/imageHelper";
import styles from "../styles/userSummaryCard.module.css";

const UserSummaryCard = ({ me, onShowCreateSlotModal, onShowAddUserModal }) => {
  const getRoleBadgeStyle = (role) => {
    const styles = {
      admin: { bg: 'linear-gradient(135deg, #F36F35 0%, #ff8556 100%)', icon: 'bi-shield-fill-check' },
      staff: { bg: 'linear-gradient(135deg, #6f42c1 0%, #9b72d4 100%)', icon: 'bi-briefcase-fill' },
      evaluator: { bg: 'linear-gradient(135deg, #0d6efd 0%, #5ea3ff 100%)', icon: 'bi-clipboard-check-fill' },
      apprenant: { bg: 'linear-gradient(135deg, #179349 0%, #1db558 100%)', icon: 'bi-mortarboard-fill' }
    };
    return styles[role] || styles.apprenant;
  };

  const roleStyle = getRoleBadgeStyle(me.role);

  return (
    <div className={styles.card}>

      <div className="d-flex flex-column h-100">
        {/* Header avec avatar et infos */}
        <div className="d-flex align-items-center mb-4">
          <div style={{ position: 'relative' }}>
          <img
            src={getAvatarUrl(me.profilePicture)}
            alt="Avatar"
              className={`rounded-circle ${styles.avatar}`}
            />
            <div style={{
              position: 'absolute',
              bottom: '-5px',
              right: '-5px',
              background: roleStyle.bg,
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '3px solid white',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
            }}>
              <i className={`bi ${roleStyle.icon}`} style={{ color: 'white', fontSize: '14px' }}></i>
            </div>
          </div>
          <div className="ms-3 flex-grow-1">
            <h5 className={styles.greeting}>
              Bonjour {me.name} 👋
            </h5>
            <p className={styles.email}>
              <i className="bi bi-envelope" style={{ color: '#F36F35' }}></i>
              {me.email}
            </p>
            <span style={{
              background: roleStyle.bg,
              color: 'white',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
            }}>
              <i className={`bi ${roleStyle.icon}`}></i>
              {me.role.charAt(0).toUpperCase() + me.role.slice(1)}
            </span>
          </div>
        </div>

        {/* Stats pour apprenant */}
        {me.role === "apprenant" && (
          <div className={`mb-3 ${styles.statsContainer}`}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>
                {me.level || 1}
              </span>
              <span className={styles.statLabel}>
                Niveau
          </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>
                {me.daysRemaining || 0}
              </span>
              <span className={styles.statLabel}>
                jours
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>
                  {me.evaluationPoints ?? 0}
                </span>
              <span className={styles.statLabel}>
                pts
              </span>
            </div>
              </div>
          )}
        <div className="mt-auto d-flex flex-column gap-2">
          {me.role === "apprenant" && (
            <button onClick={onShowCreateSlotModal} className={styles.actionButton}>
              <i className="bi bi-plus-circle"></i>
              Créer un slot de disponibilité
            </button>
          )}
          {(me.role === "staff" || me.role === "admin") && (
            <button onClick={onShowAddUserModal} className={styles.actionButton}>
              <i className="bi bi-person-plus"></i>
              Ajouter un Utilisateur
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSummaryCard;
