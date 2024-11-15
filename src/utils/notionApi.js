import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NODE_ENV === 'production' ? '/api/notion' : 'http://localhost:3001/api/notion',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchDatabases = async () => {
  try {
    const response = await apiClient.get('');
    return response.data.databases;
  } catch (error) {
    console.error("Error fetching databases:", error);
    throw error;
  }
};

export const fetchLinksAndBacklinks = async (databaseId) => {
  try {
    console.log('Fetching data for database:', databaseId);

    const response = await apiClient.post('', null, {
      params: { databaseId }
    });

    if (!response.data || !response.data.results) {
      throw new Error('Invalid API response format');
    }

    console.log('API Response:', {
      totalPages: response.data.results.length,
      sampleLinks: response.data.results[0]?.links,
      sampleBacklinks: response.data.results[0]?.backlinks
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};