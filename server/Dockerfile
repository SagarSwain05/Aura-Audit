FROM node:20-alpine

WORKDIR /app

# Cache dependency layer
COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps

COPY . .

EXPOSE 10000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- "http://localhost:${PORT:-5001}/health" || exit 1

CMD ["node", "src/index.js"]
