FROM node:16-alpine AS node
FROM node AS builder
WORKDIR /app
COPY package*.json ./
RUN npm i

# Copy the rest of the code
COPY . .
# Invoke the build script to transpile ts code to js
RUN npm run build

FROM node AS final
ARG API_VERSION
ENV NODE_ENV production
ENV API_VERSION ${API_VERSION}

RUN apk --no-cache -U upgrade
RUN mkdir -p /home/node/app/dist && chown -R node:node /home/node/app
WORKDIR /home/node/app
RUN npm i -g pm2
COPY package*.json process.yml ./

# Switch to user node
USER node
RUN npm ci --only=production
COPY --chown=node:node --from=builder /app/dist ./dist

# Use PM2 to run the application as stated in config file
ENTRYPOINT ["pm2-runtime", "./process.yml"]