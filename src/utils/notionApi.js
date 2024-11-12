import axios from 'axios';

const apiBaseUrl = process.env.NODE_ENV === 'production'
  ? '/api/notion'
  : 'http://localhost:3001/api/notion';

console.log('API Base URL:', apiBaseUrl);
console.log('Environment:', process.env.NODE_ENV);

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchLinksAndBacklinks = async (databaseId) => {
  try {
    console.log('Making API call to:', `${apiBaseUrl}/database/${databaseId}/query`);
    const response = await apiClient.post(`database/${databaseId}/query`);
    console.log('API Response:', response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching data:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};