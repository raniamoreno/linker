// api/notion/index.js
import { Client } from '@notionhq/client';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const notion = new Client({
      auth: process.env.NOTION_TOKEN
    });

    const databaseId = req.query.databaseId;
    console.log('Fetching database:', databaseId);

    // Get all pages from database
    const pages = await notion.databases.query({
      database_id: databaseId,
      page_size: 100
    });

    // Process each page to get title and content
    const pagesWithLinks = await Promise.all(pages.results.map(async (page) => {
      // Get page title
      let title = 'Untitled';
      for (const [key, value] of Object.entries(page.properties)) {
        if (value.type === 'title' && value.title?.[0]?.plain_text) {
          title = value.title[0].plain_text;
          break;
        }
      }

      // Get page content (blocks)
      const blocks = await notion.blocks.children.list({
        block_id: page.id,
        page_size: 100
      });

      // Find links in blocks
      const links = blocks.results
        .filter(block =>
          block.type === 'link_to_page' ||
          (block.type === 'link_preview' && block.link_preview?.url?.includes('notion.so'))
        )
        .map(block => {
          if (block.type === 'link_to_page') {
            return block.link_to_page?.page_id;
          } else {
            const match = block.link_preview.url.match(/([a-f0-9]{32})/);
            return match ? match[1] : null;
          }
        })
        .filter(Boolean);

      return {
        id: page.id,
        title,
        links: [...new Set(links)] // Remove duplicates
      };
    }));

    // Calculate backlinks
    const results = pagesWithLinks.map(page => ({
      ...page,
      backlinks: pagesWithLinks
        .filter(p => p.links.includes(page.id))
        .map(p => p.id)
    }));

    console.log('API Response:', {
      pageCount: results.length,
      samplePage: results[0]
    });

    res.status(200).json({ results });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
}