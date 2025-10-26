import React, { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from '../styles/ide.module.css';
import { useRouter } from 'next/router'; // Importation de useRouter

const IDE = ({ isDark }) => {
  const [html, setHtml] = useState(() => localStorage.getItem('ide-html') || '<h1>Hello World</h1>\n<p>Bienvenue dans CodeLoccol IDE</p>');
  const [css, setCss] = useState(() => localStorage.getItem('ide-css') || 'h1 {\n  color: #ff9d42;\n  font-family: "Manrope", sans-serif;\n}\n\np {\n  color: #b0b0b0;\n}');
  const [js, setJs] = useState(() => localStorage.getItem('ide-js') || 'console.log("Hello from JavaScript");\nconsole.log("Bienvenue dans l\'IDE !");');
  const [selectedLanguage, setSelectedLanguage] = useState('html');
  const [code, setCode] = useState(html);
  const [runCode, setRunCode] = useState(false);
  const [jsError, setJsError] = useState('');
  const iframeRef = useRef(null);
  const [consoleOutput, setConsoleOutput] = useState([]);
  const editorRef = useRef(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [challengeTitle, setChallengeTitle] = useState('');
  const router = useRouter(); // Initialisation du routeur
  const [currentChallengeId, setCurrentChallengeId] = useState(null); // Nouvel état pour challengeId
  const [challengeData, setChallengeData] = useState(null); // Pour stocker les détails du challenge
  const [isChallengeActive, setIsChallengeActive] = useState(false); // État pour l'activité du challenge

  // Effet pour lire challengeId et challengeTitle depuis l'URL
  useEffect(() => {
    if (router.query.challengeId) {
      setCurrentChallengeId(router.query.challengeId);
      if (router.query.challengeTitle) {
        setChallengeTitle(router.query.challengeTitle); // Pré-remplir le titre
      }
    }
  }, [router.query.challengeId, router.query.challengeTitle]);

  // Effet pour récupérer les détails du challenge et vérifier son statut
  useEffect(() => {
    if (currentChallengeId) {
      const fetchChallengeDetails = async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            console.error("Token d\'authentification manquant.");
            setIsChallengeActive(false);
            return;
          }
          const response = await fetch(`http://localhost:4000/api/challenges/${currentChallengeId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (response.ok) {
            const data = await response.json();
            setChallengeData(data);
            const now = new Date();
            const start = new Date(data.startDate);
            const end = new Date(data.endDate);
            setIsChallengeActive(data.status === 'active' && now >= start && now < end);
          } else {
            console.error(`Erreur lors du chargement du challenge: ${response.status}`);
            setIsChallengeActive(false);
          }
        } catch (error) {
          console.error("Erreur lors de la récupération du challenge:", error);
          setIsChallengeActive(false);
        }
      };
      fetchChallengeDetails();
    } else {
      // Si aucun challengeId n'est présent, le bouton est actif par défaut (soumission libre)
      // Tant qu'un challengeTitle est fourni, on considère la soumission libre active.
      setIsChallengeActive(true); 
    }
  }, [currentChallengeId]);

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

  const srcDoc = `
    <html>
      <head>
        <style>${css}</style>
      </head>
      <body>
        ${html}
        <script>
          const originalConsole = {};
          ['log', 'warn', 'error'].forEach(method => {
            originalConsole[method] = console[method];
            console[method] = (...args) => {
              originalConsole[method](...args);
              parent.postMessage({ type: 'console', method: method, args: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg) }, '*');
            };
          });

          window.onerror = function(message, source, lineno, colno, error) {
            parent.postMessage(
              {
                type: 'js-error',
                message: message,
                line: lineno,
                column: colno,
                stack: error?.stack || ''
              },
              '*'
            );
          };
          try {
            ${js}
          } catch (err) {
            window.onerror(err.message, null, null, null, err);
          }
        </script>
      </body>
    </html>
  `;

  useEffect(() => {
    if (runCode && iframeRef.current) {
      iframeRef.current.srcdoc = srcDoc;
      setRunCode(false);
      setJsError('');
      setConsoleOutput([]);
    }
  }, [runCode, srcDoc]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'js-error') {
        const { message, line, column } = event.data;
        setJsError(`Erreur JS: ${message} (ligne ${line}, colonne ${column})`);
      } else if (event.data?.type === 'console') {
        const { method, args } = event.data;
        setConsoleOutput(prev => [...prev, { method, args }]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => localStorage.setItem('ide-html', html), [html]);
  useEffect(() => localStorage.setItem('ide-css', css), [css]);
  useEffect(() => localStorage.setItem('ide-js', js), [js]);

  useEffect(() => {
    if (selectedLanguage === 'html') {
      setCode(html);
    } else if (selectedLanguage === 'css') {
      setCode(css);
    } else if (selectedLanguage === 'javascript') {
      setCode(js);
    }
  }, [selectedLanguage, html, css, js]);

  const setupEditor = (editor, monacoInstance) => {
    editorRef.current = editor;
    
    if (!monacoInstance || !editor) return;

    // Bloquer les commandes de copier-coller de manière plus ciblée
    const disableCopyPaste = () => {
      // Commande pour Ctrl+C / Cmd+C
      editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyC, function() {
        // Ne rien faire - empêche la copie
        console.log('Copy blocked');
      });

      // Commande pour Ctrl+V / Cmd+V
      editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyV, function() {
        // Ne rien faire - empêche le collage
        console.log('Paste blocked');
      });

      // Commande pour Ctrl+X / Cmd+X
      editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyX, function() {
        // Ne rien faire - empêche le couper
        console.log('Cut blocked');
      });
    };

    disableCopyPaste();

    // Désactiver le menu contextuel
    editor.onContextMenu((e) => {
      e.event.preventDefault();
      e.event.stopPropagation();
    });

    // Gestionnaire d'événements pour le DOM de l'éditeur
    const domNode = editor.getDomNode();
    if (domNode) {
      // Bloquer le menu contextuel
      domNode.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });

      // Bloquer les événements de copier-coller au niveau DOM
      const handleClipboard = (e) => {
        if (e.type === 'copy' || e.type === 'cut' || e.type === 'paste') {
          e.preventDefault();
          e.stopPropagation();
        }
      };

      domNode.addEventListener('copy', handleClipboard);
      domNode.addEventListener('cut', handleClipboard);
      domNode.addEventListener('paste', handleClipboard);
    }
  };

  const editorOptions = {
    minimap: { enabled: false },
    wordWrap: 'on',
    fontSize: 14,
    contextmenu: false, // Désactive le menu contextuel de Monaco
    copyWithSyntaxHighlighting: false,
    theme: isDark ? 'vs-dark' : 'vs',
    readOnly: false,
    selectionClipboard: false, // Désactive le clipboard de sélection
    automaticLayout: true,
  };

  const ideHandleSubmitProject = async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      alert("Erreur: Token d\'authentification manquant. Veuillez vous connecter.");
      return;
    }

    // Décoder le token pour obtenir l'ID de l'utilisateur (exemple simple, utiliser une bibliothèque JWT pour une meilleure robustesse)
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const decodedToken = JSON.parse(window.atob(base64));
    const userId = decodedToken.id; // Corrected: Use 'id' from the decoded token

    if (!userId) {
      alert("Erreur: Impossible de trouver l\'ID de l\'utilisateur dans le token.");
      return;
    }

    const projectData = {
      userId,
      challengeTitle,
      htmlCode: html,
      cssCode: css,
      jsCode: js,
      // submissionDate: new Date(), // Le backend gère maintenant submissionDate avec `timestamps: true`
    };

    if (currentChallengeId) {
      projectData.challengeId = currentChallengeId;
    } else if (!challengeTitle) {
      alert("Veuillez fournir un titre de projet pour une soumission libre.");
      return;
    }

    try {
      const response = await fetch('http://localhost:4000/api/ide/submit-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(projectData),
      });

      if (response.ok) {
        alert("Projet soumis avec succès !");
        // Vous pouvez ajouter une redirection ou une autre logique ici
      } else {
        const errorData = await response.json();
        alert(`Erreur lors de la soumission du projet: ${errorData.message || response.statusText}`);
      }
    } catch (error) {
      console.error("Erreur réseau ou inattendue:", error);
      alert("Une erreur inattendue est survenue lors de la soumission.");
    }
  };

  // Gestionnaire de touches global pour la page
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Bloquer Ctrl/Cmd + C, V, X, A, F
      if ((e.ctrlKey || e.metaKey) && 
          (e.key === 'c' || e.key === 'v' || e.key === 'x' || e.key === 'a' || e.key === 'f')) {
        // Vérifier si l'éditeur est focus
        if (editorRef.current && editorRef.current.hasTextFocus()) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
      // Bloquer la touche F3 (recherche)
      if (e.key === 'F3') {
        if (editorRef.current && editorRef.current.hasTextFocus()) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  return (
    <div className={`${styles.ideContainer} themed ${isDark ? '' : 'light'}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTitleContainer}>
          <span className={styles.headerTitleIcon}>🥊</span>
          <h1 className={styles.headerTitle}>
           Octogone
          </h1>
          <span className={styles.headerTitleIcon}>💪</span>
        </div>
        
        {/* Language Selector */}
        <div className={styles.languageSelector}>
          {['html', 'css', 'javascript'].map(lang => (
            <button
              key={lang}
              onClick={() => setSelectedLanguage(lang)}
              className={`${styles.languageButton} ${selectedLanguage === lang ? styles.active : ''}`}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.mainContentGrid}>
        {/* Champ de saisie du titre du challenge */}
        <div className={styles.ideChallengeTitleContainer}>
          <label htmlFor="ideChallengeTitle" className={styles.ideChallengeTitleLabel}>Nom du Challenge / Titre du Projet :</label>
          <input
            type="text"
            id="ideChallengeTitle"
            className={styles.ideChallengeTitleInput}
            value={challengeTitle}
            onChange={(e) => setChallengeTitle(e.target.value)}
            placeholder="Entrez le nom du challenge ou le titre de votre projet..."
            required
          />
        </div>

        {/* Editor Section */}
        <div className={styles.editorSection}>
          <div className={styles.editorHeader}>
            <div className={styles.trafficLightRed}></div>
            <div className={styles.trafficLightYellow}></div>
            <div className={styles.trafficLightGreen}></div>
            <span className={styles.editorLanguageLabel}>
              {selectedLanguage.toUpperCase()}
            </span>
          </div>
          <div className={styles.editorHeight}>
            <Editor
              height="100%"
              language={selectedLanguage}
              value={code}
              onChange={newCode => {
                if (selectedLanguage === 'html') setHtml(newCode);
                if (selectedLanguage === 'css') setCss(newCode);
                if (selectedLanguage === 'javascript') setJs(newCode);
                setCode(newCode);
              }}
              onMount={(editor, monaco) => setupEditor(editor, monaco)}
              options={editorOptions}
            />
          </div>
        </div>

        {/* Run Button */}
        <div className={styles.runButtonContainer}>
          <button
            onClick={() => setRunCode(true)}
            className={styles.runButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = 'inset 0 1px 2px rgba(255,255,255,0.7), 0 6px 12px rgba(0,0,0,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'inset 0 1px 2px rgba(255,255,255,0.5), 0 4px 6px rgba(0,0,0,0.3)';
            }}
          >
            <span style={{ fontSize: '1.3rem' }}>▶️</span>
            Exécuter le code
          </button>
          
          {jsError && (
            <div className={styles.jsError}>
              ⚠️ {jsError}
            </div>
          )}
        </div>

        {/* Preview and Console */}
        <div className={styles.previewConsoleGrid}>
          {/* Preview */}
          <div className={styles.previewConsoleContainer}>
            <div className={styles.previewConsoleHeader}>
              📱 Aperçu
              <button
                onClick={toggleFullScreen}
                className={styles.fullscreenButton}
                title={isFullScreen ? 'Quitter le plein écran' : 'Afficher en plein écran'}
              >
                <i className={`bi ${isFullScreen ? 'bi-fullscreen-exit' : 'bi-fullscreen'}`}></i>
              </button>
            </div>
            <iframe
              ref={iframeRef}
              title="live-preview"
              className={styles.iframeStyle}
              sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin"
            />
          </div>

          {/* Console */}
          <div className={styles.previewConsoleContainer}>
            <div className={styles.previewConsoleHeader}>
              💻 Console
            </div>
            <div className={styles.consoleContent}>
              {consoleOutput.length === 0 ? (
                <div className={styles.emptyConsoleMessage}>
                  La console est vide. Exécutez votre code pour voir les résultats...
                </div>
              ) : (
                consoleOutput.map((entry, index) => (
                  <div
                    key={index}
                    className={`${styles.consoleEntry} ${entry.method === 'error' ? styles.error : entry.method === 'warn' ? styles.warn : styles.log}`}
                  >
                    {entry.args.join(' ')}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        {/* Bouton de soumission du projet */}
        <div className={styles.ideSubmitButtonContainer}>
          <button
            className={styles.ideSubmitButton}
            onClick={ideHandleSubmitProject}
            disabled={!isChallengeActive || !challengeTitle.trim()}
          >
            Soumettre mon projet
          </button>
        </div>
      </div>
    </div>
  );
};

export default IDE;