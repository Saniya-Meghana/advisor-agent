# ---- Stage 1: Build the React frontend ----
FROM node:20-slim AS build
WORKDIR /app

# Copy package files explicitly from frontend/
COPY ./frontend/package.json ./
COPY ./frontend/package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the frontend source code
COPY ./frontend ./

# Build the React app
RUN npm run build

# ---- Stage 2: Serve via Nginx ----
FROM nginx:stable-alpine AS production

# Copy built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
