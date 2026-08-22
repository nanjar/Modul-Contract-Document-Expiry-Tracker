FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json ./
RUN pnpm install --no-frozen-lockfile
COPY . .
ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_NOTIFICATION_EMAIL_MODE=configured-by-deployment
ENV NEXT_PUBLIC_NOTIFICATION_EMAIL_MODE=$NEXT_PUBLIC_NOTIFICATION_EMAIL_MODE
RUN pnpm build

FROM node:22-alpine AS runtime
WORKDIR /app
RUN corepack enable
ENV NODE_ENV=production
COPY package.json ./
RUN pnpm install --prod --no-frozen-lockfile
COPY --from=build /app/.next ./.next
EXPOSE 3000
CMD ["pnpm", "start"]
