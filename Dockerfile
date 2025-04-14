# Stage 1: Build the Vite project
FROM oven/bun:latest AS builder
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* .npmrc ./
RUN bun i

# Copy the rest of the project files
COPY . .

# Build the project
RUN bun run build

# Stage 2: Serve with Nginx
FROM nginx:stable-alpine

# Create nginx configuration
RUN mkdir -p /etc/nginx/conf.d
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from the builder stage to the Nginx directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
