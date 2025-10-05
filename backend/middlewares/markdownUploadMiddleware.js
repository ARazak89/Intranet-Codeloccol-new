import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Obtenez __filename et __dirname pour le contexte ES module.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configuration du stockage pour les fichiers Markdown des projets en utilisant Multer.
 * Les fichiers sont stockés dans `backend/public/uploads/project_markdowns`.
 */
const markdownStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../public/uploads/project_markdowns");
    // Crée le répertoire de destination s'il n'existe pas.
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Génère un nom de fichier unique pour éviter les conflits.
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

/**
 * Filtre les fichiers uploadés pour s'assurer qu'ils sont de type Markdown (.md).
 * @param {object} req - L'objet requête Express.
 * @param {object} file - L'objet fichier de Multer.
 * @param {function} cb - La fonction de callback de Multer.
 */
const markdownFileFilter = (req, file, cb) => {
  if (file.mimetype === "text/markdown" || path.extname(file.originalname).toLowerCase() === ".md") {
    cb(null, true);
  } else {
    cb(new Error("Seuls les fichiers Markdown (.md) sont autorisés !"), false);
  }
};

/**
 * Middleware Multer configuré pour l'upload de fichiers Markdown.
 * Limite la taille du fichier à 5MB et utilise le filtre et le stockage définis ci-dessus.
 */
const uploadMarkdown = multer({
  storage: markdownStorage,
  fileFilter: markdownFileFilter,
  limits: { fileSize: 1024 * 1024 * 5 }, // Limite la taille du fichier à 5MB.
});

export default uploadMarkdown;
