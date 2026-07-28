# Minimal image for the Research API scaffold.
FROM node:20-slim

WORKDIR /app

COPY package.json ./
COPY tsconfig.json ./
COPY packages ./packages
COPY services/research ./services/research

RUN npm install

EXPOSE 8084
CMD ["npm", "run", "start:research"]
