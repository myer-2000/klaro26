# Minimal image for the Video Knowledge API scaffold.
# Production would add ffmpeg + a transcription runtime (or call a provider).
FROM node:20-slim

WORKDIR /app

# ffmpeg is needed once real audio extraction is wired in.
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

COPY package.json ./
COPY tsconfig.json ./
COPY packages ./packages
COPY services/video ./services/video

RUN npm install

EXPOSE 8080
CMD ["npm", "run", "start:video"]
