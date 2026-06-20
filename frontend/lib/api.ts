import { getIdToken } from './firebase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function fetchWithAuth(path: string, options: RequestInit = {}) {
  const token = await getIdToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  getProfile: () => fetchWithAuth('/api/profile'),
  updateProfile: (data: { username?: string; avatar?: string }) =>
    fetchWithAuth('/api/profile', { method: 'PUT', body: JSON.stringify(data) }),
  getLeaderboard: (sort = 'wins') => fetchWithAuth(`/api/leaderboard?sort=${sort}`),
  getMatches: () => fetchWithAuth('/api/matches'),
  getPublicRooms: () => fetchWithAuth('/api/rooms'),
};
