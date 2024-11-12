// api/notion/index.js
import { Client } from '@notionhq/client';

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_TOKEN
});

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const databaseId = req.query.databaseId;

    // Fetch database pages
    const response = await notion.databases.query({
      database_id: databaseId,
      page_size: 100,
    });

    // Process pages and fetch their content
    const pagesWithRefs = await Promise.all(
      response.results.map(async (page) => {
        // Get page title
        const titleKey = Object.keys(page.properties).find(
          key => page.properties[key].type === 'title'
        );
        const title = titleKey ?
          page.properties[titleKey].title[0]?.plain_text || 'Untitled' :
          'Untitled';

        // Fetch page content
        const blocks = await notion.blocks.children.list({
          block_id: page.id,
          page_size: 100,
        });

        // Extract links
        const links = blocks.results
          .filter(block =>
            block.type === 'link_to_page' ||
            block.type === 'link_preview'
          )
          .map(block =>
            block.type === 'link_to_page' ?
              block.link_to_page.page_id :
              block.link_preview.page_id
          );

        return {
          id: page.id,
          title,
          links
        };
      })
    );

    // Calculate backlinks
    const pagesWithBacklinks = pagesWithRefs.map(page => ({
      ...page,
      backlinks: pagesWithRefs
        .filter(p => p.links.includes(page.id))
        .map(p => p.id)
    }));

    res.status(200).json({ results: pagesWithBacklinks });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
}