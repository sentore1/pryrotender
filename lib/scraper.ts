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

export async function scrapeTenders(category: string): Promise<Tender[]> {
  const JOB_IN_RWANDA_URL = 'https://www.jobinrwanda.com';
  const UMUCYO_URL = 'https://umucyo.gov.rw';
  
  try {
    console.log('Fetching tenders from Job in Rwanda, Umucyo, New Times Jobs and ImvahoNshya...');
    
    // Use allSettled so one failure doesn't kill the other
    const [jobInRwandaResult, umucyoResult, newTimesResult, imvahoNshyaResult] = await Promise.allSettled([
      axios.get(`${JOB_IN_RWANDA_URL}/jobs/tender`, { 
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }),
      axios.get(`${UMUCYO_URL}/pt/pcm/moveMainPageDetail.do`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }),
      scrapeNewTimesJobs(),
      scrapeImvahoNshya(),
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
    
    // Parse Umucyo tenders
    if (umucyoResult.status === 'rejected') {
      console.error('Umucyo fetch failed:', umucyoResult.reason?.message);
    } else {
    console.log('Parsing Umucyo tenders...');
    const $umucyo = cheerio.load(umucyoResult.value.data);
    
    $umucyo('#content1 ul.notice li').each((index, element) => {
      try {
        const $el = $umucyo(element);
        // Second span holds the full title in its title attribute
        const title = $el.find('span[title]').not('.class').attr('title') || $el.find('span[title]').last().attr('title') || '';
        const tenderCategory = $el.find('span.class').attr('title') || $el.find('span.class').text().trim();
        const dateText = $el.find('span.Date').text().trim();
        const onclickAttr = $el.find('a').attr('onclick') || '';
        
        // Their site has a typo: "javacsript:" — match both
        const tenderIdMatch = onclickAttr.match(/fn_viewTendNtceDetail\('([^']+)'/);
        const tenderId = tenderIdMatch ? tenderIdMatch[1] : '';
        
        if (title && title.length > 10 && !title.includes('Load data')) {
          tenders.push({
            id: stableId('umucyo', title),
            title: title,
            category: tenderCategory || 'Tender',
            deadline: dateText || 'Not specified',
            description: `Government of Rwanda - ${tenderCategory || 'Procurement'}`,
            requirements: 'Official government tender - visit Umucyo for full details',
            source: 'Umucyo (Gov)',
            url: tenderId ? `${UMUCYO_URL}/eb/bav/selectListAdvertisingListForGU.do?tendReferNo=${tenderId}` : UMUCYO_URL,
            type: 'tender',
            location: 'Rwanda',
            organization: 'Government of Rwanda'
          });
        }
      } catch (err) {
        console.error('Error parsing Umucyo tender:', err);
      }
    });
    } // end umucyo else

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
