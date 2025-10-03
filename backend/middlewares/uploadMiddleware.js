import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import User from '../models/User.js';
import fs from "fs";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration du stockage de Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../public/uploads/profile_pictures"));
  },
  filename: async (req, file, cb) => {
    try {
      const userId = req.user._id;
      const user = await User.findById(userId);

      // Vérifier si l'utilisateur a déjà une photo de profil
      if (user && user.profilePicture) {
        const oldPath = path.join(
          __dirname,
          "../public/uploads/profile_pictures",
          path.basename(user.profilePicture), // on récupère juste le nom du fichier
        );

        // Vérifie si le fichier existe et le supprime
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
          console.log(`Ancienne photo supprimée : ${oldPath}`);
        }
      }

      // Nouveau nom de fichier
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, userId + "-" + uniqueSuffix + path.extname(file.originalname));
    } catch (err) {
      cb(err);
    }
  },
});

// Filtre pour n'accepter que les images
const fileFilter = async (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    const userId = req.user._id;
    const user = await User.findById(userId);
    await cb(null, true);
    console.log('storage',storage.getFilename);
  } else {
    await cb(new Error("Seules les images sont autorisées !"), false);
  }
};

// Initialisation de Multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 10 }, // Limite de taille de fichier à 10MB
});

export default upload;
