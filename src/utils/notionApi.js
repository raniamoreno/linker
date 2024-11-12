import axios from 'axios';

const apiBaseUrl = process.env.NODE_ENV === 'production'
  ? '' // Empty string for relative path in production
  : 'http://localhost:3001';

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchLinksAndBacklinks = async (databaseId) => {
  try {
    console.log('Making API call for database:', databaseId);
    const response = await apiClient.post(`/api/notion/database/${databaseId}/query`);
    console.log('API Response:', response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching data:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};