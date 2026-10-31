import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function GET() {
  try {
    const res = await axios.get('https://umucyo.gov.rw/pt/pcm/moveMainPageDetail.do', {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    const $ = cheerio.load(res.data);
    const cats = new Set<string>();
    $('#content1 ul.notice li').each((_, el) => {
      const cat = $(el).find('span.class').attr('title') || $(el).find('span.class').text().trim();
      if (cat) cats.add(cat);
    });
    return NextResponse.json({ categories: Array.from(cats) });
  } catch {
    return NextResponse.json({ categories: [] });
  }
}
