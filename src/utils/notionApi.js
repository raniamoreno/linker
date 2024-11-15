import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NODE_ENV === 'production' ? '/api/notion' : 'http://localhost:3001/api/notion',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchDatabases = async () => {
  try {
    console.log('Fetching databases...');
    const response = await apiClient.get('');
    console.log('Received databases:', response.data.databases);
    return response.data.databases;
  } catch (error) {
    console.error("Error fetching databases:", error);
    throw new Error(`Failed to fetch databases: ${error.message}`);
  }
};

export const fetchLinksAndBacklinks = async (databaseId) => {
  try {
    console.log('Fetching data for database:', databaseId);

    const response = await apiClient.post('', null, {
      params: { databaseId }
    });

    if (!response.data || !response.data.results) {
      console.error('Invalid API response:', response.data);
      throw new Error('Invalid API response format');
    }

    const data = response.data;
    console.log('API Response:', {
      totalPages: data.results.length,
      firstPage: data.results[0] ? {
        title: data.results[0].title,
        links: data.results[0].links.length,
        backlinks: data.results[0].backlinks.length
      } : null
    });

    return data;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw new Error(`Failed to fetch graph data: ${error.message}`);
  }
};