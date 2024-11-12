// api/notion/[...route].js
import fetch from 'node-fetch';

const NOTION_API_BASE = 'https://api.notion.com/v1';

export default async function handler(req, res) {
  try {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Extract databaseId from the URL path
    const pathParts = req.url.split('/');
    const databaseId = pathParts[pathParts.length - 2]; // Get second to last part

    const token = process.env.NOTION_TOKEN;

    console.log('API Called with:', {
      url: req.url,
      databaseId,
      hasToken: !!token,
      method: req.method
    });

    if (!token) {
      throw new Error('Notion token not found');
    }

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

    // Process pages basic info
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

    // Create a map for quick lookups
    const pageMap = new Map(pages.map(page => [page.id, page]));

    // Return processed data
    const result = {
      results: pages.map(page => ({
        ...page,
        links: [],  // We'll add page links later
        backlinks: []  // We'll calculate backlinks later
      })),
      debug: {
        totalPages: pages.length,
        requestUrl: req.url,
        databaseId
      }
    };

    console.log('Returning result:', result);
    return res.status(200).json(result);

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: error.message });
  }
}