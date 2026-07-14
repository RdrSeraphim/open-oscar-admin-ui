# syntax=docker/dockerfile:1
# check=error=true

# base
FROM node:lts-alpine AS base
WORKDIR /app

RUN apk add --no-cache libc6-compat
RUN corepack enable

# deps
FROM base AS deps

COPY package.json yarn.lock ./

RUN --mount=type=cache,target=/root/.yarn/berry/cache \
    yarn install --immutable

# building
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN sed -i 's/NextConfig = {/NextConfig = { output: "standalone",/' next.config.ts

ENV NEXT_TELEMETRY_DISABLED=1
RUN yarn build

# running
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

COPY --from=builder --chown=nodejs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nodejs:nodejs /app/.next/static ./.next/static

USER nodejs
EXPOSE 3000
CMD ["node", "server.js"]
