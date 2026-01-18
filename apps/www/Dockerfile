# use the official Bun image
FROM oven/bun:1

WORKDIR /usr/src/app

# Copy all files
COPY . .

# Install dependencies
RUN bun install --frozen-lockfile

# Build the workspace packages
ENV NODE_ENV=production

# Temporarily set NODE_ENV to development for building if necessary, 
# but usually build scripts should work in production if devDeps are installed.
# bun install --frozen-lockfile (without --production) installs devDependencies, so we are good.

RUN bun run --filter @schema-engine/registry build:lib
RUN bun run --filter @schema-engine/actions build:lib
RUN bun run --filter @schema-engine/forms build:lib
RUN bun run --filter @schema-engine/forms-react build:lib

# Set permissions
RUN chown -R bun:bun /usr/src/app

# run the app
USER bun
EXPOSE 3000

CMD ["bun", "run", "start:www"]