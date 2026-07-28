# Minimal image for the Company Intelligence API scaffold.
FROM node:20-slim

WORKDIR /app

COPY package.json ./
COPY tsconfig.json ./
COPY packages ./packages
COPY services/company ./services/company

RUN npm install

EXPOSE 8085
CMD ["npm", "run", "start:company"]
