import ActivityLog from '../models/ActivityLog.js';

/**
 * Service centralisé pour enregistrer les activités utilisateur
 */
class ActivityLogger {
  
  /**
   * Enregistre une activité utilisateur
   * @param {Object} params - Paramètres de l'activité
   * @param {string} params.userId - ID de l'utilisateur
   * @param {string} params.action - Type d'action
   * @param {string} params.description - Description de l'action
   * @param {Object} params.metadata - Métadonnées contextuelles
   * @param {Object} params.req - Objet request (optionnel, pour IP et User-Agent)
   */
  static async logActivity({ userId, action, description, metadata = {}, req = null }) {
    try {
      const logData = {
        user: userId,
        action,
        description,
        metadata: {
          ...metadata,
          ...(req && {
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent')
          })
        }
      };

      const activityLog = new ActivityLog(logData);
      await activityLog.save();
      
      console.log(`[ActivityLog] ${action} - User: ${userId} - ${description}`);
      return activityLog;
    } catch (error) {
      console.error('[ActivityLogger] Erreur lors de l\'enregistrement:', error);
      // Ne pas faire échouer l'opération principale si le logging échoue
    }
  }

  /**
   * Log de connexion utilisateur
   */
  static async logLogin(userId, req = null) {
    return this.logActivity({
      userId,
      action: 'login',
      description: 'Connexion utilisateur',
      req
    });
  }

  /**
   * Log de déconnexion utilisateur
   */
  static async logLogout(userId, req = null) {
    return this.logActivity({
      userId,
      action: 'logout',
      description: 'Déconnexion utilisateur',
      req
    });
  }

  /**
   * Log de soumission d'évaluation
   */
  static async logEvaluationSubmitted(userId, evaluationId, projectId, assignmentId, score, req = null) {
    return this.logActivity({
      userId,
      action: 'evaluation_submitted',
      description: `Soumission d'évaluation avec score: ${score}`,
      metadata: {
        evaluationId,
        projectId,
        assignmentId,
        score
      },
      req
    });
  }

  /**
   * Log d'acceptation d'évaluation
   */
  static async logEvaluationAccepted(userId, evaluationId, projectId, req = null) {
    return this.logActivity({
      userId,
      action: 'evaluation_accepted',
      description: 'Évaluation acceptée',
      metadata: {
        evaluationId,
        projectId
      },
      req
    });
  }

  /**
   * Log de rejet d'évaluation
   */
  static async logEvaluationRejected(userId, evaluationId, projectId, req = null) {
    return this.logActivity({
      userId,
      action: 'evaluation_rejected',
      description: 'Évaluation rejetée',
      metadata: {
        evaluationId,
        projectId
      },
      req
    });
  }

  /**
   * Log d'assignation de projet
   */
  static async logProjectAssigned(userId, projectId, assignmentId, req = null) {
    return this.logActivity({
      userId,
      action: 'project_assigned',
      description: 'Projet assigné',
      metadata: {
        projectId,
        assignmentId
      },
      req
    });
  }

  /**
   * Log de soumission de projet
   */
  static async logProjectSubmitted(userId, projectId, assignmentId, repoUrl, req = null) {
    return this.logActivity({
      userId,
      action: 'project_submitted',
      description: `Projet soumis - Repo: ${repoUrl}`,
      metadata: {
        projectId,
        assignmentId,
        repoUrl
      },
      req
    });
  }

  /**
   * Log de temps passé sur un projet
   */
  static async logTimeSpentOnProject(userId, projectId, assignmentId, durationMinutes, req = null) {
    return this.logActivity({
      userId,
      action: 'time_spent_on_project',
      description: `Temps passé sur le projet: ${durationMinutes} minutes`,
      metadata: {
        projectId,
        assignmentId,
        duration: durationMinutes
      },
      req
    });
  }

  /**
   * Log de mise à jour de profil
   */
  static async logProfileUpdated(userId, changes, req = null) {
    return this.logActivity({
      userId,
      action: 'profile_updated',
      description: 'Profil mis à jour',
      metadata: {
        changes: JSON.stringify(changes)
      },
      req
    });
  }

  /**
   * Récupère les activités d'un utilisateur
   */
  static async getUserActivities(userId, options = {}) {
    const {
      limit = 50,
      skip = 0,
      action = null,
      projectId = null,
      startDate = null,
      endDate = null
    } = options;

    const query = { user: userId };

    if (action) query.action = action;
    if (projectId) query['metadata.projectId'] = projectId;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    return ActivityLog.find(query)
      .populate('user', 'name email role')
      .populate('metadata.projectId', 'title')
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip);
  }

  /**
   * Récupère les statistiques d'activité d'un utilisateur
   */
  static async getUserActivityStats(userId, startDate = null, endDate = null) {
    const matchQuery = { user: userId };
    if (startDate || endDate) {
      matchQuery.timestamp = {};
      if (startDate) matchQuery.timestamp.$gte = new Date(startDate);
      if (endDate) matchQuery.timestamp.$lte = new Date(endDate);
    }

    const stats = await ActivityLog.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
          lastActivity: { $max: '$timestamp' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    return stats;
  }

  /**
   * Log de création de slot de disponibilité
   */
  static async logSlotCreated(userId, slotId, req = null) {
    return this.logActivity({
      userId,
      action: 'slot_created',
      description: 'Créneau de disponibilité créé',
      metadata: { slotId },
      req
    });
  }

  /**
   * Log de réservation de slot de disponibilité
   */
  static async logSlotReserved(userId, slotId, projectId = null, req = null) {
    return this.logActivity({
      userId,
      action: 'slot_reserved',
      description: 'Créneau de disponibilité réservé',
      metadata: { slotId, projectId },
      req
    });
  }
}

export default ActivityLogger;
