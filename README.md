# YouTube Channel Scraper

An Apify actor that extracts detailed information from YouTube channel about pages.

## Features

This scraper accepts YouTube channel URLs as input and returns comprehensive data about the channels:

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
  - Spotify, SoundCloud, OnlyFans, and more

- **Search Capabilities**
  - Search for channels by keywords
  - Process multiple channels in batch
  - Direct URL input support

## Input Configuration

```json
{
  "keywords": ["react", "javascript"],
  "limit": 5,
  "startUrls": [
    { "url": "https://www.youtube.com/channel/UCxxxxx" }
  ],
  "maxRequestsPerCrawl": 100,
  "proxyConfiguration": {
    "useApifyProxy": true
  }
}
```

### Input Parameters

- `keywords` (array): Search keywords to find YouTube channels
- `limit` (number): Maximum results per keyword (default: 5)
- `startUrls` (array): Direct YouTube channel URLs to scrape
- `maxRequestsPerCrawl` (number): Maximum pages to process
- `requestHandlerTimeoutSecs` (number): Page processing timeout (default: 30)
- `maxRequestRetries` (number): Retry attempts for failed requests (default: 3)
- `minConcurrency` (number): Minimum parallel requests (default: 1)
- `maxConcurrency` (number): Maximum parallel requests (default: 100)
- `proxyConfiguration` (object): Proxy settings

## Output

The actor outputs data in the following format:

```json
{
  "channelURL": "https://www.youtube.com/channel/UCxxxxx",
  "channelName": "Channel Name",
  "channelSubscriberCount": 123000,
  "channelVideosCount": 456,
  "joinedDate": "Jan 1, 2020",
  "totalViewCount": 7890000,
  "channelLocation": "United States",
  "channelDescription": "Channel description...",
  "channelProfileImageURL": "https://yt3.ggpht.com/...",
  "channelEmail": ["contact@example.com"],
  "channelPhone": [],
  "youtubeUrls": [],
  "instagramUrls": ["https://instagram.com/channel"],
  "twitterUrls": ["https://twitter.com/channel"],
  "facebookUrls": [],
  "linkedinUrls": [],
  "verifiedCategory": "Verified",
  "scrapedAt": "2024-01-01T00:00:00.000Z",
  "processingTime": 1234
}
```

## Legal Considerations

Note that personal data is protected by GDPR in the European Union and by other regulations around the world. You should not scrape personal data unless you have a legitimate reason to do so. If you're unsure whether your reason is legitimate, consult your lawyers. We also recommend that you read our blog post: [Is web scraping legal?](https://blog.apify.com/is-web-scraping-legal/)

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
npm start
```

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Enable verbose logging
VERBOSE_LOG=true

# Apify token (for deployment)
APIFY_TOKEN=your_token_here
```

## Deployment

This actor can be deployed to the Apify platform:

1. Install Apify CLI: `npm i -g apify-cli`
2. Login: `apify login`
3. Deploy: `apify push`

## Support

For issues and feature requests, please create an issue in the repository.

## License

MIT

---

Built with [Apify SDK](https://sdk.apify.com/)