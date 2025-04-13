# backend/Dockerfile

# Use official Node.js LTS image
FROM node:22

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

RUN npm ci --omit=dev

# Copy app source code
COPY . .

# Expose port
EXPOSE 8080

# Start the server
CMD ["node", "routes/server.js"]