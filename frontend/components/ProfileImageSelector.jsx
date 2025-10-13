import { useState, useRef } from 'react';
import { getAvatarDisplayName } from '../utils/imageHelper';
import styles from '../styles/profile.module.css';

const predefinedImages = [
  '/profile/bear.png',
  '/profile/chicken.png',
  '/profile/dog.png',
  '/profile/man.png',
  '/profile/meerkat.png',
  '/profile/rabbit.png',
  '/profile/user.png',
  '/profile/woman.png',
  '/profile/woman1.png',
  '/profile/woman2.png',
  '/profile/default-avatar.jpg',
];

export default function ProfileImageSelector({ 
  currentImage, 
  onImageSelect, 
  onFileUpload,
  onClose 
}) {
  const [activeTab, setActiveTab] = useState('predefined'); // 'predefined' ou 'upload'
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  // Normaliser l'image actuelle pour la comparaison
  const normalizedCurrentImage = currentImage && currentImage.trim() !== '' 
    ? currentImage 
    : '/profile/default-avatar.jpg';

  const handlePredefinedImageSelect = (image) => {
    onImageSelect(image);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        alert('Veuillez sélectionner une image valide');
        return;
      }

      // Vérifier la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('L\'image ne doit pas dépasser 5MB');
        return;
      }

      setSelectedFile(file);
      
      // Créer une prévisualisation
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      onFileUpload(selectedFile);
    }
  };

  return (
    <div className={styles.imageSelectorOverlay} onClick={onClose}>
      <div className={styles.imageSelectorModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.imageSelectorHeader}>
          <h5 className="mb-0">
            <i className="bi bi-image me-2"></i>
            Choisir une photo de profil
          </h5>
          <button className={styles.closeBtnCustom} onClick={onClose}>
            <i className="bi bi-x" style={{ fontSize: '24px' }}></i>
          </button>
        </div>

        <div className={styles.imageSelectorTabs}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'predefined' ? styles.active : ''}`}
            onClick={() => setActiveTab('predefined')}
          >
            <i className="bi bi-images me-2"></i>
            Avatars prédéfinis
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'upload' ? styles.active : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            <i className="bi bi-upload me-2"></i>
            Uploader une image
          </button>
        </div>

        <div className={styles.imageSelectorBody}>
          {activeTab === 'predefined' && (
            <div className={styles.predefinedImagesGrid}>
              {predefinedImages.map((image, index) => (
                <button
                  key={index}
                  className={`${styles.imageOption} ${
                    normalizedCurrentImage === image ? styles.selected : ''
                  }`}
                  onClick={() => handlePredefinedImageSelect(image)}
                  title={getAvatarDisplayName(image)}
                >
                  <img
                    src={image}
                    alt={getAvatarDisplayName(image)}
                    onError={(e) => {
                      e.target.src = '/profile/default-avatar.jpg';
                    }}
                  />
                  {normalizedCurrentImage === image && (
                    <div className={styles.selectedBadge}>
                      <i className="bi bi-check-circle-fill"></i>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'upload' && (
            <div className={styles.uploadSection}>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              
              {!previewUrl ? (
                <div
                  className={styles.uploadArea}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <i className="bi bi-cloud-upload" style={{ fontSize: '48px', color: '#179349' }}></i>
                  <p className="mb-2 mt-3" style={{ fontWeight: '600' }}>
                    Cliquez pour sélectionner une image
                  </p>
                  <p className="text-muted" style={{ fontSize: '13px' }}>
                    PNG, JPG, GIF (max 5MB)
                  </p>
                </div>
              ) : (
                <div className={styles.previewSection}>
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className={styles.previewImage}
                  />
                  <div className="d-flex gap-2 mt-3">
                    <button
                      className="btn btn-success flex-1"
                      onClick={handleUpload}
                    >
                      <i className="bi bi-check-circle me-2"></i>
                      Utiliser cette image
                    </button>
                    <button
                      className="btn btn-outline-secondary"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }}
                    >
                      <i className="bi bi-x-circle"></i>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

