import axios from 'axios';

const apiBaseUrl = '/api/notion';

console.log('API Base URL:', apiBaseUrl);

const apiClient = axios.create({
  baseURL: apiBaseUrl,
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
    console.log('API Response:', response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching data:", error.response?.data || error.message);
    throw error;
  }
};