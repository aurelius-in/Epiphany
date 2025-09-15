FROM node:20-alpine
WORKDIR /app

# Install deps
COPY services/api/package.json ./package.json
RUN npm install --production=false

# Build
COPY services/api/tsconfig.json ./tsconfig.json
COPY services/api/src ./src
RUN npx tsup src/index.ts --dts --format esm,cjs --splitting false

ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/index.js"]
