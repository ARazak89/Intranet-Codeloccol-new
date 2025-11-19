import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from '../../../../styles/adminChallenges.module.css';

const ChallengeSubmissionsPage = () => {
  const router = useRouter();
  const { challengeId } = router.query;

  const [challenge, setChallenge] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStudentName, setFilterStudentName] = useState('');
  const [challengeStats, setChallengeStats] = useState(null); // Nouvel état pour les stats

  useEffect(() => {
    if (challengeId) {
      const fetchChallengeData = async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            router.push('/login');
            return;
          }

          // Fetch challenge details
          const challengeResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/challenges/${challengeId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!challengeResponse.ok) {
            throw new Error(`Erreur HTTP lors du chargement du challenge: ${challengeResponse.status} ${challengeResponse.statusText}`);
          }
          const challengeData = await challengeResponse.json();
          setChallenge(challengeData);

          // Fetch challenge statistics
          const statsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/challenges/${challengeId}/stats`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!statsResponse.ok) {
            throw new Error(`Erreur HTTP lors du chargement des statistiques: ${statsResponse.status} ${statsResponse.statusText}`);
          }
          const statsData = await statsResponse.json();
          setChallengeStats(statsData);

        } catch (err) {
          console.error('Erreur lors du chargement des données du challenge:', err);
          setError(err.message);
        }
      };

      const fetchSubmissions = async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            router.push('/login');
            return;
          }

          let submissionsUrl = `${process.env.NEXT_PUBLIC_API_URL}/ide-submissions/challenges/${challengeId}`;
          const queryParams = new URLSearchParams();
          if (filterStatus) {
            queryParams.append('correctionStatus', filterStatus);
          }
          if (filterStudentName) {
            queryParams.append('studentName', filterStudentName);
          }
          if (queryParams.toString()) {
            submissionsUrl += `?${queryParams.toString()}`;
          }

          const submissionsResponse = await fetch(submissionsUrl, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!submissionsResponse.ok) {
            throw new Error(`Erreur HTTP lors du chargement des soumissions: ${submissionsResponse.status} ${submissionsResponse.statusText}`);
          }
          const submissionsData = await submissionsResponse.json();
          setSubmissions(submissionsData);

        } catch (err) {
          console.error('Erreur lors du chargement des soumissions du challenge:', err);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };

      fetchChallengeData();
      fetchSubmissions();

    }
  }, [challengeId, router, filterStatus, filterStudentName]);

  if (loading) {
    return <div className={styles.container}>Chargement des soumissions...</div>;
  }

  if (error) {
    return <div className={styles.container}>Erreur: {error}</div>;
  }

  if (!challenge) {
    return <div className={styles.container}>Challenge non trouvé.</div>;
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Soumissions pour "{challenge.challengeTitle}" - Admin</title>
      </Head>
      <Link href="/admin/challenges" className={styles.backButton}>Retour aux Challenges</Link>
      <h1 className={styles.pageTitle}>Soumissions pour "{challenge.challengeTitle}"</h1>

      {challengeStats && ( // Afficher les statistiques si disponibles
        <div className={styles.statsContainer}>
          <h3>Statistiques du Challenge</h3>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <strong>Total Soumissions :</strong> {challengeStats.totalSubmissions}
            </div>
            <div className={styles.statCard}>
              <strong>Soumissions Réussies :</strong> {challengeStats.succeededSubmissions}
            </div>
            <div className={styles.statCard}>
              <strong>Taux de Réussite :</strong> {challengeStats.successRate}%
            </div>
            <div className={styles.statCard}>
              <strong>Récompense Moyenne :</strong> {challengeStats.averageRewardDays} jours
            </div>
            <div className={styles.statCard}>
              <strong>Temps Moyen de Soumission :</strong> {challengeStats.averageSubmissionTime} heures
            </div>
          </div>
        </div>
      )}

      <div className={styles.filtersContainer}>
        <div className={styles.formGroup}>
          <label htmlFor="filterStatus">Filtrer par Statut :</label>
          <select
            id="filterStatus"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={styles.selectField}
          >
            <option value="">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="succeeded">Réussi</option>
            <option value="to_improve">À améliorer</option>
            <option value="not_compliant">Non conforme</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="filterStudentName">Filtrer par Nom d'Apprenant :</label>
          <input
            type="text"
            id="filterStudentName"
            value={filterStudentName}
            onChange={(e) => setFilterStudentName(e.target.value)}
            placeholder="Nom de l'apprenant..."
            className={styles.inputField}
          />
        </div>
      </div>

      {submissions.length === 0 ? (
        <p>Aucune soumission pour ce challenge pour le moment.</p>
      ) : (
        <table className={styles.challengesTable}>
          <thead>
            <tr>
              <th className={styles.tableHeader}>Nom de l'apprenant</th>
              <th className={styles.tableHeader}>Date de soumission</th>
              <th className={styles.tableHeader}>Statut</th>
              <th className={styles.tableHeader}>Récompense (jours)</th>
              <th className={styles.tableHeader}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map(submission => (
              <tr key={submission._id} className={styles.tableRow}>
                <td className={styles.tableCell}>{submission.userId?.name || 'N/A'}</td>
                <td className={styles.tableCell}>{new Date(submission.submissionDate).toLocaleDateString()}</td>
                <td className={styles.tableCell}>{submission.correctionStatus}</td>
                <td className={styles.tableCell}>{submission.rewardDays}</td>
                <td className={styles.tableCell}>
                  <Link 
                    href={`/admin/submissions/review/${submission._id}`} 
                    className={styles.actionButton}
                    title="Consulter / Évaluer la soumission"
                  >
                    <i className="bi bi-pencil-square"></i>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ChallengeSubmissionsPage;
