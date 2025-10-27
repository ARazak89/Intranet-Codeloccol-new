import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from '../../styles/challengeList.module.css'; // Créer ce module CSS

const ChallengeListPage = () => {
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
        console.log('Challenges API URL:', process.env.NEXT_PUBLIC_API_URL);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/challenges`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            router.push('/login');
            return;
          }
          throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const now = new Date();
        const filteredChallenges = data.filter(challenge => new Date(challenge.startDate) <= now);
        setChallenges(filteredChallenges);
      } catch (err) {
        console.error('Erreur lors du chargement des challenges:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchChallenges();
  }, []);

  if (loading) {
    return <div className={styles.container}>Chargement des challenges...</div>;
  }

  if (error) {
    return <div className={styles.container}>Erreur: {error}</div>;
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Challenges disponibles</title>
      </Head>
      <h1 className={styles.title}>Challenges disponibles</h1>

      {challenges.length === 0 ? (
        <p>Aucun challenge actif pour le moment.</p>
      ) : (
        <div className={styles.challengeGrid}>
          {challenges.map(challenge => (
            <Link href={`/challenges/${challenge._id}`} key={challenge._id} className={styles.challengeCard}>
              <h2>{challenge.challengeTitle}</h2>
              <p>{challenge.description.substring(0, 100)}...</p>
              <div className={styles.cardDetails}>
                <span><strong>Langage:</strong> {challenge.language.toUpperCase()}</span>
                <span><strong>Fin:</strong> {new Date(challenge.endDate).toLocaleDateString()}</span>
              </div>
              {new Date() > new Date(challenge.endDate) && <span className={styles.statusExpired}>Expiré</span>}
              {challenge.status !== 'active' && new Date() <= new Date(challenge.endDate) && <span className={styles.statusInactive}>Inactif</span>}
              <button className={styles.viewButton}>Voir le challenge</button>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChallengeListPage;
