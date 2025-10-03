# Système de Logging des Activités Utilisateur

## Vue d'ensemble

Le système de logging des activités permet de suivre et d'enregistrer toutes les actions importantes des utilisateurs dans l'application. Chaque action est stockée dans la base de données avec des métadonnées contextuelles.

## Modèle de données

### ActivityLog

```javascript
{
  user: ObjectId,           // Référence vers l'utilisateur
  action: String,           // Type d'action (voir enum ci-dessous)
  description: String,      // Description lisible de l'action
  metadata: {
    projectId: ObjectId,    // ID du projet (si applicable)
    evaluationId: ObjectId, // ID de l'évaluation (si applicable)
    assignmentId: ObjectId, // ID de l'assignation (si applicable)
    duration: Number,       // Durée en minutes (pour time_spent_on_project)
    score: Number,          // Score (pour les évaluations)
    ipAddress: String,      // Adresse IP de l'utilisateur
    userAgent: String,      // User-Agent du navigateur
    [autres]: Mixed         // Autres métadonnées selon le contexte
  },
  timestamp: Date           // Date/heure de l'action
}
```

### Types d'actions supportées

- `login` - Connexion utilisateur
- `logout` - Déconnexion utilisateur
- `evaluation_submitted` - Soumission d'évaluation
- `evaluation_accepted` - Évaluation acceptée
- `evaluation_rejected` - Évaluation rejetée
- `project_assigned` - Projet assigné
- `project_submitted` - Projet soumis
- `project_approved` - Projet approuvé
- `project_rejected` - Projet rejeté
- `time_spent_on_project` - Temps passé sur un projet
- `profile_updated` - Profil mis à jour
- `password_changed` - Mot de passe changé

## API Endpoints

### Récupérer ses propres activités
```
GET /api/activities/my-activities
```

**Paramètres de requête :**
- `limit` (optionnel) : Nombre d'activités à retourner (défaut: 50)
- `skip` (optionnel) : Nombre d'activités à ignorer (défaut: 0)
- `action` (optionnel) : Filtrer par type d'action
- `projectId` (optionnel) : Filtrer par projet
- `startDate` (optionnel) : Date de début (ISO string)
- `endDate` (optionnel) : Date de fin (ISO string)

**Exemple de réponse :**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "user": {
        "_id": "...",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "apprenant"
      },
      "action": "login",
      "description": "Connexion utilisateur",
      "metadata": {
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0..."
      },
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "skip": 0,
    "total": 1
  }
}
```

### Récupérer les statistiques de ses activités
```
GET /api/activities/my-stats
```

**Paramètres de requête :**
- `startDate` (optionnel) : Date de début pour les statistiques
- `endDate` (optionnel) : Date de fin pour les statistiques

**Exemple de réponse :**
```json
{
  "success": true,
  "data": [
    {
      "_id": "login",
      "count": 15,
      "lastActivity": "2024-01-15T10:30:00.000Z"
    },
    {
      "_id": "project_submitted",
      "count": 3,
      "lastActivity": "2024-01-14T16:45:00.000Z"
    }
  ]
}
```

### Récupérer les activités d'un utilisateur spécifique (Admin/Staff)
```
GET /api/activities/user/:userId
```

### Récupérer toutes les activités (Admin seulement)
```
GET /api/activities/all
```

## Utilisation dans le code

### Logger une activité personnalisée

```javascript
import ActivityLogger from '../utils/activityLogger.js';

// Logger une activité personnalisée
await ActivityLogger.logActivity({
  userId: user._id,
  action: 'custom_action',
  description: 'Action personnalisée effectuée',
  metadata: {
    customField: 'valeur',
    projectId: project._id
  },
  req // Objet request (optionnel, pour IP et User-Agent)
});
```

### Méthodes prédéfinies

```javascript
// Connexion
await ActivityLogger.logLogin(userId, req);

// Déconnexion
await ActivityLogger.logLogout(userId, req);

// Soumission d'évaluation
await ActivityLogger.logEvaluationSubmitted(
  userId, 
  evaluationId, 
  projectId, 
  assignmentId, 
  score, 
  req
);

// Soumission de projet
await ActivityLogger.logProjectSubmitted(
  userId, 
  projectId, 
  assignmentId, 
  repoUrl, 
  req
);

// Temps passé sur un projet
await ActivityLogger.logTimeSpentOnProject(
  userId, 
  projectId, 
  assignmentId, 
  durationMinutes, 
  req
);
```

## Intégration automatique

Le système est déjà intégré dans :

1. **AuthMiddleware** - Logs automatiques des connexions
2. **AuthController** - Logs des connexions/déconnexions
3. **EvaluationController** - Logs des soumissions d'évaluation
4. **ProjectController** - Logs des soumissions de projet

## Index de base de données

Les index suivants sont créés pour optimiser les performances :

- `{ user: 1, timestamp: -1 }` - Pour les requêtes par utilisateur
- `{ action: 1, timestamp: -1 }` - Pour les requêtes par type d'action
- `{ 'metadata.projectId': 1, timestamp: -1 }` - Pour les requêtes par projet

## Sécurité

- Les utilisateurs ne peuvent voir que leurs propres activités
- Les admins et staff peuvent voir les activités de tous les utilisateurs
- Les logs incluent l'IP et le User-Agent pour le suivi de sécurité
- Les erreurs de logging n'interrompent pas les opérations principales
