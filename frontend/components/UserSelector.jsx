import { useState, useEffect } from 'react';
import { getAuthToken } from '../utils/auth';
import styles from '../styles/calendar.module.css';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function UserSelector({ 
  selectedUsers = [], 
  onChange, 
  eventType,
  label 
}) {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const token = getAuthToken();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        // Filtrer selon le type d'événement
        let filteredUsers = data;
        if (eventType === 'evaluation') {
          // Pour les évaluations, afficher evaluators et staff
          filteredUsers = data.filter(u => 
            u.role === 'evaluator' || u.role === 'staff' || u.role === 'admin'
          );
        } else if (eventType === 'formation') {
          // Pour les formations, afficher staff et admin
          filteredUsers = data.filter(u => 
            u.role === 'staff' || u.role === 'admin'
          );
        } else {
          // Pour les autres, afficher staff et admin
          filteredUsers = data.filter(u => 
            u.role === 'staff' || u.role === 'admin'
          );
        }
        setUsers(filteredUsers);
      }
    } catch (e) {
      console.error('Error fetching users:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserToggle = (userId) => {
    if (selectedUsers.includes(userId)) {
      onChange(selectedUsers.filter(id => id !== userId));
    } else {
      onChange([...selectedUsers, userId]);
    }
  };

  const getResponsableLabel = () => {
    if (label) return label;
    
    const labels = {
      evaluation: 'Évaluateurs',
      formation: 'Formateurs',
      hackathon: 'Organisateurs',
      reunion: 'Animateurs',
      deadline: 'Responsables',
      autre: 'Responsables',
    };
    return labels[eventType] || 'Responsables';
  };

  if (isLoading) {
    return (
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>
          <i className="bi bi-people me-2" style={{ color: '#F36F35' }}></i>
          {getResponsableLabel()}
        </label>
        <div className="text-center py-3">
          <span className="spinner-border spinner-border-sm me-2"></span>
          Chargement...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.formGroup}>
      <label className={styles.formLabel}>
        <i className="bi bi-people me-2" style={{ color: '#F36F35' }}></i>
        {getResponsableLabel()}
        <span className="text-muted ms-2" style={{ fontSize: '12px', fontWeight: 'normal' }}>
          ({selectedUsers.length} sélectionné{selectedUsers.length > 1 ? 's' : ''})
        </span>
      </label>
      <div className={styles.userSelectorGrid}>
        {users.map((user) => (
          <div
            key={user._id}
            className={`${styles.userCard} ${selectedUsers.includes(user._id) ? styles.selected : ''}`}
            onClick={() => handleUserToggle(user._id)}
          >
            <div className={styles.userCardCheckbox}>
              {selectedUsers.includes(user._id) && (
                <i className="bi bi-check-circle-fill"></i>
              )}
              {!selectedUsers.includes(user._id) && (
                <i className="bi bi-circle"></i>
              )}
            </div>
            <div className={styles.userCardInfo}>
              <div className={styles.userName}>{user.name}</div>
              <div className={styles.userRole}>
                {user.role === 'evaluator' && '🎯 Évaluateur'}
                {user.role === 'staff' && '👨‍💼 Staff'}
                {user.role === 'admin' && '👑 Admin'}
              </div>
            </div>
          </div>
        ))}
      </div>
      {users.length === 0 && (
        <div className="text-muted text-center py-3" style={{ fontSize: '14px' }}>
          Aucun utilisateur disponible
        </div>
      )}
    </div>
  );
}

