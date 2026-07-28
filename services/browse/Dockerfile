# Minimal image for the Browser API scaffold.
# Production would add Playwright + Chromium and its system dependencies.
FROM node:20-slim

WORKDIR /app

COPY package.json ./
COPY tsconfig.json ./
COPY packages ./packages
COPY services/browse ./services/browse

RUN npm install

EXPOSE 8087
CMD ["npm", "run", "start:browse"]
