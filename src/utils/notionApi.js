import axios from 'axios';

const getApiBaseUrl = () => {
  // For Vercel deployment
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api/notion`;
  }
  // For local development
  return process.env.NODE_ENV === 'production'
    ? '/api/notion'
    : 'http://localhost:3000/api/notion';
};

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchLinksAndBacklinks = async (databaseId) => {
  try {
    console.log('Making API call for database:', databaseId);
    const response = await apiClient.post('', null, {
      params: { databaseId }
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching data:", error.response?.data || error.message);
    throw error;
  }
};