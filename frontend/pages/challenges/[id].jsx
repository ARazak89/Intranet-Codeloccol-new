import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from '../../styles/challengeDetails.module.css'; // Créer ce module CSS

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"; // Définir l'URL de base de l'API

const ChallengeDetailsPage = () => {
  const router = useRouter();
  const { id } = router.query;

  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      const fetchChallenge = async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            router.push('/login');
            return;
          }

          const response = await fetch(`${API_URL}/challenges/${id}`, {
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
          setChallenge(data);
        } catch (err) {
          console.error('Erreur lors du chargement du challenge:', err);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchChallenge();
    }
  }, [id, router]);

  if (loading) {
    return <div className={styles.container}>Chargement du challenge...</div>;
  }

  if (error) {
    return <div className={styles.container}>Erreur: {error}</div>;
  }

  if (!challenge) {
    return <div className={styles.container}>Challenge non trouvé.</div>;
  }

  const handleParticipate = () => {
    router.push({
      pathname: '/ide',
      query: { challengeId: challenge._id, challengeTitle: challenge.challengeTitle },
    });
  };

  const startDate = new Date(challenge.startDate).toLocaleString();
  const endDate = new Date(challenge.endDate).toLocaleString();
  const now = new Date();
  const isChallengeActive = challenge.status === 'active' && now >= new Date(challenge.startDate) && now < new Date(challenge.endDate);

  return (
    <div className={styles.container}>
      <Head>
        <title>{challenge.challengeTitle}</title>
      </Head>
      <Link href="/challenges" className={styles.backButton}>Retour aux Challenges</Link>
      <h1 className={styles.title}>{challenge.challengeTitle}</h1>

      <div className={styles.detailsGrid}>
        <div className={styles.detailItem}>
          <strong>Langage :</strong> {challenge.language.toUpperCase()}
        </div>
        <div className={styles.detailItem}>
          <strong>Début :</strong> {startDate}
        </div>
        <div className={styles.detailItem}>
          <strong>Fin :</strong> {endDate}
        </div>
        <div className={styles.detailItem}>
          <strong>Durée :</strong> {challenge.durationHours} heures
        </div>
        <div className={styles.detailItem}>
          <strong>Statut :</strong> {challenge.status === 'active' ? 'Actif' : challenge.status === 'expired' ? 'Expiré' : 'Archivé'}
        </div>
        <div className={styles.detailItem}>
          <strong>Créé par :</strong> {challenge.createdBy?.name || 'N/A'}
        </div>
      </div>

      <div className={styles.descriptionSection}>
        <h2>Description et Consignes</h2>
        <p>{challenge.description}</p>
      </div>

      {challenge.images && challenge.images.length > 0 && (
        <div className={styles.imagesSection}>
          <h2>Images du Challenge</h2>
          <div className={styles.imageGrid}>
            {challenge.images.map((image, index) => (
              <img
                key={index}
                src={`${API_URL.replace('/api', '')}${image}`}
                alt={`Image du challenge ${challenge.challengeTitle}`}
                className={styles.challengeImage}
              />
            ))}
          </div>
        </div>
      )}

      {challenge.resources && challenge.resources.length > 0 && (
        <div className={styles.resourcesSection}>
          <h2>Ressources</h2>
          <ul>
            {challenge.resources.map((resource, index) => (
              <li key={index}><a href={resource} target="_blank" rel="noopener noreferrer">{resource}</a></li>
            ))}
          </ul>
        </div>
      )}

      {isChallengeActive ? (
        <button onClick={handleParticipate} className={styles.participateButton}>
          Participer au challenge
        </button>
      ) : (
        <p className={styles.inactiveMessage}>Ce challenge n'est plus actif ou a expiré.</p>
      )}
    </div>
  );
};

export default ChallengeDetailsPage;
