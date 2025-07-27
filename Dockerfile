# Use Apify's Node.js base image with Puppeteer
FROM apify/actor-node-puppeteer-chrome:20

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production --no-audit && \
    echo "Installed NPM packages:" && \
    npm list --prod --depth=0 && \
    echo "Node.js version: $(node --version)" && \
    echo "NPM version: $(npm --version)"

# Copy source code
COPY . ./

# Run the actor
CMD ["npm", "start"]