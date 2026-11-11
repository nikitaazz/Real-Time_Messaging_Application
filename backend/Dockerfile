FROM node:24-alpine

WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
EXPOSE 3333

# APP_KEY signs and encrypts data such as cookies, so it is never stored in the
# repository. Without one from the environment, a random key is created at start.
# The API uses access tokens, which don't depend on APP_KEY, so a new key on
# every start doesn't log anyone out.
CMD ["sh", "-c", "[ -n \"$APP_KEY\" ] || export APP_KEY=$(node -e \"process.stdout.write(require('node:crypto').randomBytes(32).toString('base64url'))\"); node ace migration:run && exec node ace serve --hmr"]
