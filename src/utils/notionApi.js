// src/utils/notionApi.js
import axios from 'axios';

const apiBaseUrl = process.env.NODE_ENV === 'production'
  ? '/api/notion'
  : 'http://localhost:3001/api/notion';

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchLinksAndBacklinks = async (databaseId) => {
  try {
    console.log('Fetching data for database:', databaseId);

    // Pass databaseId as a query parameter
    const response = await apiClient.post('', null, {
      params: { databaseId }
    });

    console.log('API Response:', {
      totalPages: response.data?.results?.length,
      samplePage: response.data?.results?.[0]
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};