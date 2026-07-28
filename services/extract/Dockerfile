# Minimal image for the Website Understanding API scaffold.
# Production would add a headless browser (Playwright/Chromium) for rendering.
FROM node:20-slim

WORKDIR /app

COPY package.json ./
COPY tsconfig.json ./
COPY packages ./packages
COPY services/extract ./services/extract

RUN npm install

EXPOSE 8083
CMD ["npm", "run", "start:extract"]
