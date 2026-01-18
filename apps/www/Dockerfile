# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock .npmrc /temp/dev/
COPY apps/www/package.json apps/www/.npmrc /temp/dev/apps/www/
COPY packages/forms/package.json /temp/dev/packages/forms/package.json
COPY packages/forms-react/package.json /temp/dev/packages/forms-react/package.json
COPY packages/actions/package.json /temp/dev/packages/actions/package.json
COPY packages/registry/package.json /temp/dev/packages/registry/package.json
RUN cd /temp/dev && bun install --frozen-lockfile --ignore-scripts

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lock .npmrc /temp/prod/
COPY apps/www/package.json apps/www/.npmrc /temp/prod/apps/www/
COPY packages/forms/package.json /temp/prod/packages/forms/package.json
COPY packages/forms-react/package.json /temp/prod/packages/forms-react/package.json
COPY packages/actions/package.json /temp/prod/packages/actions/package.json
COPY packages/registry/package.json /temp/prod/packages/registry/package.json
RUN cd /temp/prod && bun install --frozen-lockfile --production --ignore-scripts

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY package.json bun.lock .npmrc ./
COPY packages/ packages/
COPY apps/www/ apps/www/

# Build the workspace packages
ENV NODE_ENV=production
RUN bun run --filter @schema-engine/registry build:lib
RUN bun run --filter @schema-engine/actions build:lib
RUN bun run --filter @schema-engine/forms build:lib
RUN bun run --filter @schema-engine/forms-react build:lib

# [optional] tests & build
# ENV NODE_ENV=production
# RUN bun test
# RUN bun run build

# copy production dependencies and source code into final image
FROM base AS release
# Copy dev node_modules (which has working aliases) instead of prod
COPY --from=install /temp/dev/node_modules node_modules
COPY --from=prerelease /usr/src/app/packages packages/
COPY --from=prerelease /usr/src/app/apps/www apps/www/
COPY --from=prerelease /usr/src/app/package.json .
COPY --from=prerelease /usr/src/app/bun.lock .
COPY --from=prerelease /usr/src/app/.npmrc .

# Set working directory to the root for monorepo scripts
WORKDIR /usr/src/app

# Set proper permissions for the bun user
# Security best practice: avoid running as root
RUN chown -R bun:bun /usr/src/app

# run the app
USER bun
EXPOSE 3000/tcp

CMD ["bun", "run", "start:www"]