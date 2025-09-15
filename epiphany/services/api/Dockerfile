FROM node:20-alpine AS deps
WORKDIR /app
COPY services/api/package.json ./package.json
RUN npm install --production=false

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY services/api/package.json ./package.json
COPY epiphany/ops/prisma /app/ops/prisma
RUN npm install prisma@5.17.0 --no-save
RUN npx prisma generate --schema=/app/ops/prisma/schema.prisma
COPY services/api/tsconfig.json ./tsconfig.json
COPY services/api/src ./src
RUN npx tsup src/index.ts --dts --format esm,cjs --splitting false

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
EXPOSE 4000
CMD ["node", "dist/index.js"]
