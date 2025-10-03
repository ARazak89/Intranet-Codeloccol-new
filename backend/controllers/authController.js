import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
// import crypto from "crypto"; // Commenter si non utilisé
// import { sendMail } from "../utils/emailService.js"; // Commenter si non utilisé
import Project from "../models/Project.js"; // Importer le modèle Project
import ActivityLogger from "../utils/activityLogger.js";

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    console.log(`[AUTH] Tentative de connexion pour l'email: '${email}'`);
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`[AUTH] Utilisateur non trouvé pour l'email: '${email}' dans la base de données.`);
      return res.status(400).json({ error: "Email Invalide" });
    }
    console.log(`[AUTH] Utilisateur trouvé: '${user.email}', rôle: '${user.role}'`);
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      console.log(`[AUTH] Comparaison de mot de passe échouée pour l'email: '${email}'`);
      return res.status(400).json({ error: "Email correct, mais mot de passe invalide" });
    }
    if (user.status === "blocked") {
      console.log(`[AUTH] Compte bloqué pour l'email: '${email}'`);
      return res.status(403).json({
        error: "Votre compte est bloqué pour cause d'inactivité (plus de 4 jours sans connexion). Veuillez contacter le personnel pour le réactiver.",
      });
    }
    // Logger la connexion réussie
    await ActivityLogger.logLogin(user._id, req);
    
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    console.log(`[AUTH] Connexion réussie pour l'email: '${email}'`);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        daysRemaining: user.daysRemaining,
        level: user.level,
      },
    });
  } catch (e) {
    console.error(
      `Erreur lors de la connexion pour l'email: ${req.body.email || "N/A"}: ${e.message}`,
    );
    res.status(500).json({ error: e.message });
  }
}

export async function logout(req, res) {
  try {
    // Logger la déconnexion
    if (req.user) {
      // Mettre à jour lastLogin uniquement à la déconnexion
      req.user.lastLogin = new Date();
      await req.user.save();
      await ActivityLogger.logLogout(req.user._id, req);
    }
    
    res.json({ message: "Déconnexion réussie" });
  } catch (e) {
    console.error(`Erreur lors de la déconnexion: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
}
