# syntax=docker/dockerfile:1
# Single container: Next.js + Express (serve-production.mjs). Render sets PORT at runtime.
FROM node:22-bookworm-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY packages/types/package.json ./packages/types/
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
RUN npm ci

FROM deps AS build
COPY packages/types ./packages/types
COPY apps/web ./apps/web
COPY apps/api ./apps/api
COPY serve-production.mjs ./
COPY tsconfig.json ./
RUN npm run build && npm prune --omit=dev

FROM base AS runner
ENV NODE_ENV=production
# Render injects PORT (often 10000); default for local `docker run -p 3000:3000`
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=build --chown=nextjs:nodejs /app/package.json /app/package-lock.json ./
COPY --from=build --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nextjs:nodejs /app/packages ./packages
COPY --from=build --chown=nextjs:nodejs /app/apps ./apps
COPY --from=build --chown=nextjs:nodejs /app/serve-production.mjs ./

USER nextjs
EXPOSE 3000

CMD ["node", "serve-production.mjs"]
