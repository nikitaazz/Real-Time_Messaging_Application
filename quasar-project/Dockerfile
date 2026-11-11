FROM node:24-alpine

WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY . .
RUN pnpm install --frozen-lockfile
EXPOSE 9000
CMD ["pnpm", "exec", "quasar", "dev", "--hostname", "0.0.0.0", "--port", "9000"]
