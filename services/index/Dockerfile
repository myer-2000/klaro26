# Minimal image for the Open Index API scaffold.
# Production would add a fetcher/extractor and pgvector (Postgres).
FROM node:20-slim

WORKDIR /app

COPY package.json ./
COPY tsconfig.json ./
COPY packages ./packages
COPY services/index ./services/index

RUN npm install

EXPOSE 8089
CMD ["npm", "run", "start:index"]
