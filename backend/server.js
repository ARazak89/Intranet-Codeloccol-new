import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import cron from 'node-cron';
import session from 'express-session'; // Import express-session
import passport from 'passport'; // Import passport

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import hackathonRoutes from './routes/hackathonRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js'; // Importez les routes des paramètres
import notificationRoutes from './routes/notificationRoutes.js'; // Importez les routes des notifications
import searchRoutes from './routes/searchRoutes.js'; // Importez les routes de recherche
import curriculumRoutes from './routes/curriculumRoutes.js'; // Importez les routes des parcours de formation
import resourceRoutes from './routes/resourceRoutes.js'; // Importez les routes des ressources pédagogiques
import evaluationRoutes from './routes/evaluationRoutes.js'; // Importez les routes des évaluations
import availabilityRoutes from './routes/availabilityRoutes.js'; // Importez les routes de disponibilité
import teamRoutes from "./routes/teamRoutes.js"; // Importez les routes des équipes
import ideProjectSubmissionRoutes from './routes/ideProjectSubmissionRoutes.js'; // Importer les nouvelles routes
import activityRoutes from './routes/activityRoutes.js'; // Importez les routes des activités
import eventRoutes from './routes/eventRoutes.js'; // Importez les routes des événements
import challengeRoutes from './routes/challengeRoutes.js'; // Importer les routes des challenges
import ideSubmissionReviewRoutes from './routes/ideSubmissionReviewRoutes.js'; // Importer les routes de revue des soumissions IDE
import uploadRoutes from './routes/uploadRoutes.js'; // Importez les routes d'upload

import { notFound, errorHandler } from './middlewares/errorMiddleware.js'; // Importer les middlewares d'erreur

import {
  autoBlockInactiveUsers,
  attachLastSeen,
} from './utils/activityService.js';
import startSlotCleaner from './cron/slotCleaner.js'; // Importez la tâche cron de nettoyage des slots
import startDayDecrementer from './cron/dayDecrementer.js'; // Importez la tâche cron de décrémentation des jours
import startEvaluationReminder from './cron/evaluationReminder.js'; // Importez la tâche cron de rappel d'évaluation
import startChallengeArchiver from './cron/challengeArchiver.js'; // Importez la nouvelle tâche cron
import passportConfig from './config/passport.js'; // Importer la configuration de Passport

// Initialiser Passport avec les stratégies
passportConfig(passport);

const app = express();

console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);

app.use(
  cors({
    origin: process.env.NODE_ENV === 'production' ? ['https://intranet-codeloccol-new.vercel.app', ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : [])] : ['http://localhost:3000', 'http://192.168.88.20:3000'],
    credentials: true,
  }),
);
app.use(express.json());
app.use(morgan('dev'));

// Servir les fichiers statiques (y compris les images de profil téléchargées)
app.use(express.static('public'));

// Configuration de la session
app.use(
  session({
    secret: process.env.JWT_SECRET, // Utiliser le même secret que pour JWT ou un nouveau
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' },
  }),
);

// Initialisation de Passport
app.use(passport.initialize());
app.use(passport.session());

// record last seen on each request (for authenticated users)
app.use(attachLastSeen);

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/projects', projectRoutes);
app.use('/hackathons', hackathonRoutes);
app.use('/settings', settingsRoutes); // Nouvelle route pour les paramètres globaux
app.use('/notifications', notificationRoutes); // Nouvelle route pour les notifications
app.use('/search', searchRoutes); // Nouvelle route pour la recherche avancée
app.use('/curriculums', curriculumRoutes); // Nouvelle route pour les parcours de formation
app.use('/resources', resourceRoutes); // Nouvelle route pour les ressources pédagogiques
app.use('/evaluations', evaluationRoutes); // Nouvelle route pour les évaluations
app.use('/availability', availabilityRoutes); // Nouvelle route pour les slots de disponibilité
app.use('/teams', teamRoutes); // Nouvelle route pour la gestion des équipes
app.use('/ide', ideProjectSubmissionRoutes); // Utiliser les nouvelles routes
app.use('/activities', activityRoutes); // Route pour la gestion des activités utilisateur
app.use('/events', eventRoutes); // Nouvelle route pour les événements du calendrier
app.use('/challenges', challengeRoutes); // Utiliser les routes des challenges
app.use('/ide-submissions', ideSubmissionReviewRoutes); // Utiliser les routes de revue des soumissions IDE
app.use('/upload', uploadRoutes); // Utiliser les routes d'upload

// Middlewares de gestion des erreurs
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
mongoose
  .connect(process.env.MONGODB_URI, {})
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, "0.0.0.0", () =>
      console.log(
        `API running on http://${process.env.SERVER_HOST || "localhost"}:${PORT}`,
      ),
    );
    startSlotCleaner(); // Démarrez la tâche cron de nettoyage des slots
    startDayDecrementer(); // Démarrez la tâche cron de décrémentation des jours restants
    startEvaluationReminder(); // Démarrez la tâche cron de rappel d'évaluation
    startChallengeArchiver(); // Démarrez la tâche d'archivage des challenges
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// cron: run every day at 12:35 to block inactive > 4 days
cron.schedule(
  '35 12 * * *',
  async () => {
    await autoBlockInactiveUsers();
  },
  {
    scheduled: true,
    timezone: 'Africa/Lagos', // Assurez-vous que c'est le même fuseau horaire que les autres cron jobs
  },
);
