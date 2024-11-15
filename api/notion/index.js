// api/notion/index.js
import { Client } from '@notionhq/client';

async function getPageTitle(page) {
  for (const [key, value] of Object.entries(page.properties)) {
    if (value.type === 'title' && value.title?.[0]?.text?.content) {
      return value.title[0].text.content;
    }
  }
  return 'Untitled';
}

async function getPageLinks(notion, pageId) {
  try {
    const blocks = await notion.blocks.children.list({
      block_id: pageId,
      page_size: 100
    });

    const links = new Set();

    for (const block of blocks.results) {
      // Link previews
      if (block.type === 'link_preview' && block.link_preview?.url) {
        const match = block.link_preview.url.match(/notion\.so\/.*?([a-f0-9-]{32})/);
        if (match) {
          links.add(match[1].replace(/-/g, ''));
        }
      }

      // Direct page links
      if (block.type === 'link_to_page' && block.link_to_page?.page_id) {
        links.add(block.link_to_page.page_id);
      }

      // Rich text mentions and links
      if (block[block.type]?.rich_text) {
        for (const text of block[block.type].rich_text) {
          if (text.type === 'mention' && text.mention?.type === 'page') {
            links.add(text.mention.page.id);
          }
          if (text.type === 'text' && text.text?.link?.url) {
            const match = text.text.link.url.match(/notion\.so\/.*?([a-f0-9-]{32})/);
            if (match) {
              links.add(match[1].replace(/-/g, ''));
            }
          }
        }
      }
    }

    return Array.from(links);
  } catch (error) {
    console.error(`Error fetching links for page ${pageId}:`, error);
    return [];
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const notion = new Client({
    auth: process.env.NOTION_TOKEN
  });

  // Handle GET request for databases
  if (req.method === 'GET') {
    try {
      const response = await notion.search({
        filter: {
          property: 'object',
          value: 'database'
        }
      });

      const databases = response.results.map(database => ({
        id: database.id,
        title: database.title[0]?.plain_text || 'Untitled Database',
        icon: database.icon?.emoji || null,
        created_time: database.created_time
      }));

      return res.status(200).json({ databases });
    } catch (error) {
      console.error('API Error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // Handle POST request for database content
  if (req.method === 'POST') {
    try {
      const { databaseId } = req.query;
      console.log('Processing database:', databaseId);

      // Get all pages from database
      const response = await notion.databases.query({
        database_id: databaseId,
        page_size: 100
      });

      // Process pages with basic info
      const pages = await Promise.all(response.results.map(async page => ({
        id: page.id,
        title: await getPageTitle(page),
        url: page.url
      })));

      // Create lookup map
      const pageMap = new Map(pages.map(page => [page.id, page]));

      // Get links for each page
      const pagesWithRefs = await Promise.all(pages.map(async page => {
        const links = await getPageLinks(notion, page.id);
        // Filter links to only include pages from our database
        const validLinks = links.filter(linkId => pageMap.has(linkId));

        return {
          ...page,
          links: validLinks
        };
      }));

      // Calculate backlinks
      const results = pagesWithRefs.map(page => {
        const backlinks = pagesWithRefs
          .filter(otherPage => otherPage.links.includes(page.id))
          .map(otherPage => otherPage.id);

        return {
          ...page,
          links: page.links,
          backlinks
        };
      });

      console.log('API Response Summary:', {
        totalPages: results.length,
        totalLinks: results.reduce((sum, page) => sum + page.links.length, 0),
        totalBacklinks: results.reduce((sum, page) => sum + page.backlinks.length, 0),
        samplePage: {
          title: results[0]?.title,
          linksCount: results[0]?.links.length,
          backlinksCount: results[0]?.backlinks.length
        }
      });

      return res.status(200).json({ results });
    } catch (error) {
      console.error('API Error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}