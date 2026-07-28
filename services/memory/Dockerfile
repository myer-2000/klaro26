# Minimal image for the Agent Memory API scaffold.
# Production would add pgvector (Postgres) and a real embedding model.
FROM node:20-slim

WORKDIR /app

COPY package.json ./
COPY tsconfig.json ./
COPY packages ./packages
COPY services/memory ./services/memory

RUN npm install

EXPOSE 8088
CMD ["npm", "run", "start:memory"]
