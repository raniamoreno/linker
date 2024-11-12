import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3001/api/notion/',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchLinksAndBacklinks = async (databaseId) => {
  try {
    console.log('Fetching data for database:', databaseId);
    const response = await apiClient.post(`database/${databaseId}/query`);
    console.log('API Response:', response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};