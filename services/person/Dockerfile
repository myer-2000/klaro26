# Minimal image for the People API scaffold.
FROM node:20-slim

WORKDIR /app

COPY package.json ./
COPY tsconfig.json ./
COPY packages ./packages
COPY services/person ./services/person

RUN npm install

EXPOSE 8086
CMD ["npm", "run", "start:person"]
