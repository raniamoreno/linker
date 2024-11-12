import axios from 'axios';

const apiBaseUrl = process.env.NODE_ENV === 'production'
  ? '/api/notion'  // Use relative path in production
  : 'http://localhost:3001/api/notion'; // Use localhost in development

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchLinksAndBacklinks = async (databaseId) => {
  try {
    console.log('Making API call to:', apiBaseUrl);
    const response = await apiClient.post(`database/${databaseId}/query`);
    return response.data;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};