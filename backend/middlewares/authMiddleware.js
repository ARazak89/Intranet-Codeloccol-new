import jwt from "jsonwebtoken";
import User from "../models/User.js";
import ActivityLogger from "../utils/activityLogger.js";

export const requireAuth = async (req, res, next) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select('firstName lastName name email role status daysRemaining level evaluationPoints totalProjectsCompleted lastLogin profilePicture gender dateOfBirth nationality phoneNumber address emergencyContact'); // Sélectionner explicitement tous les champs nécessaires
    if (!user) return res.status(401).json({ error: "User not found" });
    if (user.status === "blocked")
      return res.status(403).json({ error: "Account is blocked" });
    
    req.user = user;
    console.log(`[AUTH] User ${user.email} (ID: ${user._id}) with role '${user.role}' authenticated successfully.`);
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

export const requireRole =
  (roles) =>
  (req, res, next) => {
    const rolesArray = Array.isArray(roles) ? roles : [roles].filter(Boolean);
    console.log(`[ROLE] Checking roles for user ${req.user?.email || 'N/A'}. Required roles: ${rolesArray.join(', ')}, User role: ${req.user?.role}`);
    if (!rolesArray.includes(req.user?.role))
      return res.status(403).json({ error: "Forbidden" });
    next();
  };

/**
 * Middleware pour logger les déconnexions
 */
export const logLogout = async (req, res, next) => {
  if (req.user) {
    await ActivityLogger.logLogout(req.user._id, req);
  }
  next();
};
