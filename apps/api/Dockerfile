# Build from the repository root:
# docker build -f apps/api/Dockerfile -t dnd-dcorp-api .
FROM node:22-bookworm-slim AS build
WORKDIR /app/apps/api

COPY apps/api/package*.json ./
RUN npm install

COPY apps/api/ ./
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app/apps/api

COPY --from=build /app/apps/api/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/prisma ./prisma
COPY --from=build /app/apps/api/package.json ./package.json

EXPOSE 3000
CMD ["npm", "run", "start"]
