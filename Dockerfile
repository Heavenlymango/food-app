# Build stage
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Run stage
FROM nginx:alpine
# Your Vite build output is "build/"
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
