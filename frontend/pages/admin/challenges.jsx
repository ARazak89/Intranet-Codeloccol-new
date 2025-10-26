import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from '../../styles/adminChallenges.module.css'; // Créer ce module CSS

const AdminChallengesPage = () => {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/challenges`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            router.push('/login'); // Rediriger si non autorisé
            return;
          }
          throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        setChallenges(data);
      } catch (err) {
        console.error('Erreur lors du chargement des challenges:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchChallenges();
  }, []);

  const handleDeleteChallenge = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce challenge ?')) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/challenges/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur lors de la suppression: ${response.status} ${response.statusText}`);
      }

      setChallenges(challenges.filter(challenge => challenge._id !== id));
      alert('Challenge supprimé avec succès !');
    } catch (err) {
      console.error('Erreur lors de la suppression du challenge:', err);
      alert(`Erreur: ${err.message}`);
    }
  };

  if (loading) {
    return <div className={styles.container}>Chargement des challenges...</div>;
  }

  if (error) {
    return <div className={styles.container}>Erreur: {error}</div>;
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Gestion des Challenges - Admin</title>
      </Head>
      <h1 className={styles.pageTitle}>Gestion des Challenges</h1>
      <Link href="/admin/challenges/create" className={styles.createButton}>Créer un nouveau challenge</Link>

      {challenges.length === 0 ? (
        <p>Aucun challenge créé pour le moment.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.challengesTable}>
            <thead>
              <tr>
                <th className={styles.tableHeader}>Titre</th>
                <th className={styles.tableHeader}>Langage</th>
                <th className={styles.tableHeader}>Date de début</th>
                <th className={styles.tableHeader}>Heure de début</th>
                <th className={styles.tableHeader}>Durée (heures)</th>
                <th className={styles.tableHeader}>Statut</th>
                <th className={styles.tableHeader}>Créé par</th>
                <th className={styles.tableHeader}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {challenges.map(challenge => (
                <tr key={challenge._id} className={styles.tableRow}>
                  <td className={styles.tableCell}>
                    <Link href={`/admin/challenges/${challenge._id}/submissions`} className={styles.tableLink}>
                      {challenge.challengeTitle}
                    </Link>
                  </td>
                  <td className={styles.tableCell}>{challenge.language.toUpperCase()}</td>
                  <td className={styles.tableCell}>{new Date(challenge.startDate).toLocaleDateString()}</td>
                  <td className={styles.tableCell}>{new Date(challenge.startDate).toLocaleTimeString()}</td>
                  <td className={styles.tableCell}>{challenge.durationHours}</td>
                  <td className={styles.tableCell}>{challenge.status}</td>
                  <td className={styles.tableCell}>{challenge.createdBy?.name || 'N/A'}</td>
                  <td className={`${styles.tableCell} ${styles.actionButtonsContainer}`}>
                    <Link href={`/admin/challenges/edit/${challenge._id}`} className={styles.actionButton} title="Modifier"><i className="bi bi-pencil"></i></Link>
                    <button onClick={() => handleDeleteChallenge(challenge._id)} className={`${styles.actionButton} ${styles.deleteButton}`} title="Supprimer"><i className="bi bi-trash"></i></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminChallengesPage;
