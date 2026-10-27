import axios from 'axios';
import * as cheerio from 'cheerio';

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

export async function scrapeTenders(category: string): Promise<Tender[]> {
  const JOB_IN_RWANDA_URL = 'https://www.jobinrwanda.com';
  const UMUCYO_URL = 'https://umucyo.gov.rw';
  
  try {
    console.log('Fetching tenders from Job in Rwanda and Umucyo...');
    
    // Use allSettled so one failure doesn't kill the other
    const [jobInRwandaResult, umucyoResult] = await Promise.allSettled([
      axios.get(`${JOB_IN_RWANDA_URL}/jobs/tender`, { 
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }),
      axios.get(`${UMUCYO_URL}/pt/pcm/moveMainPageDetail.do`, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })
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
            id: `jobinrwanda-${Date.now()}-${index}`,
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
            id: `umucyo-${Date.now()}-${index}`,
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
    
    console.log(`Successfully scraped ${tenders.length} tenders (Job in Rwanda + Umucyo)`);
    
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
    console.error('Error scraping tenders:', error);
    if (axios.isAxiosError(error)) {
      console.error('Axios error:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
      }
    }
    throw new Error('Failed to fetch tenders. Please try again later.');
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
