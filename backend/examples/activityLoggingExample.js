/**
 * Exemple d'utilisation du système de logging des activités
 * Ce fichier montre comment utiliser le système de logging dans différents contextes
 */

import ActivityLogger from '../utils/activityLogger.js';
import User from '../models/User.js';
import Project from '../models/Project.js';

// Exemple 1: Logger une connexion utilisateur
export async function exampleLoginLogging(req) {
  try {
    const user = await User.findOne({ email: 'user@example.com' });
    if (user) {
      await ActivityLogger.logLogin(user._id, req);
      console.log('✅ Connexion loggée avec succès');
    }
  } catch (error) {
    console.error('❌ Erreur lors du logging de connexion:', error);
  }
}

// Exemple 2: Logger une soumission de projet
export async function exampleProjectSubmissionLogging(req) {
  try {
    const user = await User.findOne({ email: 'user@example.com' });
    const project = await Project.findOne({ title: 'Mon Projet' });
    
    if (user && project) {
      const assignmentId = project.assignments[0]._id;
      const repoUrl = 'https://github.com/user/mon-projet';
      
      await ActivityLogger.logProjectSubmitted(
        user._id,
        project._id,
        assignmentId,
        repoUrl,
        req
      );
      console.log('✅ Soumission de projet loggée avec succès');
    }
  } catch (error) {
    console.error('❌ Erreur lors du logging de soumission de projet:', error);
  }
}

// Exemple 3: Logger du temps passé sur un projet
export async function exampleTimeSpentLogging(req) {
  try {
    const user = await User.findOne({ email: 'user@example.com' });
    const project = await Project.findOne({ title: 'Mon Projet' });
    
    if (user && project) {
      const assignmentId = project.assignments[0]._id;
      const durationMinutes = 120; // 2 heures
      
      await ActivityLogger.logTimeSpentOnProject(
        user._id,
        project._id,
        assignmentId,
        durationMinutes,
        req
      );
      console.log('✅ Temps passé loggé avec succès');
    }
  } catch (error) {
    console.error('❌ Erreur lors du logging du temps passé:', error);
  }
}

// Exemple 4: Logger une activité personnalisée
export async function exampleCustomActivityLogging(req) {
  try {
    const user = await User.findOne({ email: 'user@example.com' });
    
    if (user) {
      await ActivityLogger.logActivity({
        userId: user._id,
        action: 'profile_updated',
        description: 'Profil utilisateur mis à jour',
        metadata: {
          changes: JSON.stringify({
            name: 'Nouveau nom',
            profilePicture: 'nouvelle-image.jpg'
          }),
          previousValues: JSON.stringify({
            name: 'Ancien nom',
            profilePicture: 'ancienne-image.jpg'
          })
        },
        req
      });
      console.log('✅ Activité personnalisée loggée avec succès');
    }
  } catch (error) {
    console.error('❌ Erreur lors du logging d\'activité personnalisée:', error);
  }
}

// Exemple 5: Récupérer les activités d'un utilisateur
export async function exampleGetUserActivities() {
  try {
    const user = await User.findOne({ email: 'user@example.com' });
    
    if (user) {
      // Récupérer les 10 dernières activités
      const activities = await ActivityLogger.getUserActivities(user._id, {
        limit: 10,
        skip: 0
      });
      
      console.log('📊 Activités récupérées:', activities.length);
      activities.forEach(activity => {
        console.log(`- ${activity.action}: ${activity.description} (${activity.timestamp})`);
      });
    }
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des activités:', error);
  }
}

// Exemple 6: Récupérer les statistiques d'un utilisateur
export async function exampleGetUserStats() {
  try {
    const user = await User.findOne({ email: 'user@example.com' });
    
    if (user) {
      const stats = await ActivityLogger.getUserActivityStats(user._id);
      
      console.log('📈 Statistiques d\'activité:');
      stats.forEach(stat => {
        console.log(`- ${stat._id}: ${stat.count} fois (dernière: ${stat.lastActivity})`);
      });
    }
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des statistiques:', error);
  }
}

// Exemple 7: Test complet du système
export async function runCompleteExample() {
  console.log('🚀 Démarrage de l\'exemple complet du système de logging...\n');
  
  // Simuler un objet request
  const mockReq = {
    ip: '192.168.1.100',
    get: (header) => {
      if (header === 'User-Agent') {
        return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      }
      return null;
    }
  };
  
  try {
    // Test 1: Connexion
    console.log('1. Test de logging de connexion...');
    await exampleLoginLogging(mockReq);
    
    // Test 2: Soumission de projet
    console.log('2. Test de logging de soumission de projet...');
    await exampleProjectSubmissionLogging(mockReq);
    
    // Test 3: Temps passé
    console.log('3. Test de logging de temps passé...');
    await exampleTimeSpentLogging(mockReq);
    
    // Test 4: Activité personnalisée
    console.log('4. Test de logging d\'activité personnalisée...');
    await exampleCustomActivityLogging(mockReq);
    
    // Test 5: Récupération des activités
    console.log('5. Test de récupération des activités...');
    await exampleGetUserActivities();
    
    // Test 6: Récupération des statistiques
    console.log('6. Test de récupération des statistiques...');
    await exampleGetUserStats();
    
    console.log('\n✅ Tous les tests sont terminés avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution des tests:', error);
  }
}

// Exécuter l'exemple si ce fichier est appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  runCompleteExample();
}
