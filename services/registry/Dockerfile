# Minimal image for the Open MCP Registry API scaffold.
# Production would add Postgres (full-text search) behind the store interface.
FROM node:20-slim

WORKDIR /app

COPY package.json ./
COPY tsconfig.json ./
COPY packages ./packages
COPY services/registry ./services/registry

RUN npm install

EXPOSE 8090
CMD ["npm", "run", "start:registry"]
