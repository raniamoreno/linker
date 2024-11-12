const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const dotenv = require('dotenv');

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const app = express();

// Update CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://linker-1lie5jjb7-as-projects-7a5e8de7.vercel.app',
    'https://linker-zeta-ivory.vercel.app',
    'https://linker-git-main-as-projects-7a5e8de7.vercel.app',
    'https://linker-eqm7rw61l-as-projects-7a5e8de7.vercel.app',
    'https://www.notion.so',
    'https://notion.so'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

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
      // Check mentions
      if (textBlock.type === 'mention' && textBlock.mention?.type === 'page') {
        links.add(textBlock.mention.page.id);
      }

      // Check inline page links
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

app.post('/api/notion/database/:databaseId/query', async (req, res) => {
  try {
    // Use NOTION_TOKEN instead of REACT_APP_NOTION_TOKEN
    const token = process.env.NOTION_TOKEN || process.env.REACT_APP_NOTION_TOKEN;
    if (!token) {
      throw new Error('Notion token not found in environment variables');
    }

    const databaseId = req.params.databaseId;
    console.log('\n1. Starting database query for:', databaseId);
    console.log('Using token starting with:', token.substring(0, 10));

    // Fetch all pages in the database
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
      throw new Error(`Failed to fetch database: ${JSON.stringify(data)}`);
    }

    console.log('\n2. Found pages:', data.results.length);

    // Process pages basic info
    const pages = data.results.map(page => {
      // First try to get title from properties
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
    console.log('\n3. Fetching page contents and references...');
    const pagesWithRefs = await Promise.all(pages.map(async (page) => {
      console.log(`\nProcessing "${page.title}" (${page.id})`);

      // Fetch page content
      const blocks = await fetchPageReferences(page.id, token);
      console.log(`Found ${blocks.length} blocks`);

      // Find links in content
      const links = findLinksInBlocks(blocks);

      // Filter links to only include pages from our database
      const validLinks = links.filter(linkId => pageMap.has(linkId));
      console.log(`Found ${validLinks.length} valid links to other pages in database`);

      if (validLinks.length > 0) {
        console.log('Links to:', validLinks.map(id => pageMap.get(id)?.title).join(', '));
      }

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

      console.log(`\nPage "${page.title}":`, {
        outgoingLinks: page.links.length,
        incomingLinks: backlinks.length
      });

      return {
        ...page,
        links: page.links,
        backlinks
      };
    });

    console.log('\n4. Summary:');
    console.log('Total pages:', pagesWithBacklinks.length);
    console.log('Total links:', pagesWithBacklinks.reduce((sum, page) => sum + page.links.length, 0));
    console.log('Total backlinks:', pagesWithBacklinks.reduce((sum, page) => sum + page.backlinks.length, 0));

    res.json({
      results: pagesWithBacklinks,
      debug: {
        totalPages: pagesWithBacklinks.length,
        totalLinks: pagesWithBacklinks.reduce((sum, page) => sum + page.links.length, 0),
        totalBacklinks: pagesWithBacklinks.reduce((sum, page) => sum + page.backlinks.length, 0),
        samplePage: pagesWithBacklinks[0]
      }
    });

  } catch (error) {
    console.error('\nServer error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3001;  // Fixed port number
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Environment check:', {
    hasToken: !!process.env.NOTION_TOKEN,
    hasReactToken: !!process.env.REACT_APP_NOTION_TOKEN,
    tokenStart: (process.env.NOTION_TOKEN || process.env.REACT_APP_NOTION_TOKEN)?.substring(0, 10),
    databaseId: process.env.REACT_APP_NOTION_DATABASE_ID,
    nodeEnv: process.env.NODE_ENV
  });
});