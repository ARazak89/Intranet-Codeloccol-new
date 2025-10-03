import ActivityLogger from '../utils/activityLogger.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

/**
 * Récupère les activités d'un utilisateur
 */
export async function getUserActivities(req, res) {
  try {
    const userId = req.user._id;
    const {
      limit = 50,
      skip = 0,
      action = null,
      projectId = null,
      startDate = null,
      endDate = null
    } = req.query;

    const activities = await ActivityLogger.getUserActivities(userId, {
      limit: parseInt(limit),
      skip: parseInt(skip),
      action,
      projectId,
      startDate,
      endDate
    });

    res.json({
      success: true,
      data: activities,
      pagination: {
        limit: parseInt(limit),
        skip: parseInt(skip),
        total: activities.length
      }
    });
  } catch (error) {
    console.error('[getUserActivities] Erreur:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors de la récupération des activités' 
    });
  }
}

/**
 * Récupère les activités d'un utilisateur spécifique (admin/staff seulement)
 */
export async function getUserActivitiesById(req, res) {
  try {
    const { userId } = req.params;
    const {
      limit = 50,
      skip = 0,
      action = null,
      projectId = null,
      startDate = null,
      endDate = null
    } = req.query;

    const activities = await ActivityLogger.getUserActivities(userId, {
      limit: parseInt(limit),
      skip: parseInt(skip),
      action,
      projectId,
      startDate,
      endDate
    });

    res.json({
      success: true,
      data: activities,
      pagination: {
        limit: parseInt(limit),
        skip: parseInt(skip),
        total: activities.length
      }
    });
  } catch (error) {
    console.error('[getUserActivitiesById] Erreur:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors de la récupération des activités' 
    });
  }
}

/**
 * Récupère les statistiques d'activité d'un utilisateur
 */
export async function getUserActivityStats(req, res) {
  try {
    const userId = req.user._id;
    const { startDate = null, endDate = null } = req.query;

    const stats = await ActivityLogger.getUserActivityStats(userId, startDate, endDate);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[getUserActivityStats] Erreur:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors de la récupération des statistiques' 
    });
  }
}

/**
 * Récupère les statistiques d'activité d'un utilisateur spécifique (admin/staff seulement)
 */
export async function getUserActivityStatsById(req, res) {
  try {
    const { userId } = req.params;
    const { startDate = null, endDate = null } = req.query;

    const stats = await ActivityLogger.getUserActivityStats(userId, startDate, endDate);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[getUserActivityStatsById] Erreur:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors de la récupération des statistiques' 
    });
  }
}

/**
 * Récupère toutes les activités (admin seulement)
 */
export async function getAllActivities(req, res) {
  try {
    const {
      limit = 100,
      skip = 0,
      action = null,
      userId = null,
      projectId = null,
      startDate = null,
      endDate = null
    } = req.query;

    const query = {};
    if (action) query.action = action;
    if (userId) query.user = userId;
    if (projectId) query['metadata.projectId'] = projectId;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const ActivityLog = (await import('../models/ActivityLog.js')).default;
    
    const activities = await ActivityLog.find(query)
      .populate('user', 'name email role')
      .populate('metadata.projectId', 'title')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await ActivityLog.countDocuments(query);

    res.json({
      success: true,
      data: activities,
      pagination: {
        limit: parseInt(limit),
        skip: parseInt(skip),
        total
      }
    });
  } catch (error) {
    console.error('[getAllActivities] Erreur:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors de la récupération des activités' 
    });
  }
}
