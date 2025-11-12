# Use Node.js 18
FROM node:18-alpine

# Install build dependencies for bcrypt
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with legacy peer deps flag
RUN npm install --legacy-peer-deps

# Rebuild bcrypt for the correct architecture
RUN npm rebuild bcrypt --build-from-source

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start:prod"]