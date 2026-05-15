# PryroTender - AI-Powered Procurement Tender Assistant

An intelligent system that searches for procurement tenders in Rwanda, verifies requirements, and automatically generates winning proposals using Groq AI.

## Features

- 🔍 **Tender Search**: Search and filter tenders by category from Rwanda Public Procurement Authority (RPPA)
- 📋 **Requirement Verification**: Automatically extracts and analyzes tender requirements
- 🤖 **AI Proposal Generation**: Uses Groq AI to write professional, compelling proposals
- 📄 **Document Export**: Download proposals as PDF or copy to clipboard
- 🇷🇼 **Rwanda-Focused**: Tailored for Rwanda's procurement standards and context

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI**: Groq API (llama-3.3-70b-versatile)
- **Web Scraping**: Cheerio + Axios

## Getting Started

### Prerequisites

- Node.js 20+
- Groq API Key (get from [console.groq.com](https://console.groq.com))

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file and add your Groq API key:
```
GROQ_API_KEY=your_groq_api_key_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Search Tenders**: Enter a category (e.g., "IT", "Construction", "Consulting") and click Search
2. **View Tenders**: Browse available tenders with details and requirements
3. **Generate Proposal**: Click on any tender to automatically generate a professional proposal
4. **Export**: Download the proposal as PDF or copy to clipboard

## Project Structure

```
pryrotender/
├── app/
│   ├── api/
│   │   ├── tenders/route.ts          # Tender search API
│   │   └── generate-proposal/route.ts # Proposal generation API
│   ├── page.tsx                       # Main UI
│   └── layout.tsx                     # App layout
├── lib/
│   ├── scraper.ts                     # Web scraping logic
│   └── groq.ts                        # Groq AI integration
└── .env.local                         # Environment variables
```

## API Endpoints

### GET /api/tenders
Search for tenders by category
- Query params: `category` (optional)
- Returns: List of tenders with details

### POST /api/generate-proposal
Generate a proposal for a tender
- Body: `{ tenderDetails, requirements }`
- Returns: AI-generated proposal text

## Development Notes

- The scraper currently uses mock data for development
- Update the scraper logic in `lib/scraper.ts` to match actual RPPA website structure
- Groq API uses the llama-3.3-70b-versatile model for high-quality proposal generation

## Future Enhancements

- [ ] Real-time tender notifications
- [ ] Multi-language support (English, French, Kinyarwanda)
- [ ] Proposal templates and customization
- [ ] Tender tracking and deadline reminders
- [ ] Company profile management
- [ ] Historical proposal analytics

## License

MIT
