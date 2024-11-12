import axios from 'axios';

const apiBaseUrl = process.env.NODE_ENV === 'production'
  ? '/api/notion'
  : 'http://localhost:3001/api/notion';

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

    // Construct URL with query parameter
    const url = `?databaseId=${databaseId}`;

    const response = await apiClient.post(url);
    console.log('API Response:', response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching data:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};