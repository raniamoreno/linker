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
    // Get databaseId from query parameters
    const databaseId = req.query.databaseId;
    console.log('Processing request for database:', databaseId);

    const notion = new Client({
      auth: process.env.NOTION_TOKEN
    });

    // Fetch all pages in the database
    const pages = await notion.databases.query({
      database_id: databaseId,
      page_size: 100
    });

    // Process pages to get their titles
    const processedPages = pages.results.map(page => {
      let title = 'Untitled';
      for (const [key, value] of Object.entries(page.properties)) {
        if (value.type === 'title' && value.title?.[0]?.text?.content) {
          title = value.title[0].text.content;
          break;
        }
      }
      return {
        id: page.id,
        title,
        url: page.url
      };
    });

    // Create a map for quick lookups
    const pageMap = new Map(processedPages.map(page => [page.id, page]));

    // Fetch content and find links for each page
    const pagesWithLinks = await Promise.all(processedPages.map(async (page) => {
      const blocks = await notion.blocks.children.list({
        block_id: page.id,
        page_size: 100
      });

      // Find links in content
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
        .filter(Boolean)
        .filter(linkId => pageMap.has(linkId));

      return {
        ...page,
        links: [...new Set(links)]
      };
    }));

    // Calculate backlinks
    const pagesWithBacklinks = pagesWithLinks.map(page => ({
      ...page,
      links: page.links,
      backlinks: pagesWithLinks
        .filter(p => p.links.includes(page.id))
        .map(p => p.id)
    }));

    console.log('Response summary:', {
      totalPages: pagesWithBacklinks.length,
      totalLinks: pagesWithBacklinks.reduce((sum, page) => sum + page.links.length, 0)
    });

    res.status(200).json({
      results: pagesWithBacklinks
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
}