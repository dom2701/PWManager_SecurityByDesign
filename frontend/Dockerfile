# Build stage
FROM node:22-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:22-alpine
WORKDIR /app

# Install serve to run the application
RUN npm install -g serve

# Copy built assets from build stage
COPY --from=build /app/dist ./dist

# Use non-root user provided by the node image
USER node

EXPOSE 8080

# -s flag rewrites all not-found requests to index.html (SPA support)
CMD ["serve", "-s", "dist", "-l", "8080"]
