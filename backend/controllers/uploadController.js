import multer from 'multer';
import path from 'path';
import fs from 'fs';
import asyncHandler from 'express-async-handler';

// Définir le répertoire de destination pour les uploads
const uploadDir = './public/challengeImg'; // Changement ici: relatif à la racine du backend

// Assurez-vous que le répertoire existe
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Renommer le fichier pour éviter les doublons et conserver l'extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accepter seulement les images
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Seules les images sont autorisées !'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 5 } // Limite de taille de fichier à 5MB
});

// @desc    Upload challenge images
// @route   POST /api/upload/challenge-image
// @access  Private/Admin/Staff
const uploadChallengeImages = asyncHandler(async (req, res) => {
  // Multer gère déjà l'upload des fichiers dans req.files
  if (req.files && req.files.length > 0) {
    const imageUrls = req.files.map(file => `/challengeImg/${file.filename}`);
    res.status(200).json({ message: 'Images uploaded successfully', imageUrls });
  } else {
    res.status(400).json({ message: 'No image files uploaded' });
  }
});

export { upload, uploadChallengeImages };
