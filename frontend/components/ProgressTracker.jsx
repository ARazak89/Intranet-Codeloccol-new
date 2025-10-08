import React from "react";

const ProgressTracker = ({ level, daysRemaining, progress }) => {
  const progressPercentage =
    progress && progress.totalProjects > 0
      ? ((progress.currentProject / progress.totalProjects) * 100).toFixed(0)
      : 0;

  return (
    <div className="thm-shadow-s thm-bg p-3 rounded-3 h-100">
      <h5 className="mb-0">Ma Progression</h5>
      <hr />
      <div className="mb-3">
        <h6 className="mb-1">
          Niveau actuel: <span className="fw-bold text-primary">{level}</span>
        </h6>
        <h6>
          Jours restants:{" "}
          <span className="fw-bold text-success">{daysRemaining}</span>
        </h6>
      </div>

      {progress && (
        <div>
          <h3 className="h6">Progression des projets</h3>
          <p className="card-text">
            {progress.currentProject} / {progress.totalProjects} projets
            complétés
          </p>
          <div className="progress" style={{ height: "20px" }}>
            <div
              className="progress-bar bg-success"
              role="progressbar"
              style={{ width: `${progressPercentage}%` }}
              aria-valuenow={progressPercentage}
              aria-valuemin="0"
              aria-valuemax="100"
            >
              {progressPercentage}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressTracker;
