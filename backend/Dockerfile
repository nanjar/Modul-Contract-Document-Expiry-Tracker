# ============================================================
# BUILD STAGE
# ============================================================
FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable

# Copy dependency manifests
COPY package.json pnpm-lock.yaml ./

# Install all dependencies.
# Ignore lifecycle scripts because Prisma Client must be
# generated AFTER the Prisma schema is available.
RUN pnpm install \
    --frozen-lockfile \
    --dangerously-allow-all-builds \
    --ignore-scripts

# Copy Prisma schema/migrations BEFORE generating Prisma Client
COPY prisma ./prisma

# Generate Prisma Client from the actual schema
RUN pnpm exec prisma generate

# Copy application source
COPY tsconfig*.json nest-cli.json ./
COPY src ./src

# Build NestJS application
RUN pnpm build


# ============================================================
# RUNTIME STAGE
# ============================================================
FROM node:22-alpine AS runtime

WORKDIR /app

RUN corepack enable

ENV NODE_ENV=production

# Copy dependency manifests
COPY package.json pnpm-lock.yaml ./

# Install production dependencies without lifecycle scripts.
# Prisma Client is already generated in the build stage.
RUN pnpm install \
    --prod \
    --frozen-lockfile \
    --dangerously-allow-all-builds \
    --ignore-scripts

# Copy compiled application
COPY --from=build /app/dist ./dist

# Copy Prisma schema and migrations
COPY --from=build /app/prisma ./prisma

# Copy the generated Prisma client from build stage.
# With pnpm, the generated client lives inside the virtual store.
COPY --from=build /app/node_modules/.pnpm ./node_modules/.pnpm

# Recreate pnpm's node_modules links
RUN pnpm install \
    --prod \
    --frozen-lockfile \
    --dangerously-allow-all-builds \
    --ignore-scripts

EXPOSE 3001

CMD ["sh", "-c", "pnpm exec prisma migrate deploy && pnpm start:prod"]
