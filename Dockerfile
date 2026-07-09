# syntax = docker/dockerfile:1

# Adjust BUN_VERSION as desired
ARG BUN_VERSION=1.3.8
FROM oven/bun:${BUN_VERSION}-slim AS base

LABEL fly_launch_runtime="TanStack Start"

# App lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"


# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential pkg-config python-is-python3

# Install node modules
COPY bun.lock package.json ./
RUN bun install

# Copy application code
COPY . .

# Pro-tier client config (PUBLIC, publishable values — not secrets). Vite
# inlines VITE_* into the client bundle at build time, so these must be
# supplied here (via fly.toml [build.args]) rather than `fly secrets`.
# Left unset, the build produces the fully-featured free tier with Pro off.
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_CONVEX_URL
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_CONVEX_URL=$VITE_CONVEX_URL

# Full build (client assets + prerendered SPA shell + server handler) at
# image build — containers boot straight into the production server
# (scripts/serve.ts) with no cold-start build work.
RUN bun run build

# Remove development dependencies (the production server needs only
# `dependencies` — dist/server/server.js externals like @tanstack/react-start
# live there — plus src/ for the serve script and data/ for the dataset
# fallback, all copied below).
RUN rm -rf node_modules && \
    bun install --ci


# Final stage for app image
FROM base

# Copy built application
COPY --from=build /app /app

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
ENV HOSTNAME="0.0.0.0"
ENV PORT="3000"
CMD [ "bun", "run", "start" ]
