# syntax = docker/dockerfile:1

# Adjust BUN_VERSION as desired
ARG BUN_VERSION=1.3.8
FROM oven/bun:${BUN_VERSION}-slim AS base

LABEL fly_launch_runtime="Next.js"

# Next.js app lives here
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

# Pro-tier client config (PUBLIC, publishable values — not secrets). Next.js
# inlines NEXT_PUBLIC_* into the client bundles at build time, so these must
# be supplied here (via fly.toml [build.args]) rather than `fly secrets`.
# Left unset, the build produces the fully-featured free tier with Pro off.
# Server-side secrets (e.g. CLERK_SECRET_KEY) stay runtime `fly secrets`.
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CONVEX_URL
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CONVEX_URL=$NEXT_PUBLIC_CONVEX_URL

# Full build (compile + prerender) at image build — containers boot straight
# into `next start` with no cold-start build work.
RUN bunx next build

# Remove development dependencies
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
