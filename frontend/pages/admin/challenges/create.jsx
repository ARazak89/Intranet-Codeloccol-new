import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from '../../../styles/adminChallenges.module.css';

const CreateChallengePage = () => {
  const [challengeTitle, setChallengeTitle] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('mixed'); // Default to mixed
  const [startDate, setStartDate] = useState('');
  const [durationHours, setDurationHours] = useState('');
  const [resources, setResources] = useState(''); // Comma-separated links
  // const [images, setImages] = useState(''); // Supprimer cet état
  const [selectedFiles, setSelectedFiles] = useState([]); // Pour les fichiers sélectionnés par l'utilisateur
  const [uploadedImageUrls, setUploadedImageUrls] = useState([]); // Pour les URLs des images déjà uploadées
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      let finalImageUrls = [...uploadedImageUrls]; // Commencer avec les URLs déjà téléchargées

      // Si de nouveaux fichiers sont sélectionnés, les uploader d'abord
      if (selectedFiles.length > 0) {
        const formData = new FormData();
        selectedFiles.forEach(file => formData.append('challengeImages', file));

        const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload/challenge-image`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            // Ne PAS définir 'Content-Type' pour FormData, le navigateur le fait automatiquement
          },
          body: formData,
        });

        if (!uploadResponse.ok) {
          const uploadErrorData = await uploadResponse.json();
          throw new Error(uploadErrorData.message || 'Échec de l\'upload des images.');
        }

        const uploadData = await uploadResponse.json();
        finalImageUrls.push(...uploadData.imageUrls); // Ajouter les nouvelles URLs
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/challenges`, {
        method: 'POST',
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
          images: finalImageUrls, // Utiliser les URLs finales après upload
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erreur HTTP: ${response.status} ${response.statusText}`);
      }

      alert('Challenge créé avec succès !');
      router.push('/admin/challenges'); // Rediriger vers la liste des challenges
    } catch (err) {
      console.error('Erreur lors de la création du challenge:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Créer un Challenge - Admin</title>
      </Head>
      <Link href="/admin/challenges" className={styles.backButton}>Retour aux Challenges</Link>
      <h1 className={styles.pageTitle}>Créer un nouveau Challenge</h1>

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
          <label htmlFor="images">Images du Challenge :</label>
          <input
            type="file"
            id="images"
            multiple
            accept="image/*"
            onChange={e => setSelectedFiles(Array.from(e.target.files))}
            className={styles.inputField}
          />
          {/* Aperçu des images sélectionnées */}
          <div className={styles.imagePreviewContainer}>
            {selectedFiles.map((file, index) => (
              <img key={index} src={URL.createObjectURL(file)} alt={`Preview ${file.name}`} className={styles.imagePreview} />
            ))}
          </div>
          {/* Afficher les URLs des images déjà uploadées (si applicable lors de l'édition, pas pour la création) */}
          {/* <div className={styles.uploadedImageUrlsContainer}>
            {uploadedImageUrls.map((url, index) => (
              <img key={index} src={url} alt={`Uploaded ${url}`} className={styles.imagePreview} />
            ))}
          </div> */}
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

        <button type="submit" disabled={loading} className={styles.submitButton}>
          {loading ? 'Création...' : 'Créer le Challenge'}
        </button>
      </form>
    </div>
  );
};

export default CreateChallengePage;
