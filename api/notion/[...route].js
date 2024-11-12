import fetch from 'node-fetch';

const NOTION_API_BASE = 'https://api.notion.com/v1';

async function fetchPageReferences(pageId, token) {
  try {
    const response = await fetch(
      `${NOTION_API_BASE}/blocks/${pageId}/children?page_size=100`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': '2022-06-28'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch page content: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results;
  } catch (error) {
    console.error(`Error fetching references for page ${pageId}:`, error);
    return [];
  }
}

function findLinksInBlocks(blocks) {
  const links = new Set();

  const processBlock = (block) => {
    // Check link_preview blocks
    if (block.type === 'link_preview' && block.link_preview?.url) {
      const match = block.link_preview.url.match(/notion\.so\/.*?([a-f0-9-]{32})/);
      if (match) {
        links.add(match[1].replace(/-/g, ''));
      }
    }

    // Check link_to_page blocks
    if (block.type === 'link_to_page' && block.link_to_page?.page_id) {
      links.add(block.link_to_page.page_id);
    }

    // Check for page references in rich text
    const richTextContent = block[block.type]?.rich_text || [];
    richTextContent.forEach(textBlock => {
      if (textBlock.type === 'mention' && textBlock.mention?.type === 'page') {
        links.add(textBlock.mention.page.id);
      }

      if (textBlock.type === 'text' && textBlock.text?.link?.url) {
        const match = textBlock.text.link.url.match(/notion\.so\/.*?([a-f0-9-]{32})/);
        if (match) {
          links.add(match[1].replace(/-/g, ''));
        }
      }
    });
  };

  blocks.forEach(processBlock);
  return Array.from(links);
}

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = process.env.NOTION_TOKEN;
    if (!token) {
      throw new Error('Notion token not found');
    }

    const { databaseId } = req.query;
    if (!databaseId) {
      throw new Error('Database ID is required');
    }

    console.log('Processing request for database:', databaseId);

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

    if (!notionResponse.ok) {
      const error = await notionResponse.text();
      throw new Error(`Notion API error: ${error}`);
    }

    const data = await notionResponse.json();

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

    // Fetch content and references for each page
    console.log('Fetching page contents and references...');
    const pagesWithRefs = await Promise.all(pages.map(async (page) => {
      console.log(`Processing "${page.title}" (${page.id})`);

      const blocks = await fetchPageReferences(page.id, token);
      console.log(`Found ${blocks.length} blocks`);

      const links = findLinksInBlocks(blocks);
      const validLinks = links.filter(linkId => pageMap.has(linkId));

      console.log(`Found ${validLinks.length} valid links`);

      return {
        ...page,
        links: validLinks
      };
    }));

    // Calculate backlinks
    const pagesWithBacklinks = pagesWithRefs.map(page => {
      const backlinks = pagesWithRefs
        .filter(otherPage => otherPage.links.includes(page.id))
        .map(otherPage => otherPage.id);

      return {
        ...page,
        links: page.links,
        backlinks
      };
    });

    // Log summary
    console.log('Summary:', {
      totalPages: pagesWithBacklinks.length,
      totalLinks: pagesWithBacklinks.reduce((sum, page) => sum + page.links.length, 0),
      totalBacklinks: pagesWithBacklinks.reduce((sum, page) => sum + page.backlinks.length, 0)
    });

    return res.status(200).json({
      results: pagesWithBacklinks,
      debug: {
        totalPages: pagesWithBacklinks.length,
        totalLinks: pagesWithBacklinks.reduce((sum, page) => sum + page.links.length, 0),
        totalBacklinks: pagesWithBacklinks.reduce((sum, page) => sum + page.backlinks.length, 0)
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: error.message });
  }
}