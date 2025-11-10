FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY worker/package*.json ./
COPY package*.json ../

# Install dependencies
RUN npm install

# Copy source code
COPY worker/ ./
COPY src/ ../src/
COPY prisma/ ../prisma/

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3001

# Start the worker
CMD ["npm", "start"]

