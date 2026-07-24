import User from '../models/User.js';
import Project from '../models/Project.js';
import Hackathon from '../models/Hackathon.js';
import Evaluation from '../models/Evaluation.js';
import Notification from '../models/Notification.js';
import bcrypt from 'bcryptjs'; // Importez bcryptjs pour le hachage des mots de passe
import { levelToModuleMap } from './projectController.js'; // Importez levelToModuleMap
import mongoose from 'mongoose'; // Importez mongoose pour la gestion des sessions de transaction
import {
  applyPendingDayDecrements,
  getStartOfTodayInLagos,
} from '../utils/daysRemainingService.js';

export async function me(req, res) {
  let u = req.user;
  if (!u) {
    return res.status(401).json({ error: "User not authenticated." });
  }

  // Appliquer les jours écoulés même si le cron de minuit a raté (API endormie / redémarrée)
  u = await applyPendingDayDecrements(u);
  req.user = u;

  if (u.status === "blocked") {
    return res.status(403).json({
      error:
        "Votre compte a été bloqué car vous n'avez plus de jours restants. Veuillez contacter le personnel.",
    });
  }

  // Récupérer les projets de l'utilisateur
  let projects = await Project.find({ "assignments.student": u._id });

  // Si l'utilisateur est un apprenant et n'a pas de projets assignés, lui assigner le premier projet
  if (u.role === 'apprenant' && (!projects || projects.length === 0)) {
    console.log(`Apprenant ${u.name} (ID: ${u._id}) n'a pas de projets. Tentative d'assignation du premier projet.`);
    const assignmentResult = await _assignProjectByLevel(u._id, 1);

    if (assignmentResult.error) {
      console.error(`Erreur lors de l'assignation du premier projet à ${u.name}:`, assignmentResult.error);
      // Ne pas renvoyer une erreur 500 au frontend, juste loguer et continuer
    } else if (assignmentResult.project) {
      console.log(`Premier projet (ordre 1) assigné à ${u.name}.`);
      // Re-récupérer les projets après assignation pour les inclure dans la réponse
      projects = await Project.find({ "assignments.student": u._id });
      // Envoyer une notification à l'apprenant
      await Notification.create({
        user: u._id,
        type: "project_assigned",
        message: `Félicitations ! Le projet \'${assignmentResult.project.title}\' vous a été assigné pour commencer.`, // Adapter le message
      });
    }
  }

  // Récupérer les hackathons de l'utilisateur
  const hackathons = await Hackathon.find({ participants: u._id });

  // Récupérer les badges de l'utilisateur
  const userWithBadges = await User.findById(u._id).populate('badges');
  const badges = userWithBadges ? userWithBadges.badges : [];

  // Trouver le projet le plus avancé qui est actuellement "actif" (assigné, soumis, en attente de révision)
  let mostAdvancedActiveProject = null;
  if (projects && projects.length > 0) {
    const activeProjects = projects.filter(p =>
      p.assignments.some(a =>
        a.student.equals(u._id) &&
        // Inclure tous les statuts pertinents pour la progression, y compris 'approved'
        ['assigned', 'submitted', 'awaiting_staff_review', 'approved'].includes(a.status)
      )
    );

    if (activeProjects.length > 0) {
      mostAdvancedActiveProject = activeProjects.reduce((latest, current) => {
        if (current.order > latest.order) {
          return current;
        } else if (current.order === latest.order) {
          // Si les ordres sont égaux, préférer celui avec une date de soumission plus récente
          const latestAssignment = latest.assignments.find(a => a.student.equals(u._id));
          const currentAssignment = current.assignments.find(a => a.student.equals(u._id));
          if (latestAssignment && currentAssignment && currentAssignment.submissionDate > latestAssignment.submissionDate) {
            return current;
          }
        }
        return latest;
      }, activeProjects[0]);
    }
  }

  let currentModule;
  if (mostAdvancedActiveProject) {
    currentModule = mostAdvancedActiveProject.module;
  } else {
    // Si aucun projet actif n'est trouvé, utiliser le module correspondant au niveau actuel de l'apprenant.
    // Cela signifie qu'il a terminé le module précédent et est passé au suivant.
    currentModule = levelToModuleMap[u.level] || "Module Inconnu";
  }

  let totalProjectsForModule = 0;
  let currentModuleProjectsCompleted = 0;

  if (currentModule) {
    totalProjectsForModule = await Project.countDocuments({
      module: currentModule,
      status: { $ne: "archived" },
    });

    const approvedProjectsInModule = await Project.aggregate([
      { $match: { module: currentModule } },
      { $project: {
          title: 1,
          assignments: {
            $filter: {
              input: "$assignments",
              as: "assignment",
              cond: {
                $and: [
                  { $eq: ["$$assignment.student", u._id] },
                  { $eq: ["$$assignment.status", "approved"] }
                ]
              }
            }
          }
        }
      },
      { $match: { "assignments.0": { $exists: true } } } // Ne garder que les projets qui ont au moins une affectation approuvée pour l'étudiant
    ]);

    currentModuleProjectsCompleted = approvedProjectsInModule.length;

    console.log(`Approved Projects Details for ${u.name} in ${currentModule}:`);
    approvedProjectsInModule.forEach(p => {
      console.log(`- Project Title: ${p.title}, Approved Assignments for this Project: ${JSON.stringify(p.assignments)}`);
    });
  }

  console.log(`--- Dashboard Progress Logs for ${u.name} ---`);
  console.log(`Current Assigned Project: ${mostAdvancedActiveProject ? mostAdvancedActiveProject.title : 'N/A'}`);
  console.log(`Module of Current Assigned Project: ${mostAdvancedActiveProject ? mostAdvancedActiveProject.module : 'N/A'}`);
  console.log(`Determined Current Module for Progress: ${currentModule}`);
  console.log(`Total Projects for this Module: ${totalProjectsForModule}`);
  console.log(`Approved Projects in this Module: ${currentModuleProjectsCompleted}`);
  console.log(`------------------------------------------`);

  const completedProjectsOverall = u.totalProjectsCompleted || 0;
  const totalAllProjects = await Project.countDocuments({ status: { $ne: "archived" } });

  res.json({
    id: u._id,
    name: u.name,
    firstName: u.firstName,
    email: u.email,
    role: u.role,
    status: u.status,
    daysRemaining: u.daysRemaining,
    level: u.level,
    evaluationPoints: u.evaluationPoints,
    totalProjectsCompleted: completedProjectsOverall,
    lastLogin: u.lastLogin,
    currentModule: currentModule, // Utilise le module dérivé dynamiquement
    totalAllProjects: totalAllProjects, // AJOUTER : Total général des projets
    projects,
    profilePicture: u.profilePicture,
    hackathons,
    badges,
    // Informations personnelles
    gender: u.gender,
    dateOfBirth: u.dateOfBirth,
    nationality: u.nationality,
    phoneNumber: u.phoneNumber,
    address: u.address,
    emergencyContact: u.emergencyContact,
    progress: {
      currentProject: currentModuleProjectsCompleted, // Utilise la progression du module actuel calculée
      totalProjectsInModule: totalProjectsForModule, // Pour le tableau de bord (progression par module)
      totalProjectsOverall: totalAllProjects, // Pour la page de profil (progression globale)
    },
  });  
}

export async function unblock(req, res) {
  try {
    const { id } = req.params;
    const u = await User.findByIdAndUpdate(
      id,
      { status: 'active' },
      { new: true },
    );
    res.json({ id: u._id, status: u.status });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function updateUserNameAndEmail(req, res) {
  try {
    // Cette fonction est désormais réservée aux administrateurs pour modifier le nom et l'email d'un utilisateur.
    // L'utilisateur régulier ne peut pas modifier son propre nom ou email via cet endpoint.
    if (req.user.role !== 'staff' && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Non autorisé à modifier le nom ou l\'email de l\'utilisateur.',
      });
    }

    const { id } = req.params; // L'ID de l'utilisateur à modifier, passé dans l'URL pour le staff/admin
    const { name, email } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { name, email },
      { new: true, runValidators: true },
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    res.json({
      message: 'Profil mis à jour avec succès.',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function updateUserPassword(req, res) {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // Vérifier l'ancien mot de passe
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: 'Ancien mot de passe incorrect.' });
    }

    // Hacher le nouveau mot de passe
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ message: 'Mot de passe mis à jour avec succès.' });
  } catch (e) {
    console.error("Error updating password:", e);
    res.status(500).json({ error: e.message });
  }
}

export async function updateOwnPersonalInfo(req, res) {
  try {
    // Cette fonction permet à un utilisateur de mettre à jour ses informations personnelles
    const userId = req.user._id;
    const { 
      name, 
      firstName, 
      email, 
      gender, 
      dateOfBirth, 
      nationality, 
      phoneNumber,
      address,
      emergencyContact
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Le nom et l\'email sont requis.' });
    }

    // Vérifier si l'email existe déjà pour un autre utilisateur
    const existingUser = await User.findOne({ email, _id: { $ne: userId } });
    if (existingUser) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé par un autre utilisateur.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // Mettre à jour les champs de base
    user.name = name;
    if (firstName !== undefined) user.firstName = firstName;
    user.email = email;

    // Mettre à jour les informations personnelles
    if (gender !== undefined) user.gender = gender;
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;
    if (nationality !== undefined) user.nationality = nationality;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    
    // Mettre à jour l'adresse
    if (address !== undefined) {
      user.address = user.address || {};
      if (address.street !== undefined) user.address.street = address.street;
      if (address.city !== undefined) user.address.city = address.city;
      if (address.country !== undefined) user.address.country = address.country;
    }

    // Mettre à jour le contact d'urgence
    if (emergencyContact !== undefined) {
      user.emergencyContact = user.emergencyContact || {};
      if (emergencyContact.name !== undefined) user.emergencyContact.name = emergencyContact.name;
      if (emergencyContact.relationship !== undefined) user.emergencyContact.relationship = emergencyContact.relationship;
      if (emergencyContact.phone !== undefined) user.emergencyContact.phone = emergencyContact.phone;
      if (emergencyContact.address !== undefined) user.emergencyContact.address = emergencyContact.address;
    }

    await user.save();

    res.status(200).json({
      message: 'Informations personnelles mises à jour avec succès.',
      name: user.name,
      firstName: user.firstName,
      email: user.email,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      nationality: user.nationality,
      phoneNumber: user.phoneNumber,
      address: user.address,
      emergencyContact: user.emergencyContact,
    });
  } catch (e) {
    console.error("Error updating personal info:", e);
    res.status(500).json({ error: e.message });
  }
}

export async function updateUserProfilePicture(req, res) {
  try {
    console.log('updateUserProfilePicture called');
    console.log('req.body:', req.body);
    console.log('req.file:', req.file);
    
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    let profilePictureUrl;

    // Si une image prédéfinie est envoyée (via JSON)
    if (req.body.profilePicture) {
      profilePictureUrl = req.body.profilePicture;
      console.log('Avatar prédéfini sélectionné:', profilePictureUrl);
    }
    // Si un fichier est uploadé
    else if (req.file) {
      profilePictureUrl = `/uploads/profile_pictures/${req.file.filename}`;
      console.log('Fichier uploadé:', profilePictureUrl);
    }
    // Aucune image fournie
    else {
      console.log('Aucune image fournie');
      return res
        .status(400)
        .json({ message: 'Aucune image n\'a été fournie.', error: 'Aucune image n\'a été fournie.' });
    }

    user.profilePicture = profilePictureUrl;
    await user.save();
    
    console.log('Photo de profil mise à jour avec succès:', user.profilePicture);

    res.status(200).json({
      message: 'Photo de profil mise à jour avec succès.',
      profilePicture: user.profilePicture,
    });
  } catch (e) {
    console.error("Error updating profile picture:", e);
    res.status(500).json({ error: e.message });
  }
}

export async function listUsers(req, res) {
  try {
    let query = {};

    // Si l'utilisateur connecté est un staff, ne pas afficher les admins
    if (req.user.role === 'staff') {
      query = { role: { $in: ['apprenant', 'staff'] } };
    }
    // Si l'utilisateur connecté est un admin, il voit tous les rôles (query reste {}) ou spécifier explicitement si d'autres rôles sont ajoutés.
    // Note: Pour l'instant, le comportement par défaut est de tout afficher si aucun filtre n'est appliqué.

    const users = await User.find(query)
      .select('-password') // Exclure uniquement les mots de passe
      .populate({
        path: 'projects', // Peupler le tableau de projets maîtres
        populate: {
          path: 'assignments',
          match: { student: { $exists: true } }, // Match any assignment that has a student (we will filter by specific student in next step)
          select: 'student status title order repoUrl submissionDate',
        }
      });

    // Nous devons filtrer et extraire l'assignation pertinente pour chaque utilisateur manuellement
    const usersWithAssignedProject = users.map((user) => {
      let currentProject = null;
      // Définir les statuts considérés comme 'actuels'
      const activeStatuses = ['assigned', 'submitted', 'awaiting_staff_review'];

      if (user.projects && user.projects.length > 0) {
        for (const project of user.projects) {
          const assignment = project.assignments.find(
            (assign) => assign.student && assign.student.equals(user._id)
          );

          if (assignment && activeStatuses.includes(assignment.status)) {
            // C'est un projet actif pour cet étudiant
            if (
              !currentProject ||
              (project.order > currentProject.order) ||
              (project.order === currentProject.order && assignment.submissionDate > currentProject.submissionDate)
            ) {
              currentProject = {
                title: project.title,
                order: project.order,
                id: project._id,
                assignmentId: assignment._id,
                status: assignment.status,
                repoUrl: assignment.repoUrl,
                submissionDate: assignment.submissionDate,
              };
            }
          }
        }
      }

      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        level: user.level,
        status: user.status,
        daysRemaining: user.daysRemaining,
        assignedProject: currentProject, // Le projet assigné le plus récent
      };
    });

    res.status(200).json(usersWithAssignedProject);
  } catch (e) {
    console.error("Error in listUsers:", e);
    res.status(500).json({ error: e.message });
  }
}

export async function getUserById(req, res) {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-password');
    if (!user)
      return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    res.status(200).json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function updateUserRole(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Seuls les administrateurs peuvent changer le rôle d'un utilisateur
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorisé à changer le rôle de l\'utilisateur.' });
    }

    if (!['apprenant', 'staff', 'admin', 'evaluator'].includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide.' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true },
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    }

    res
      .status(200)
      .json({ message: 'Rôle utilisateur mis à jour avec succès.', user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    }

    // Supprimer les projets, évaluations, notifications associés à l'utilisateur
    await Project.deleteMany({ student: id });
    await Evaluation.deleteMany({ evaluator: id });
    await Notification.deleteMany({ user: id });

    // Retirer l'utilisateur des listes de participants des hackathons
    await Hackathon.updateMany(
      { participants: id },
      { $pull: { participants: id } },
    );

    res.status(200).json({
      message: 'Utilisateur et données associées supprimés avec succès.',
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function getEvaluators(req, res) {
  console.log('getEvaluators function called.'); // Log de début de fonction
  try {
    if (req.user.role !== 'staff' && req.user.role !== 'admin') {
      console.log('Access denied for user role:', req.user.role);
      return res.status(403).json({ error: 'Non autorisé à consulter la liste des évaluateurs.' });
    }

    console.log('Fetching active evaluators...'); // Log avant la requête DB
    const evaluators = await User.find({
      role: { $in: ['evaluator', 'staff', 'admin'] },
      status: 'active', // Inclure seulement les évaluateurs actifs
    }).select('_id name email'); // Sélectionner les champs nécessaires

    console.log('Found evaluators:', evaluators.length);
    res.status(200).json(evaluators);
  } catch (e) {
    console.error("Error fetching evaluators:", e);
    res.status(500).json({ error: e.message });
  }
}

export async function createUser(req, res) {
  try {
    const { name, email, password, role } = req.body;

    // Validation simple
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Tous les champs sont obligatoires.' });
    }

    if (!['apprenant', 'staff', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide.' });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Un utilisateur avec cet email existe déjà.' });
    }

    // Hacher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Créer le nouvel utilisateur
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
      status: 'active', // Les utilisateurs créés par admin sont actifs par défaut
      level: role === 'apprenant' ? 1 : undefined, // Niveau 1 pour les apprenants par défaut
      daysRemaining: role === 'apprenant' ? 30 : undefined, // 30 jours pour les apprenants par défaut
      lastDaysDecrementAt: role === 'apprenant' ? getStartOfTodayInLagos() : undefined,
    });

    await newUser.save();

    // Si l'utilisateur est un apprenant, lui assigner automatiquement le projet d'ordre 1
    let projectAssignment = { assigned: false, message: null };
    if (newUser.role === "apprenant") {
      const firstProjectTemplate = await Project.findOne({
        order: 1,
        status: "template",
      });

      if (firstProjectTemplate) {
        // Ajouter l'apprenant au tableau d'assignations du projet maître
        firstProjectTemplate.assignments.push({
          student: newUser._id,
          status: "assigned",
          repoUrl: "",
          evaluations: [],
          peerEvaluators: [],
          staffValidator: null,
        });
        await firstProjectTemplate.save();

        // Ajouter une référence au projet maître dans les projets du nouvel utilisateur
        newUser.projects.push(firstProjectTemplate._id);
        await newUser.save();

        projectAssignment = {
          assigned: true,
          projectId: firstProjectTemplate._id,
          message: `Projet d'ordre 1 assigné à l'apprenant.`,
        };
      } else {
        projectAssignment = {
          assigned: false,
          message: `Aucun projet d'ordre 1 (status "template") disponible. Aucun projet assigné à cet apprenant.`,
        };
      }
    }

    res.status(201).json({
      message: 'Utilisateur créé avec succès.',
      user: { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role },
      projectAssignment,
    });
  } catch (e) {
    console.error("Error creating user by admin:", e);
    res.status(500).json({ error: e.message });
  }
}

export async function updateUser(req, res) {
  try {
    const { id } = req.params; // ID de l'utilisateur à modifier
    const { name, email, password, role, status, level, daysRemaining } = req.body;

    // Vérifier l'autorisation (seuls staff/admin peuvent modifier les utilisateurs)
    if (req.user.role !== 'staff' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorisé à modifier les utilisateurs.' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // Mettre à jour les champs si fournis
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) {
      if (!['apprenant', 'staff', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Rôle invalide.' });
      }
      user.role = role;
    }
    if (status) {
      if (!['active', 'inactive', 'blocked'].includes(status)) {
        return res.status(400).json({ error: 'Statut invalide.' });
      }
      user.status = status;
    }
    if (level !== undefined) {
      user.level = level;
    }
    if (daysRemaining !== undefined) {
      user.daysRemaining = daysRemaining;
      // Reprendre le compteur journalier à partir d'aujourd'hui (évite un double débit immédiat)
      user.lastDaysDecrementAt = getStartOfTodayInLagos();
    }

    // Hacher le nouveau mot de passe si fourni
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();

    res.status(200).json({ message: 'Utilisateur mis à jour avec succès.', user: { _id: user._id, name: user.name, email: user.email, role: user.role, status: user.status, level: user.level } });
  } catch (e) {
    console.error("Error updating user:", e);
    res.status(500).json({ error: e.message });
  }
}

export async function toggleUserStatus(req, res) {
  try {
    const { id } = req.params; // ID de l'utilisateur à modifier
    const { status } = req.body; // Le nouveau statut (active, inactive, blocked)

    // Vérifier l'autorisation (seuls staff/admin peuvent modifier le statut)
    if (req.user.role !== 'staff' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorisé à modifier le statut des utilisateurs.' });
    }

    if (!['active', 'inactive', 'blocked'].includes(status)) {
      return res.status(400).json({ error: 'Statut invalide. Les statuts valides sont active, inactive, blocked.' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).select('-password'); // Exclure le mot de passe du résultat

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    res.status(200).json({ message: `Statut de l'utilisateur mis à jour à \'${status}\' avec succès.`, user: { _id: user._id, name: user.name, status: user.status } });
  } catch (e) {
    console.error("Error toggling user status:", e);
    res.status(500).json({ error: e.message });
  }
}

// Fonction utilitaire pour l'assignation du premier projet lors de la création d'un nouvel apprenant
// (Assurez-vous que cette fonction existe ou ajoutez-la si nécessaire)
async function _assignProjectByLevel(studentId, levelOrder) {
  const session = await mongoose.startSession();
  try {
    await session.startTransaction();

    const student = await User.findById(studentId).session(session);
    if (!student) {
      return { error: "Apprenant non trouvé." };
    }

    const nextModule = levelToModuleMap[levelOrder];
    if (!nextModule) {
      return { error: `Aucun module défini pour le niveau ${levelOrder}.` };
    }

    const firstProject = await Project.findOne({
      module: nextModule,
      order: 1, // Assigner toujours le premier projet du module pour le démarrage
      status: "template",
    }).session(session);

    if (!firstProject) {
      return { error: `Aucun projet template d'ordre 1 trouvé pour le module ${nextModule}.` };
    }

    const existingAssignment = firstProject.assignments.some(
      (assign) => assign.student.equals(studentId)
    );
    if (existingAssignment) {
      await session.abortTransaction();
      return { error: `L'apprenant est déjà assigné au projet ${firstProject.title}.` };
    }

    firstProject.assignments.push({
      student: studentId,
      status: "assigned",
      repoUrl: "",
      evaluations: [],
      peerEvaluators: [],
      staffValidator: null,
    });
    await firstProject.save({ session });

    if (!student.projects.includes(firstProject._id)) {
      student.projects.push(firstProject._id);
      await student.save({ session });
    }

    await session.commitTransaction();
    return { success: true, project: firstProject };
  } catch (error) {
    await session.abortTransaction();
    console.error(`Erreur lors de l'assignation du projet par niveau: ${error.message}`);
    return { error: `Erreur interne du serveur: ${error.message}` };
  } finally {
    await session.endSession();
  }
}
