FROM node:20-alpine
WORKDIR /app

# Install deps
COPY apps/web/package.json ./package.json
RUN npm install --production=false

# Build
COPY apps/web .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start", "-p", "3000"]
