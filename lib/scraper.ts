import axios from 'axios';
import * as cheerio from 'cheerio';
import crypto from 'crypto';

/** Generates a stable, deterministic ID from a tender's title and source.
 *  Using a hash means the same tender always gets the same ID across cron runs,
 *  which makes deduplication possible. */
function stableId(source: string, title: string): string {
  return crypto
    .createHash('md5')
    .update(`${source}::${title.toLowerCase().trim()}`)
    .digest('hex')
    .slice(0, 16);
}

export interface Tender {
  id: string;
  title: string;
  category: string;
  deadline: string;
  description: string;
  requirements: string;
  source: string;
  url: string;
  type: 'tender' | 'job';
  location?: string;
  organization?: string;
}

/** Scrapes tender listings from ImvahoNshya (Kinyarwanda news portal).
 *  URL: https://imvahonshya.co.rw/category/amatangazo/amasoko/
 *
 *  Structure: WordPress site, cards use `.news-card-two` (featured) and
 *  `.news-card-three` (list items). Each card has `h3 > a` for title+URL and
 *  `.news-metainfo li:first-child` for the published date.
 *
 *  Title pattern: "ORGANIZATION: tender description"
 *  Deadline is only inside individual articles — not shown on the listing page,
 *  so we store it as "Not specified" unless it appears in the title text.
 */
async function scrapeImvahoNshya(): Promise<Tender[]> {
  const URL = 'https://imvahonshya.co.rw/category/amatangazo/amasoko/';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  const res = await axios.get(URL, { timeout: 12000, headers });
  const $ = cheerio.load(res.data);
  const tenders: Tender[] = [];

  // Both card variants share the same inner structure
  $('.news-card-two, .news-card-three').each((_, el) => {
    try {
      const $el = $(el);
      const $a = $el.find('h3 a').first();
      const rawTitle = $a.text().trim();
      const url = $a.attr('href') || '';

      if (!rawTitle || rawTitle.length < 5 || !url) return;

      // Published date text is in the first <li> of .news-metainfo
      // Format: "30 Ukwakira 2026 Saa 13:58" (Kinyarwanda date)
      const dateText = $el.find('.news-metainfo li').first().text().trim()
        .replace(/\s+/g, ' ');

      // Split "ORGANIZATION: description" — colon separator is the convention
      const colonIdx = rawTitle.indexOf(':');
      const organization = colonIdx > 0
        ? rawTitle.slice(0, colonIdx).trim()
        : 'ImvahoNshya';
      const title = colonIdx > 0
        ? rawTitle.slice(colonIdx + 1).trim()
        : rawTitle;

      // Try to find a deadline hint inside the title (e.g. "Deadline: 15/11/2026")
      const deadlineHint = rawTitle.match(/deadline[:\s]+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i);
      const deadline = deadlineHint ? deadlineHint[1] : 'Not specified';

      tenders.push({
        id: stableId('imvahonshya', url), // URL is stable; title can be truncated
        title,
        category: 'Tender',
        deadline,
        description: `${organization} — Tender in Rwanda. Published: ${dateText}`,
        requirements: 'Visit ImvahoNshya for full tender details and requirements',
        source: 'ImvahoNshya',
        url,
        type: 'tender',
        location: 'Rwanda',
        organization,
      });
    } catch (err) {
      console.error('Error parsing ImvahoNshya card:', err);
    }
  });

  console.log(`ImvahoNshya: scraped ${tenders.length} tenders`);
  return tenders;
}

/** Parses all listings from the New Times Jobs sitemap.
 *  The sitemap is publicly accessible (no Cloudflare block) and encodes the
 *  numeric ID, title, organisation, publish date and deadline right in the URL
 *  slug, so we don't need to scrape individual pages.
 *
 *  URL pattern:
 *   /jobs/{id}-{title-slug}-at-{org-slug}-published-on-{DD-MM-YYYY}-deadline-{DD-MM-YYYY}
 */
async function scrapeNewTimesJobs(): Promise<Tender[]> {
  const SITEMAP_INDEX = 'https://jobs.newtimes.co.rw/sitemap.xml';
  const BASE_URL = 'https://jobs.newtimes.co.rw';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/xml, text/xml, */*',
  };

  // 1. Fetch the sitemap index to find the current jobs sitemap URL
  const indexRes = await axios.get(SITEMAP_INDEX, { timeout: 10000, headers });
  const $index = cheerio.load(indexRes.data, { xmlMode: true });
  const jobsSitemapUrl = $index('loc').filter((_, el) => $index(el).text().includes('/sitemaps/jobs/')).first().text().trim();

  if (!jobsSitemapUrl) {
    console.warn('New Times: could not find jobs sitemap URL in index');
    return [];
  }

  // 2. Fetch the jobs sitemap
  const sitemapRes = await axios.get(jobsSitemapUrl, { timeout: 15000, headers });
  const $sitemap = cheerio.load(sitemapRes.data, { xmlMode: true });

  const tenders: Tender[] = [];

  $sitemap('url').each((_, el) => {
    try {
      const loc = $sitemap(el).find('loc').text().trim();
      const lastmod = $sitemap(el).find('lastmod').text().trim();

      if (!loc || loc === BASE_URL) return; // skip the homepage entry

      // Extract the path segment after /jobs/
      const pathMatch = loc.match(/\/jobs\/(.+)$/);
      if (!pathMatch) return;

      const slug = pathMatch[1];

      // Numeric job ID is the leading digits before the first dash
      const idMatch = slug.match(/^(\d+)-/);
      if (!idMatch) return;
      const numericId = idMatch[1];

      // ---------- Parse deadline ----------
      // Pattern: -deadline-DD-MM-YYYY  (always at the end)
      const deadlineMatch = slug.match(/-deadline-(\d{2}-\d{2}-\d{4})$/);
      const deadline = deadlineMatch ? deadlineMatch[1] : (lastmod ? lastmod.split('T')[0] : 'Not specified');

      // ---------- Parse published date (embedded in slug, not stored currently) ----------
      // const publishedMatch = slug.match(/-published-on-(\d{2}-\d{2}-\d{4})/);

      // ---------- Parse organisation ----------
      // Pattern: -at-{org-slug}-published-on-
      const orgMatch = slug.match(/-at-(.+?)-published-on-/);
      const organization = orgMatch
        ? orgMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        : 'New Times Rwanda';

      // ---------- Parse title ----------
      // Everything between the numeric ID and the -at-{org} part
      const titleSlugMatch = slug.match(/^\d+-(.+?)-at-/);
      const rawTitle = titleSlugMatch
        ? titleSlugMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        : slug.replace(/-/g, ' ');

      if (rawTitle.length < 5) return;

      // Detect whether it's a tender or a job.
      // First check the title for common tender keywords; fall back to org-name signals.
      const lowerTitle = rawTitle.toLowerCase();
      const lowerOrg = organization.toLowerCase();
      const isTender =
        lowerTitle.includes('tender') ||
        lowerTitle.includes('bid') ||
        lowerTitle.includes('procurement') ||
        lowerTitle.includes('request for') ||
        lowerTitle.includes('supply') ||
        lowerTitle.includes('construction') ||
        lowerTitle.includes('consultancy') ||
        lowerTitle.includes('invitation') ||
        lowerTitle.includes('expression of interest') ||
        lowerTitle.includes('framework agreement') ||
        lowerTitle.includes('sale of') ||
        lowerTitle.includes('hiring') ||
        lowerTitle.includes('assessment') ||
        lowerTitle.includes('remodelling') ||
        lowerTitle.includes('remodeling') ||
        lowerTitle.includes('proof of concept') ||
        lowerTitle.includes('development of') ||
        lowerTitle.includes('design of') ||
        lowerTitle.includes('programme') ||
        lowerTitle.includes('project') ||
        lowerTitle.includes('services for') ||
        lowerTitle.includes('services at') ||
        lowerTitle.includes('delivery of') ||
        lowerTitle.includes('installation') ||
        lowerTitle.includes('provision of') ||
        lowerTitle.includes('open competitive') ||
        lowerTitle.includes('independent power') ||
        lowerTitle.includes('foundational') ||
        lowerTitle.includes('is looking for its') ||
        // Government / parastatal orgs almost always post tenders, not jobs
        lowerOrg.includes('agency') ||
        lowerOrg.includes('authority') ||
        lowerOrg.includes('ministry') ||
        lowerOrg.includes('government') ||
        lowerOrg.includes('eucl') ||
        lowerOrg.includes('wasac') ||
        lowerOrg.includes('rdb') ||
        lowerOrg.includes('rwandair');

      tenders.push({
        id: stableId('newtimes', numericId), // use numeric ID for stability
        title: rawTitle,
        category: isTender ? 'Tender' : 'Job',
        deadline,
        description: `${organization} — ${isTender ? 'Tender' : 'Job'} in Rwanda`,
        requirements: 'Visit New Times Jobs portal for full details and requirements',
        source: 'New Times Jobs',
        url: loc,
        type: isTender ? 'tender' : 'job',
        location: 'Rwanda',
        organization,
      });
    } catch (err) {
      console.error('Error parsing New Times sitemap entry:', err);
    }
  });

  console.log(`New Times Jobs: scraped ${tenders.length} listings from sitemap`);
  return tenders;
}

/** Parses a single Umucyo listing page HTML into Tender[] objects.
 *  The listing page uses a <table> with <tbody> rows; each row has a radio
 *  input whose value encodes: "tenderId|title|orgCode|deadline|stage|method|type|openDate|status" */
function parseUmucyoPageHtml(html: string): Tender[] {
  const UMUCYO_URL = 'https://umucyo.gov.rw';
  const $ = cheerio.load(html);
  const tenders: Tender[] = [];

  const categoryMap: Record<string, string> = {
    G: 'Goods',
    C: 'Consultant Services',
    NC: 'Non Consultant Services',
    W: 'Works',
  };

  $('table tbody tr').each((_, element) => {
    try {
      const $el = $(element);

      const radioVal = $el.find('input[type="radio"][name="tenderNo"]').val() as string | undefined;
      const parts = radioVal ? radioVal.split('|') : [];
      const tenderId = parts[0] || '';
      const titleFromRadio = parts[1] || '';
      const deadline = parts[3] || 'Not specified';
      const tenderType = parts[6] || '';

      const linkTitle = $el.find('a[href*="ViewDetail"]').text().trim();
      const title = (titleFromRadio || linkTitle || '').trim();

      if (!title || title.length < 5) return;

      const category = categoryMap[tenderType] || 'Tender';

      const refText = $el.find('td').eq(2).text().trim();
      const orgFromRef = refText.split('/').pop()?.trim() || 'Government of Rwanda';

      tenders.push({
        id: stableId('umucyo', tenderId || title),
        title,
        category,
        deadline,
        description: `${orgFromRef} - ${category} - Government of Rwanda`,
        requirements: 'Official government tender - visit Umucyo for full details',
        source: 'Umucyo (Gov)',
        url: tenderId
          ? `${UMUCYO_URL}/eb/bav/selectAdvertisingDtlInfo.do?tendReferNo=${encodeURIComponent(tenderId)}`
          : `${UMUCYO_URL}/eb/bav/selectListAdvertisingListForGU.do`,
        type: 'tender',
        location: 'Rwanda',
        organization: orgFromRef,
      });
    } catch (err) {
      console.error('Error parsing Umucyo row:', err);
    }
  });

  return tenders;
}

/** Searches Umucyo by tender name using the site's built-in search API.
 *  The endpoint `selectListAdvertisingListForGU.do?tendNm=<keyword>` returns
 *  matching tenders across ALL pages of the full listing (not just the first
 *  few pages), so we can find tenders that are too old to appear in the
 *  default page-1-through-4 scrape. */
async function searchUmucyoTenders(searchTerm: string): Promise<Tender[]> {
  const UMUCYO_SEARCH_URL = 'https://umucyo.gov.rw/eb/bav/selectListAdvertisingListForGU.do';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  };

  try {
    const res = await axios.get(UMUCYO_SEARCH_URL, {
      params: { tendNm: searchTerm },
      timeout: 15000,
      headers,
    });
    const tenders = parseUmucyoPageHtml(res.data);
    console.log(`Umucyo search for "${searchTerm}": found ${tenders.length} tenders`);
    return tenders;
  } catch (err) {
    console.error(`Umucyo search failed for "${searchTerm}":`, err);
    return [];
  }
}

export async function scrapeTenders(category: string): Promise<Tender[]> {
  const JOB_IN_RWANDA_URL = 'https://www.jobinrwanda.com';
  const UMUCYO_URL = 'https://umucyo.gov.rw';
  
  try {
    console.log('Fetching tenders from Job in Rwanda, Umucyo, New Times Jobs and ImvahoNshya...');
    
    // Fetch all sources concurrently. Umucyo uses 4 pages via the full listing
    // endpoint which supports ?currentPageNo=N as a GET parameter.
    const UMUCYO_PAGES = 4;
    const umucyoPageUrls = Array.from({ length: UMUCYO_PAGES }, (_, i) =>
      `${UMUCYO_URL}/eb/bav/selectListAdvertisingListForGU.do?currentPageNo=${i + 1}`
    );

    // Use allSettled so one failure doesn't kill the others
    const [
      jobInRwandaResult,
      newTimesResult,
      imvahoNshyaResult,
      ...umucyoPageResults
    ] = await Promise.allSettled([
      axios.get(`${JOB_IN_RWANDA_URL}/jobs/tender`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }),
      scrapeNewTimesJobs(),
      scrapeImvahoNshya(),
      ...umucyoPageUrls.map(url => axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })),
    ]);
    
    const tenders: Tender[] = [];
    
    // Parse Job in Rwanda tenders
    if (jobInRwandaResult.status === 'rejected') {
      console.error('Job in Rwanda fetch failed:', jobInRwandaResult.reason?.message);
    } else {
    console.log('Parsing Job in Rwanda tenders...');
    const $jobInRwanda = cheerio.load(jobInRwandaResult.value.data);
    
    $jobInRwanda('.views-row').each((index, element) => {
      try {
        const $el = $jobInRwanda(element);
        const title = $el.find('h5.card-title, .card-title').text().trim();
        const url = $el.find('a').first().attr('href') || '';
        const cardBody = $el.find('.card-body').text();
        
        let organization = '';
        let location = '';
        let deadline = '';
        
        const lines = cardBody.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          if (line.includes('|') && !line.includes('Published')) {
            const parts = line.split('|').map(p => p.trim());
            if (parts.length >= 2) {
              organization = parts[0];
              location = parts[1];
            }
          }
          
          if (line.toLowerCase().includes('deadline')) {
            if (i + 1 < lines.length && lines[i + 1].match(/\d{2}-\d{2}-\d{4}/)) {
              deadline = lines[i + 1];
            }
          }
        }
        
        if (title && title.length > 10) {
          tenders.push({
            id: stableId('jobinrwanda', title),
            title: title,
            category: 'Tender',
            deadline: deadline || 'Not specified',
            description: organization && location ? `${organization} - ${location}` : (organization || location || 'Rwanda'),
            requirements: 'Click to view full tender details and requirements',
            source: 'Job in Rwanda',
            url: url.startsWith('http') ? url : `${JOB_IN_RWANDA_URL}${url}`,
            type: 'tender',
            location: location || 'Rwanda',
            organization: organization || 'Not specified'
          });
        }
      } catch (err) {
        console.error('Error parsing Job in Rwanda tender:', err);
      }
    });
    } // end jobInRwanda else
    
    // Parse Umucyo tenders from all fetched pages using the shared helper
    let umucyoPagesParsed = 0;
    for (let pi = 0; pi < umucyoPageResults.length; pi++) {
      const pageResult = umucyoPageResults[pi];
      if (pageResult.status === 'rejected') {
        console.error(`Umucyo page ${pi + 1} fetch failed:`, (pageResult as PromiseRejectedResult).reason?.message);
        continue;
      }

      console.log(`Parsing Umucyo page ${pi + 1}...`);
      const pageTenders = parseUmucyoPageHtml(pageResult.value.data);
      tenders.push(...pageTenders);
      console.log(`Umucyo page ${pi + 1}: parsed ${pageTenders.length} tenders`);
      umucyoPagesParsed += pageTenders.length;
    }
    console.log(`Umucyo total: ${umucyoPagesParsed} tenders across ${umucyoPageResults.length} pages`);

    // Merge New Times Jobs listings
    if (newTimesResult.status === 'rejected') {
      console.error('New Times Jobs scrape failed:', (newTimesResult as PromiseRejectedResult).reason?.message);
    } else {
      tenders.push(...newTimesResult.value);
    }

    // Merge ImvahoNshya listings
    if (imvahoNshyaResult.status === 'rejected') {
      console.error('ImvahoNshya scrape failed:', (imvahoNshyaResult as PromiseRejectedResult).reason?.message);
    } else {
      tenders.push(...imvahoNshyaResult.value);
    }
    
    console.log(`Successfully scraped ${tenders.length} tenders (Job in Rwanda + Umucyo + New Times Jobs + ImvahoNshya)`);
    
    // Filter by category if specified
    if (category && category.trim().length > 0) {
      const searchTerm = category.toLowerCase().trim();
      const filtered = tenders.filter(t => 
        t.title.toLowerCase().includes(searchTerm) ||
        t.category.toLowerCase().includes(searchTerm) ||
        t.description.toLowerCase().includes(searchTerm) ||
        (t.organization && t.organization.toLowerCase().includes(searchTerm)) ||
        (t.location && t.location.toLowerCase().includes(searchTerm))
      );
      console.log(`Filtered to ${filtered.length} tenders matching "${category}"`);
      return filtered;
    }
    
    return tenders;
  } catch (error) {
    // Never throw to the caller — a scraping failure should degrade gracefully,
    // not crash the RSC stream and break navigation to other routes.
    console.error('Error scraping tenders:', error);
    if (axios.isAxiosError(error)) {
      console.error('Axios error:', error.message, error.response?.status);
    }
    return [];
  }
}

/** Searches for tenders matching a query across all sources.
 *
 *  Unlike `scrapeTenders` which only grabs the latest 4 pages from Umucyo's
 *  default listing, this function uses Umucyo's built-in search API
 *  (`?tendNm=<keyword>`) which searches across ALL 39,000+ tenders — not just
 *  the first 40. This ensures that older tenders (like one published a week
 *  ago that has since been pushed off page 4) are still findable.
 *
 *  For Job in Rwanda, New Times, and ImvahoNshya, we scrape the default
 *  listing and filter client-side since those sources don't expose a search
 *  API that's easy to call.
 */
export async function searchTenders(query: string): Promise<Tender[]> {
  const JOB_IN_RWANDA_URL = 'https://www.jobinrwanda.com';
  const searchTerm = query.trim().toLowerCase();

  if (!searchTerm) return scrapeTenders('');

  try {
    console.log(`Searching tenders for "${query}"...`);

    // Run Umucyo search + other source scrapes concurrently
    const [umucyoSearchResult, jobInRwandaResult, newTimesResult, imvahoNshyaResult] =
      await Promise.allSettled([
        searchUmucyoTenders(searchTerm),
        axios.get(`${JOB_IN_RWANDA_URL}/jobs/tender`, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        }),
        scrapeNewTimesJobs(),
        scrapeImvahoNshya(),
      ]);

    const tenders: Tender[] = [];

    // 1. Umucyo search results (already filtered by the API)
    if (umucyoSearchResult.status === 'fulfilled') {
      tenders.push(...umucyoSearchResult.value);
    } else {
      console.error('Umucyo search failed:', umucyoSearchResult.reason?.message);
    }

    // 2. Job in Rwanda — scrape and filter
    if (jobInRwandaResult.status === 'fulfilled') {
      const $ = cheerio.load(jobInRwandaResult.value.data);
      $('.views-row').each((_, element) => {
        try {
          const $el = $(element);
          const title = $el.find('h5.card-title, .card-title').text().trim();
          const url = $el.find('a').first().attr('href') || '';
          const cardBody = $el.find('.card-body').text();

          let organization = '';
          let location = '';
          let deadline = '';

          const lines = cardBody.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('|') && !line.includes('Published')) {
              const parts = line.split('|').map(p => p.trim());
              if (parts.length >= 2) {
                organization = parts[0];
                location = parts[1];
              }
            }
            if (line.toLowerCase().includes('deadline')) {
              if (i + 1 < lines.length && lines[i + 1].match(/\d{2}-\d{2}-\d{4}/)) {
                deadline = lines[i + 1];
              }
            }
          }

          const haystack = `${title} ${organization} ${location}`.toLowerCase();
          if (title && title.length > 10 && haystack.includes(searchTerm)) {
            tenders.push({
              id: stableId('jobinrwanda', title),
              title,
              category: 'Tender',
              deadline: deadline || 'Not specified',
              description: organization && location ? `${organization} - ${location}` : (organization || location || 'Rwanda'),
              requirements: 'Click to view full tender details and requirements',
              source: 'Job in Rwanda',
              url: url.startsWith('http') ? url : `${JOB_IN_RWANDA_URL}${url}`,
              type: 'tender',
              location: location || 'Rwanda',
              organization: organization || 'Not specified',
            });
          }
        } catch (err) {
          console.error('Error parsing Job in Rwanda tender:', err);
        }
      });
    }

    // 3. New Times Jobs — filter by search term
    if (newTimesResult.status === 'fulfilled') {
      const filtered = newTimesResult.value.filter(t => {
        const haystack = `${t.title} ${t.organization ?? ''} ${t.category}`.toLowerCase();
        return haystack.includes(searchTerm);
      });
      tenders.push(...filtered);
    }

    // 4. ImvahoNshya — filter by search term
    if (imvahoNshyaResult.status === 'fulfilled') {
      const filtered = imvahoNshyaResult.value.filter(t => {
        const haystack = `${t.title} ${t.organization ?? ''} ${t.category}`.toLowerCase();
        return haystack.includes(searchTerm);
      });
      tenders.push(...filtered);
    }

    console.log(`Search for "${query}": found ${tenders.length} tenders`);
    return tenders;
  } catch (error) {
    console.error('Error searching tenders:', error);
    return [];
  }
}

export async function getTenderDetails(url: string): Promise<string> {
  try {
    const response = await axios.get(url, { timeout: 10000 });
    const $ = cheerio.load(response.data);
    
    // Extract detailed requirements
    const requirements = $('.field-name-body').text().trim() || 
                        $('.node-content').text().trim() ||
                        $('.content').text().trim() ||
                        $('body').text().trim();
    
    return requirements;
  } catch (error) {
    console.error('Error fetching tender details:', error);
    return 'Unable to fetch detailed requirements';
  }
}
