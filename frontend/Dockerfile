FROM node:20-alpine

WORKDIR /app

# Copy package files first for caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Expose Vite default port
EXPOSE 5173

# Run Vite in host mode to be accessible from outside
CMD ["npm", "run", "dev", "--", "--host"]
