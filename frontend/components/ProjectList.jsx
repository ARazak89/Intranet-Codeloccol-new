import React from "react";

const ProjectList = ({ projects }) => {
  if (!projects || projects.length === 0) {
    return (
      <div className="thm-shadow-s mb-4">
        <h2 className="h5 mb-0">Mes Projets</h2>
        <hr />
        <p>Aucun projet en cours.</p>
      </div>
    );
  }

  return (
    <div className="thm-shadow-s mb-4">
      <h2 className="h5 mb-0">Mes Projets</h2>
      <hr />
      <ul className="list-group list-group-flush">
        {projects.map((project) => (
          <li key={project._id} className="list-group-item">
            <div className="d-flex w-100 justify-content-between">
              <h5 className="mb-1">{project.title}</h5>
              <small
                className={`badge ${
                  project.status === "approved"
                    ? "bg-success"
                    : project.status === "pending"
                    ? "bg-warning text-dark"
                    : "bg-secondary"
                }`}
              >
                {project.status}
              </small>
            </div>
            <p className="mb-1">{project.description}</p>
            {/* Ajoutez d'autres détails du projet ici */}
            {project.repoUrl && (
              <small className="text-muted">
                Repo:{" "}
                <a
                  href={project.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {project.repoUrl}
                </a>
              </small>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ProjectList;
