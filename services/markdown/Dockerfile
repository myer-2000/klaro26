# Minimal image for the Everything → Markdown API scaffold.
FROM node:20-slim

WORKDIR /app

COPY package.json ./
COPY tsconfig.json ./
COPY packages ./packages
COPY services/markdown ./services/markdown

RUN npm install

EXPOSE 8082
CMD ["npm", "run", "start:markdown"]
