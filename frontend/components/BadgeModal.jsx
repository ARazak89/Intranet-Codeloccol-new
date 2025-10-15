import React from 'react';
import styles from "../styles/badgeDisplay.module.css";

const BadgeModal = ({ badge, onClose }) => {
  if (!badge) return null;

  const badgeImagePath = `/badges/${badge.icon}`;

  return (
    <div className={styles.customModal}>
      <div className={styles.modalContentCustom}>
        <div className={styles.modalHeaderCustom}>
          <h5 className="mb-0" style={{ fontSize: '20px', fontWeight: '600' }}>
            <i className="bi bi-award me-2"></i> {badge.name}
          </h5>
          <button
            className={styles.closeBtnCustom}
            onClick={onClose}
          >
            <i className="bi bi-x" style={{ fontSize: '24px' }}></i>
          </button>
        </div>
        <div className={styles.modalBodyCustom}>
          <div className="text-center mb-4">
            {badge.icon ? (
              <img src={badgeImagePath} alt={badge.name} className={styles.badgeImageLarge} />
            ) : (
              <i className="bi bi-patch-check display-1 text-info"></i>
            )}
          </div>
          <p className="text-center text-muted">{badge.description}</p>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={onClose}></div>
    </div>
  );
};

export default BadgeModal;
