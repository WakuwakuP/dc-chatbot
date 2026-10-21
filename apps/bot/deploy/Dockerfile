FROM node:24.22.1-bookworm-slim

WORKDIR /workspace

ENV CI=true
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN corepack enable

COPY .npmrc package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json vitest.config.ts ./
COPY apps/bot/package.json apps/bot/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile --filter @dc-chatbot/bot...

COPY apps/bot apps/bot
COPY packages/shared packages/shared

RUN pnpm --filter @dc-chatbot/bot build

CMD ["pnpm", "--filter", "@dc-chatbot/bot", "start"]
