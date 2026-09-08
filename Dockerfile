FROM node:22 AS base
WORKDIR /app
COPY package*.json ./

FROM base AS deps
RUN npm ci --ignore-scripts --no-audit --no-fund

FROM base AS build

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM node:22 AS production

WORKDIR /app

RUN groupadd -r appgroup && useradd -r -g appgroup -m appuser

COPY --chown=appuser:appgroup --chmod=555 --from=deps /app/node_modules /app/node_modules
COPY --chown=appuser:appgroup --chmod=555 --from=build /app/dist /app/dist
COPY --chown=appuser:appgroup --chmod=555 --from=build /app/package.json /app/package.json

RUN mkdir -p /app/logs && chown -R appuser:appgroup /app/logs

ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

USER appuser

CMD ["node", "dist/src/index.js"]