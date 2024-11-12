import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api/notion',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchLinksAndBacklinks = async (databaseId) => {
  try {
    console.log('Fetching data for database:', databaseId);

    const response = await apiClient.post('', null, {
      params: { databaseId }
    });

    console.log('API Response:', {
      status: response.status,
      dataExists: !!response.data,
      resultsCount: response.data?.results?.length,
      sampleResult: response.data?.results?.[0]
    });

    return response.data;
  } catch (error) {
    console.error('API Error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};