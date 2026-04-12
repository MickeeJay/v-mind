FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY agent/package.json ./agent/package.json

RUN npm ci

COPY agent ./agent

RUN npm run build --workspace=agent

FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY agent/package.json ./agent/package.json

RUN npm ci --omit=dev --workspace=agent && npm cache clean --force

COPY --from=builder /app/agent/dist ./agent/dist

RUN addgroup -S vmind && adduser -S vmind -G vmind

WORKDIR /app/agent

USER vmind

EXPOSE 8080
EXPOSE 9090

CMD ["node", "dist/index.js"]
