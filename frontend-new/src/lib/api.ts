import { config } from './config';

const API_BASE_URL = config.apiUrl;

export const api = {
  baseURL: API_BASE_URL,
  
  async request(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token');

    const isFormData = typeof window !== 'undefined' && options.body instanceof FormData;

    const headers: Record<string, string> = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> | undefined),
    };
    if (!isFormData) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }

    const config: RequestInit = { ...options, headers };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },

  // Auth endpoints
  auth: {
    login: (email: string, password: string) =>
      api.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    
    register: (userData: any) =>
      api.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      }),
  },

  // User endpoints
  users: {
    getMe: () => api.request('/users/me'),
    updatePassword: (data: { currentPassword: string; newPassword: string }) =>
      api.request('/users/me/password', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    updateProfilePicture: (formData: FormData) =>
      api.request('/users/me/profile-picture', {
        method: 'PUT',
        body: formData,
      }),
  },

  // Project endpoints
  projects: {
    // Staff/Admin: list all project templates
    getAll: () => api.request('/projects'),
    // Learner: list my assigned projects
    getMine: () => api.request('/projects/my-projects'),
    create: (data: any) =>
      api.request('/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      api.request(`/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      api.request(`/projects/${id}`, {
        method: 'DELETE',
      }),
    submitSolution: (id: string, payload: { assignmentId: string; repoUrl: string; selectedSlotIds: string[] }) =>
      api.request(`/projects/${id}/submit-solution`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  // Hackathon endpoints
  hackathons: {
    // All authenticated users: list hackathons
    list: () => api.request('/hackathons'),
    create: (data: any) =>
      api.request('/hackathons', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    availableLearners: () => api.request('/hackathons/available-learners'),
    constituteTeams: (hackathonId: string, teams: Array<{ name: string; members: string[] }>) =>
      api.request(`/hackathons/${hackathonId}/constitute-teams`, {
        method: 'POST',
        body: JSON.stringify({ teams }),
      }),
  },

  // Teams endpoints (staff/admin)
  teams: {
    byHackathon: (hackathonId: string) => api.request(`/teams/hackathon/${hackathonId}`),
    delete: (teamId: string) => api.request(`/teams/${teamId}`, { method: 'DELETE' }),
    addMember: (teamId: string, memberId: string) =>
      api.request(`/teams/${teamId}/add-member`, {
        method: 'PUT',
        body: JSON.stringify({ memberId }),
      }),
    removeMember: (teamId: string, memberId: string) =>
      api.request(`/teams/${teamId}/remove-member`, {
        method: 'PUT',
        body: JSON.stringify({ memberId }),
      }),
  },

  // Notification endpoints
  notifications: {
    getMine: () => api.request('/notifications/mine'),
    markAsRead: (id: string) =>
      api.request(`/notifications/${id}/read`, {
        method: 'PUT',
      }),
  },

  // Evaluation endpoints
  evaluations: {
    getMine: () => api.request('/evaluations/mine'),
    getPendingAsEvaluator: () => api.request('/evaluations/pending-as-evaluator'),
    submit: (data: any) =>
      api.request('/evaluations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Availability (slots)
  availability: {
    getMine: () => api.request('/availability/mine'),
    create: (data: any) =>
      api.request('/availability', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      api.request(`/availability/${id}`, {
        method: 'DELETE',
      }),
  },

  // Admin user management
  admin: {
    getAllUsers: () => api.request('/users'),
    updateUser: (id: string, data: any) =>
      api.request(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    toggleUserStatus: (id: string) =>
      api.request(`/users/${id}/toggle-status`, {
        method: 'PATCH',
      }),
    deleteUser: (id: string) =>
      api.request(`/users/${id}`, {
        method: 'DELETE',
      }),
  },
};
