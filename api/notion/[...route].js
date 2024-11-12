// api/notion/[...route].js
import fetch from 'node-fetch';

const NOTION_API_BASE = 'https://api.notion.com/v1';

export default async function handler(req, res) {
  console.log('Request received:', {
    method: req.method,
    url: req.url,
    path: req.query
  });

  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests are allowed' });
  }

  try {
    const { databaseId } = req.query; // Get from query parameters
    const token = process.env.NOTION_TOKEN;

    console.log('Processing request:', {
      databaseId,
      hasToken: !!token
    });

    if (!token) {
      throw new Error('Notion token not found');
    }

    // Make request to Notion API
    const notionResponse = await fetch(
      `${NOTION_API_BASE}/databases/${databaseId}/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ page_size: 100 })
      }
    );

    const data = await notionResponse.json();

    if (!notionResponse.ok) {
      console.error('Notion API error:', data);
      return res.status(notionResponse.status).json(data);
    }

    const pages = data.results.map(page => {
      let title;
      for (const [key, value] of Object.entries(page.properties)) {
        if (value.type === 'title' && value.title?.[0]?.text?.content) {
          title = value.title[0].text.content;
          break;
        }
      }

      return {
        id: page.id,
        title: title || 'Untitled',
        url: page.url
      };
    });

    const response = {
      results: pages.map(page => ({
        ...page,
        links: [],
        backlinks: []
      })),
      debug: {
        totalPages: pages.length,
        databaseId
      }
    };

    console.log('Sending response:', response);
    return res.status(200).json(response);

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: error.message });
  }
}