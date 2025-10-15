import React, { useState } from "react";
import styles from "../styles/badgeDisplay.module.css";
import BadgeModal from "./BadgeModal";

const BadgeDisplay = ({ badges }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);

  const openModal = (badge) => {
    setSelectedBadge(badge);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedBadge(null);
  };

  if (!badges || badges.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            <i className="bi bi-award" style={{ color: '#F36F35', fontSize: '24px' }}></i>
            Mes Badges
          </h2>
        </div>
        <div className={styles.emptyState}>
          <i className={`bi bi-award ${styles.emptyIcon}`}></i>
          <p className={styles.emptyText}>
            Aucun badge obtenu pour l'instant.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>
        <i className="bi bi-award" style={{ color: '#F36F35', fontSize: '24px' }}></i>
          Mes Badges
          </h2>
      </div>
      <div className="card-body">
        <div className="row g-3">
          {badges.map((badge) => (
            <div key={badge._id} className="col-6 col-md-4 col-lg-3">
              <div
                className="card h-100 text-center"
                onClick={() => openModal(badge)}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.cardImg}>
                  {badge.icon ? (
                    <img src={`/badges/${badge.icon}`} alt={badge.name} className={styles.badgeImage} />
                  ) : (
                    <i className="bi bi-patch-check fs-2 text-info mb-2"></i>
                  )}
                  <p className="card-title badge-title mb-1">{badge.name}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {showModal && selectedBadge && (
        <BadgeModal badge={selectedBadge} onClose={closeModal} />
      )}
    </div>
  );
};

export default BadgeDisplay;