# YouTube Channel Scraper

A powerful Apify actor that extracts detailed information from YouTube channels with support for **batch processing** via CSV/Excel files.

## Features

### Core Features
- **Channel Information**
  - Channel name and subscriber count
  - Total view count and video count
  - Join date and location
  - Channel description
  - Profile image URL
  - Verification status (Verified, Official Artist Channel, or unverified)

- **Contact Information**
  - Email addresses extracted from channel descriptions
  - Phone numbers from channel descriptions

- **Social Media Links**
  - Instagram, Twitter/X, Facebook, LinkedIn
  - TikTok, Twitch, Reddit, Pinterest
  - Spotify, SoundCloud, OnlyFans, Discord, Patreon, GitHub
  - Custom website URLs

### Batch Processing Features 🆕
- **CSV Import**: Upload CSV files containing channel URLs
- **Excel Import**: Upload .xlsx files containing channel URLs
- **Progress Tracking**: Real-time progress updates for large batches
- **Partial Results**: Saves results incrementally during processing
- **Resume Capability**: Continue from where a failed run stopped
- **Large Scale Support**: Process up to 10,000 channels per run

## Input Configuration

### Method 1: Direct URLs
```json
{
  "startUrls": [
    { "url": "https://www.youtube.com/@MrBeast" },
    { "url": "https://www.youtube.com/c/PewDiePie" },
    { "url": "https://www.youtube.com/channel/UCX6OQ3DkcsbYNE6H8uQQuVA" }
  ]
}
```

### Method 2: Keyword Search
```json
{
  "keywords": ["react tutorials", "javascript", "web development"],
  "limit": 10
}
```

### Method 3: CSV/Excel Import
```json
{
  "csvFile": "channels.csv",
  "maxChannelsPerRun": 1000,
  "savePartialResults": true
}
```

#### CSV Format Example:
```csv
channel_url,channel_name,notes
https://www.youtube.com/@MrBeast,MrBeast,Main channel
@PewDiePie,PewDiePie,Gaming channel
https://www.youtube.com/channel/UCxxxxx,Channel Name,Using channel ID
```

### Input Parameters

- `startUrls` (array): Direct YouTube channel URLs to scrape
- `keywords` (array): Search keywords to find YouTube channels
- `limit` (number): Maximum results per keyword (default: 5)
- `csvFile` (string): CSV file key for batch import
- `excelFile` (string): Excel file key for batch import
- `maxChannelsPerRun` (number): Maximum channels to process (default: 1000, max: 10000)
- `savePartialResults` (boolean): Save results after each channel (default: true)
- `resumeFromChannel` (string): Resume from specific channel URL
- `maxRequestsPerCrawl` (number): Maximum pages to process
- `requestHandlerTimeoutSecs` (number): Page processing timeout (default: 30)
- `maxRequestRetries` (number): Retry attempts for failed requests (default: 3)
- `minConcurrency` (number): Minimum parallel requests (default: 1)
- `maxConcurrency` (number): Maximum parallel requests (default: 2)
- `proxyConfiguration` (object): Proxy settings (recommended)

## Output

The actor outputs comprehensive channel data:

```json
{
  "channelURL": "https://www.youtube.com/@MrBeast",
  "channelName": "MrBeast",
  "channelSubscriberCount": 240000000,
  "channelVideosCount": 788,
  "joinedDate": "Feb 20, 2012",
  "totalViewCount": 45678901234,
  "channelLocation": "United States",
  "channelDescription": "I want to make the world a better place...",
  "channelProfileImageURL": "https://yt3.ggpht.com/...",
  "channelEmail": ["contact@mrbeast.com"],
  "channelPhone": [],
  "instagramUrls": ["https://instagram.com/mrbeast"],
  "twitterUrls": ["https://twitter.com/MrBeast"],
  "facebookUrls": ["https://facebook.com/MrBeast"],
  "linkedinUrls": [],
  "tiktokUrls": ["https://tiktok.com/@mrbeast"],
  "discordUrls": ["https://discord.gg/mrbeast"],
  "websiteUrls": ["https://mrbeast.com", "https://shopmrbeast.com"],
  "verifiedCategory": "Verified",
  "scrapedAt": "2024-01-01T00:00:00.000Z",
  "processingTime": 2345,
  "dataSource": "ytInitialData"
}
```

## Use Cases

- **Marketing Research**: Analyze competitor channels and their social media presence
- **Influencer Outreach**: Find contact information for collaboration
- **Market Analysis**: Track channel growth and engagement metrics
- **Lead Generation**: Extract business contact information
- **Social Media Mapping**: Discover cross-platform presence

## Known Limitations

- Subscriber/view counts may show as 0 due to YouTube's dynamic loading (fix in progress)
- Some channels may require multiple retries due to rate limiting
- Email/phone extraction depends on channels including this in their description

## Development

### Prerequisites
- Node.js 20+
- NPM or Yarn

### Installation
```bash
npm install
```

### Running Locally
```bash
# With Apify CLI
apify run

# Or directly
npm start
```

### Testing with CSV
Create a `test_channels.csv` file and run:
```bash
apify run --input-file=INPUT.json
```

Where INPUT.json contains:
```json
{
  "csvFile": "test_channels.csv"
}
```

## Deployment

Deploy to Apify platform:

```bash
# Install Apify CLI
npm i -g apify-cli

# Login to Apify
apify login

# Deploy the actor
apify push
```

## Legal Considerations

Note that personal data is protected by GDPR in the European Union and by other regulations around the world. You should not scrape personal data unless you have a legitimate reason to do so. If you're unsure whether your reason is legitimate, consult your lawyers. We also recommend that you read our blog post: [Is web scraping legal?](https://blog.apify.com/is-web-scraping-legal/)

## Support

For issues and feature requests, please create an issue in the repository.

## License

MIT

---

Built with [Apify SDK](https://sdk.apify.com/) and [Crawlee](https://crawlee.dev/)