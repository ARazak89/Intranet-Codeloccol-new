import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from '../../../../styles/adminChallenges.module.css';

const EditChallengePage = () => {
  const router = useRouter();
  const { id } = router.query; // Get challenge ID from URL

  const [challengeTitle, setChallengeTitle] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('mixed');
  const [startDate, setStartDate] = useState('');
  const [durationHours, setDurationHours] = useState('');
  const [resources, setResources] = useState('');
  // const [images, setImages] = useState(''); // Supprimer cet état
  const [selectedFiles, setSelectedFiles] = useState([]); // Pour les fichiers sélectionnés par l'utilisateur
  const [existingImageUrls, setExistingImageUrls] = useState([]); // Pour les URLs des images déjà existantes
  const [status, setStatus] = useState('active');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      const fetchChallenge = async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            router.push('/login');
            return;
          }

          const response = await fetch(`http://localhost:4000/api/challenges/${id}`, {
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
          setChallengeTitle(data.challengeTitle);
          setDescription(data.description);
          setLanguage(data.language);
          setStartDate(new Date(data.startDate).toISOString().slice(0, 16)); // Format for datetime-local input
          setDurationHours(data.durationHours);
          setResources(data.resources.join(', '));
          setExistingImageUrls(data.images || []); // Pré-remplir les images existantes
          setStatus(data.status);
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

  const handleRemoveExistingImage = (urlToRemove) => {
    setExistingImageUrls(existingImageUrls.filter(url => url !== urlToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      let finalImageUrls = [...existingImageUrls]; // Commencer avec les URLs existantes (après suppressions potentielles)

      // Si de nouveaux fichiers sont sélectionnés, les uploader d'abord
      if (selectedFiles.length > 0) {
        const formData = new FormData();
        selectedFiles.forEach(file => formData.append('challengeImages', file));

        const uploadResponse = await fetch('http://localhost:4000/api/upload/challenge-image', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            // Ne PAS définir 'Content-Type' pour FormData
          },
          body: formData,
        });

        if (!uploadResponse.ok) {
          const uploadErrorData = await uploadResponse.json();
          throw new Error(uploadErrorData.message || 'Échec de l\'upload des nouvelles images.');
        }

        const uploadData = await uploadResponse.json();
        finalImageUrls.push(...uploadData.imageUrls); // Ajouter les nouvelles URLs
      }

      const response = await fetch(`http://localhost:4000/api/challenges/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          challengeTitle,
          description,
          language,
          startDate,
          durationHours: parseInt(durationHours),
          resources: resources.split(',').map(res => res.trim()).filter(res => res !== ''),
          images: finalImageUrls, // Utiliser les URLs finales
          status,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erreur HTTP: ${response.status} ${response.statusText}`);
      }

      alert('Challenge modifié avec succès !');
      router.push('/admin/challenges');
    } catch (err) {
      console.error('Erreur lors de la modification du challenge:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className={styles.container}>Chargement du challenge...</div>;
  }

  if (error && !loading) {
    return <div className={styles.container}>Erreur: {error}</div>;
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Modifier le Challenge - Admin</title>
      </Head>
      <Link href="/admin/challenges" className={styles.backButton}>Retour aux Challenges</Link>
      <h1 className={styles.pageTitle}>Modifier le Challenge</h1>

      {error && <div className={styles.errorMessage}>Erreur: {error}</div>}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="challengeTitle">Titre du Challenge :</label>
          <input
            type="text"
            id="challengeTitle"
            value={challengeTitle}
            onChange={(e) => setChallengeTitle(e.target.value)}
            required
            className={styles.inputField}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="description">Description / Consignes :</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className={styles.textareaField}
          ></textarea>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="language">Langage concerné :</label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            required
            className={styles.selectField}
          >
            <option value="mixed">HTML/CSS/JS (Mixte)</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="javascript">JavaScript</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="startDate">Date de début :</label>
          <input
            type="datetime-local"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className={styles.inputField}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="durationHours">Durée (en heures) :</label>
          <input
            type="number"
            id="durationHours"
            value={durationHours}
            onChange={(e) => setDurationHours(e.target.value)}
            required
            min="1"
            className={styles.inputField}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="currentImages">Images existantes :</label>
          <div className={styles.imagePreviewContainer}>
            {existingImageUrls.length === 0 ? (
              <p>Aucune image existante.</p>
            ) : (
              existingImageUrls.map((url, index) => (
                <div key={url} className={styles.imagePreviewWrapper}>
                  <img src={url} alt={`Image existante ${index}`} className={styles.imagePreview} />
                  <button 
                    type="button" 
                    onClick={() => handleRemoveExistingImage(url)} 
                    className={styles.removeImageButton}
                    title="Supprimer cette image existante"
                  >
                    &times;
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="newImages">Ajouter de nouvelles Images :</label>
          <input
            type="file"
            id="newImages"
            multiple
            accept="image/*"
            onChange={e => setSelectedFiles(Array.from(e.target.files))}
            className={styles.inputField}
          />
          {selectedFiles.length > 0 && (
            <div className={styles.imagePreviewContainer}>
              {selectedFiles.map((file, index) => (
                <img key={index} src={URL.createObjectURL(file)} alt={`Nouvelle image ${file.name}`} className={styles.imagePreview} />
              ))}
            </div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="resources">Ressources (liens séparés par des virgules) :</label>
          <textarea
            id="resources"
            value={resources}
            onChange={(e) => setResources(e.target.value)}
            className={styles.textareaField}
            placeholder="https://example.com/res1, https://example.com/res2"
          ></textarea>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="status">Statut du Challenge :</label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            required
            className={styles.selectField}
          >
            <option value="active">Actif</option>
            <option value="expired">Expiré</option>
            <option value="archived">Archivé</option>
          </select>
        </div>

        <button type="submit" disabled={submitting} className={styles.submitButton}>
          {submitting ? 'Modification...' : 'Modifier le Challenge'}
        </button>
      </form>
    </div>
  );
};

export default EditChallengePage;
