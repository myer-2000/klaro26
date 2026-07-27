# Minimal image for the Universal Document API scaffold.
# Production would add parsing/OCR system deps (e.g. poppler, tesseract).
FROM node:20-slim

WORKDIR /app

COPY package.json ./
COPY tsconfig.json ./
COPY packages ./packages
COPY services/document ./services/document

RUN npm install

EXPOSE 8081
CMD ["npm", "run", "start:document"]
