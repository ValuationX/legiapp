# Node image shared by the API and the ingestion worker (command set per service
# in docker-compose). Runs TypeScript directly via tsx.
FROM node:22-slim

WORKDIR /app

# Install workspace dependencies first (better layer caching).
COPY package.json package-lock.json* ./
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/ingest/package.json apps/ingest/
COPY apps/web/package.json apps/web/
RUN npm install

COPY . .

CMD ["npm", "run", "start", "-w", "@legiapp/api"]
