import React from "react";
import styles from "../styles/progressTracker.module.css";

const ProgressTracker = ({ level, daysRemaining, progress, currentModuleName }) => {
  const progressPercentage =
    progress && progress.totalProjectsInModule > 0
      ? ((progress.currentProject / progress.totalProjectsInModule) * 100).toFixed(0)
      : 0;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          <i className="bi bi-graph-up" style={{ color: '#F36F35', fontSize: '24px' }}></i>
          Ma Progression
        </h2>
      </div>

      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div className={styles.statBox}>
          <div className={styles.statLabel}>
            Niveau actuel
          </div>
          <div className={styles.statValue}>
            <i className="bi bi-bar-chart-fill"></i>
            {level}
          </div>
        </div>

        <div className={`${styles.statBox} ${styles.statBoxOrange}`}>
          <div className={styles.statLabel}>
            Jours restants
          </div>
          <div className={`${styles.statValue} ${styles.statValueOrange}`}>
            <i className="bi bi-hourglass-split"></i>
            {daysRemaining}
          </div>
        </div>
      </div>

      {progress && (
        <div>
          <h6 className={styles.progressLabel}>
            <i className="bi bi-folder-check" style={{ color: '#F36F35' }}></i>
            Progression des projets
            {currentModuleName && (
              <span style={{ marginLeft: '10px', color: '#179349', fontWeight: 'bold' }}>
                ({currentModuleName})
              </span>
            )}
          </h6>
          <div className={styles.progressInfo}>
            <span className={styles.progressText}>
              {progress.currentProject}/{progress.totalProjectsInModule}
            </span>
            <span className={styles.progressPercent}>
              {progressPercentage}%
            </span>
          </div>
          <div className={styles.progressBarContainer}>
            <div
              className={styles.progressBar}
              style={{ width: `${progressPercentage}%` }}
            >
              {progressPercentage > 10 && `${progressPercentage}%`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressTracker;
