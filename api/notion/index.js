// api/notion/index.js
import { Client } from '@notionhq/client';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Validate request method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Log environment variables (excluding sensitive values)
    console.log('Environment check:', {
      hasToken: !!process.env.NOTION_TOKEN,
      hasDbId: !!process.env.REACT_APP_NOTION_DATABASE_ID,
      nodeEnv: process.env.NODE_ENV
    });

    // Initialize Notion client
    const notion = new Client({
      auth: process.env.NOTION_TOKEN || process.env.REACT_APP_NOTION_TOKEN
    });

    const databaseId = req.query.databaseId;

    if (!databaseId) {
      return res.status(400).json({ error: 'Database ID is required' });
    }

    // Fetch database pages
    const response = await notion.databases.query({
      database_id: databaseId,
      page_size: 100,
    });

    res.status(200).json({ results: response.results });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}