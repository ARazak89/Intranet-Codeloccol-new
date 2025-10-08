import React from "react";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const STATIC_ASSETS_BASE_URL = API.replace("/api", "");
const UserSummaryCard = ({ me, onShowCreateSlotModal, onShowAddUserModal }) => {
  return (
    <div className="thm-shadow-s h-100 thm-bg border-0 transform-hover rounded-2 p-3">
      <div className="d-flex flex-column">
        <div className="d-flex align-items-center mb-3">
          {/* <i className="bi bi-person-circle fs-1 text-primary me-3"></i>
           */}
          <img
            src={
              me.profilePicture
                ? `${STATIC_ASSETS_BASE_URL}${me.profilePicture}`
                : "/default-avatar.jpg"
            }
            alt="Avatar"
            className="rounded-circle me-2 border border-light"
            style={{ width: "30px", height: "30px", objectFit: "cover" }}
          />
          <div>
            <h5 className="mb-0">Bonjour {me.name}</h5>
            <p className="mb-0">{me.email}</p>
          </div>
        </div>
        <p className="flex-grow-1">
          Rôle:{" "}
          <span className="thm-bg-light thm-shadow-m px-1 me-1 rounded-2">
            {me.role}
          </span>
          {me.role === "apprenant" && (
            <>
              <span className="thm-bg-light thm-shadow-m px-1 me-1 rounded-2">
                <i className="bi bi-graph-up me-1"></i> Niveau: {me.level}
              </span>
              <span className="thm-bg-light thm-shadow-m px-1 me-1 rounded-2">
                <i className="bi bi-hourglass-split me-1"></i> Jours Restants:{" "}
                {me.daysRemaining}
              </span>
              <div className="mt-2">
                <span className="thm-bg-light thm-shadow-m px-1 me-1 rounded-2">
                  <i className="bi bi-star me-1"></i> Points d'évaluation:{" "}
                  {me.evaluationPoints ?? 0}
                </span>
              </div>
            </>
          )}
        </p>
        <div className="mt-auto d-flex flex-wrap">
          {me.role === "apprenant" && (
            <button
              className="btn thm-shadow-m thm-bg-light mt-2 me-2"
              onClick={onShowCreateSlotModal}
            >
              <i className="bi bi-plus-circle me-1"></i> Créer un slot de
              disponibilité
            </button>
          )}
          {(me.role === "staff" || me.role === "admin") && (
            <button
              className="btn thm-shadow-m thm-bg-light mt-2"
              onClick={onShowAddUserModal}
            >
              <i className="bi bi-person-plus me-1"></i> Ajouter un Utilisateur
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSummaryCard;
