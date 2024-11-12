// api/notion/[...route].js
import fetch from 'node-fetch';

const NOTION_API_BASE = 'https://api.notion.com/v1';

export default async function handler(req, res) {
  // Log incoming request
  console.log('Request:', {
    method: req.method,
    url: req.url,
    query: req.query,
    body: req.body
  });

  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get database ID from the path
    const urlParts = req.url.split('/');
    const databaseId = urlParts[urlParts.indexOf('database') + 1];

    console.log('Processing request for database:', databaseId);

    const token = process.env.NOTION_TOKEN;
    if (!token) {
      throw new Error('Notion token not found in environment');
    }

    // Make request to Notion API
    const notionResponse = await fetch(
      `${NOTION_API_BASE}/databases/${databaseId}/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          page_size: 100
        })
      }
    );

    const data = await notionResponse.json();

    if (!notionResponse.ok) {
      console.error('Notion API error:', data);
      return res.status(notionResponse.status).json(data);
    }

    // Process the response
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

    // Create the response
    const response = {
      results: pages.map(page => ({
        ...page,
        links: [],
        backlinks: []
      })),
      debug: {
        totalPages: pages.length
      }
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}