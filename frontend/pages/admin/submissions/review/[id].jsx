import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Editor from '@monaco-editor/react';
import styles from '../../../../styles/adminChallenges.module.css';
import ideStyles from '../../../../styles/ide.module.css'; // Pour les styles de l'éditeur et aperçu

const ReviewSubmissionPage = ({ isDark }) => {
  const router = useRouter();
  const { id } = router.query;

  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false); // Nouvel état pour le plein écran

  // Code de l'apprenant
  const [htmlCode, setHtmlCode] = useState('');
  const [cssCode, setCssCode] = useState('');
  const [jsCode, setJsCode] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('html');
  const [currentEditorCode, setCurrentEditorCode] = useState('');

  // États pour l'évaluation
  const [correctionStatus, setCorrectionStatus] = useState('pending');
  const [staffFeedback, setStaffFeedback] = useState('');
  const [rewardDays, setRewardDays] = useState(0);

  const iframeRef = useRef(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null); // Pour stocker l'instance monaco

  // Effet pour charger la soumission et initialiser les états de l'éditeur
  useEffect(() => {
    if (id) {
      const fetchSubmission = async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            router.push('/login');
            return;
          }

          const response = await fetch(`http://localhost:4000/api/ide-submissions/${id}`, {
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
          setSubmission(data.submission); // Assurez-vous que l'API renvoie `submission` directement ou ajustez
          setHtmlCode(data.submission.htmlCode);
          setCssCode(data.submission.cssCode);
          setJsCode(data.submission.jsCode);

          // Initialiser les états d'évaluation avec les valeurs existantes si elles existent
          setCorrectionStatus(data.submission.correctionStatus || 'pending');
          setStaffFeedback(data.submission.staffFeedback || '');
          setRewardDays(data.submission.rewardDays || 0);

        } catch (err) {
          console.error('Erreur lors du chargement de la soumission:', err);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchSubmission();
    }
  }, [id, router]);

  // Mettre à jour le code de l'éditeur quand la langue change
  useEffect(() => {
    if (selectedLanguage === 'html') {
      setCurrentEditorCode(htmlCode);
    } else if (selectedLanguage === 'css') {
      setCurrentEditorCode(cssCode);
    } else if (selectedLanguage === 'javascript') {
      setCurrentEditorCode(jsCode);
    }
  }, [selectedLanguage, htmlCode, cssCode, jsCode]);

  // Logique pour l'aperçu de l'iframe
  const srcDoc = `
    <html>
      <head>
        <style>${cssCode}</style>
      </head>
      <body>
        ${htmlCode}
        <script>
          ${jsCode}
        </script>
      </body>
    </html>
  `;

  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = srcDoc;
    }
  }, [srcDoc]);

  // Fonction pour basculer en mode plein écran
  const toggleFullScreen = () => {
    if (iframeRef.current) {
      if (!document.fullscreenElement) {
        iframeRef.current.requestFullscreen().catch(err => {
          console.error(`Erreur lors du passage en plein écran: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    }
  };

  // Effet pour écouter les changements de mode plein écran
  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(document.fullscreenElement === iframeRef.current);
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, [iframeRef]);

  // Configuration de l'éditeur Monaco (désactivation du copier-coller)
  const setupEditor = (editor, monacoInstance) => {
    editorRef.current = editor;
    monacoRef.current = monacoInstance; // Sauvegarder l'instance monaco
    
    if (!monacoInstance || !editor) return;

    const disableCopyPaste = () => {
      editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyC, function() {});
      editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyV, function() {});
      editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyX, function() {});
    };
    disableCopyPaste();

    editor.onContextMenu((e) => {
      e.event.preventDefault();
      e.event.stopPropagation();
    });

    const domNode = editor.getDomNode();
    if (domNode) {
      domNode.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); });
      const handleClipboard = (e) => { e.preventDefault(); e.stopPropagation(); };
      domNode.addEventListener('copy', handleClipboard);
      domNode.addEventListener('cut', handleClipboard);
      domNode.addEventListener('paste', handleClipboard);
    }
  };

  const editorOptions = {
    minimap: { enabled: false },
    wordWrap: 'on',
    fontSize: 14,
    contextmenu: false,
    copyWithSyntaxHighlighting: false,
    theme: isDark ? 'vs-dark' : 'vs',
    readOnly: true, // L'éditeur de révision est en lecture seule
    selectionClipboard: false,
    automaticLayout: true,
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`http://localhost:4000/api/ide-submissions/${id}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          correctionStatus,
          staffFeedback,
          rewardDays: parseInt(rewardDays),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erreur HTTP: ${response.status} ${response.statusText}`);
      }

      alert('Soumission corrigée et enregistrée avec succès !');
      router.push(`/admin/challenges/${submission.challengeId}/submissions`); // Rediriger vers la liste des soumissions du challenge
    } catch (err) {
      console.error('Erreur lors de la soumission de la révision:', err);
      setError(err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return <div className={styles.container}>Chargement de la soumission...</div>;
  }

  if (error && !loading) {
    return <div className={styles.container}>Erreur: {error}</div>;
  }

  if (!submission) {
    return <div className={styles.container}>Soumission non trouvée.</div>;
  }

  return (
    <div className={`${styles.container} themed ${isDark ? '' : 'light'}`}>
      <Head>
        <title>Révision Soumission - {submission.challengeTitle}</title>
      </Head>
      <Link href={`/admin/challenges/${submission.challengeId}/submissions`} className={styles.backButton}>Retour aux Soumissions</Link>
      <h1 className={styles.pageTitle}>Révision de la Soumission "{submission.challengeTitle}"</h1>

      <div className={styles.reviewGrid}>
        {/* Section Informations de la Soumission */}
        <div className={styles.reviewInfoCard}>
          <h2>Informations Apprenant</h2>
          <p><strong>Nom :</strong> {submission.userId?.name}</p>
          <p><strong>Email :</strong> {submission.userId?.email}</p>
          <p><strong>Date de Soumission :</strong> {new Date(submission.submissionDate).toLocaleString()}</p>
          <p><strong>Statut Actuel :</strong> {submission.correctionStatus}</p>
          <p><strong>Récompense Actuelle :</strong> {submission.rewardDays} jours</p>
          {submission.reviewerId && <p><strong>Corrigé par :</strong> {submission.reviewerId.name || 'N/A'}</p>}
        </div>

        {/* Section Éditeur et Aperçu */}
        <div className={styles.editorPreviewSection}>
          <h2>Code Soumis et Aperçu</h2>
          <div className={ideStyles.languageSelector}>
            <button
              onClick={() => setSelectedLanguage('html')}
              className={`${ideStyles.languageButton} ${selectedLanguage === 'html' ? ideStyles.active : ''}`}
            >
              HTML
            </button>
            <button
              onClick={() => setSelectedLanguage('css')}
              className={`${ideStyles.languageButton} ${selectedLanguage === 'css' ? ideStyles.active : ''}`}
            >
              CSS
            </button>
            <button
              onClick={() => setSelectedLanguage('javascript')}
              className={`${ideStyles.languageButton} ${selectedLanguage === 'javascript' ? ideStyles.active : ''}`}
            >
              JavaScript
            </button>
          </div>

          <div className={`${ideStyles.editorSection} ${ideStyles.editorHeight}`}>
            <Editor
              height="100%"
              language={selectedLanguage}
              value={currentEditorCode}
              onMount={(editor, monaco) => setupEditor(editor, monaco)}
              options={editorOptions}
            />
          </div>

          <div className={ideStyles.previewConsoleContainer}>
            <div className={ideStyles.previewConsoleHeader}>
              📱 Aperçu
              <button
                onClick={toggleFullScreen}
                className={ideStyles.fullscreenButton}
                title={isFullScreen ? 'Quitter le plein écran' : 'Afficher en plein écran'}
              >
                <i className={`bi ${isFullScreen ? 'bi-fullscreen-exit' : 'bi-fullscreen'}`}></i>
              </button>
            </div>
            <iframe
              ref={iframeRef}
              title="live-preview"
              className={ideStyles.iframeStyle}
              sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin"
            />
          </div>
        </div>

        {/* Section Formulaire d'Évaluation */}
        <div className={styles.reviewFormCard}>
          <h2>Évaluer la Soumission</h2>
          {error && <div className={styles.errorMessage}>Erreur: {error}</div>}
          <form onSubmit={handleReviewSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="correctionStatus">Statut de Correction :</label>
              <select
                id="correctionStatus"
                value={correctionStatus}
                onChange={(e) => setCorrectionStatus(e.target.value)}
                required
                className={styles.selectField}
              >
                <option value="pending">En attente</option>
                <option value="succeeded">✅ Réussi</option>
                <option value="to_improve">⚠️ À améliorer</option>
                <option value="not_compliant">❌ Non conforme</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="staffFeedback">Commentaire / Feedback :</label>
              <textarea
                id="staffFeedback"
                value={staffFeedback}
                onChange={(e) => setStaffFeedback(e.target.value)}
                className={styles.textareaField}
                rows="5"
                placeholder="Laissez un feedback détaillé à l'apprenant..."
              ></textarea>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="rewardDays">Récompense (jours à ajouter) :</label>
              <input
                type="number"
                id="rewardDays"
                value={rewardDays}
                onChange={(e) => setRewardDays(e.target.value)}
                min="0"
                className={styles.inputField}
              />
            </div>

            <button type="submit" disabled={submittingReview} className={styles.submitButton}>
              {submittingReview ? 'Envoi...' : 'Enregistrer la Révision'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReviewSubmissionPage;
