FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY prisma/ ./prisma/
RUN npx prisma generate
COPY src/ ./src/
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache curl
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist
COPY prisma/ ./prisma/
RUN npx prisma generate
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:4000/api/health || exit 1
CMD ["node", "dist/server.js"]
