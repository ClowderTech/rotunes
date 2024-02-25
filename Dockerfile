# Use the official Node.js image as the base image
FROM node:latest

# Set the working directory inside the container
WORKDIR /app

# Copy the application code to the working directory
COPY * ./

# Install the dependencies
RUN npm install

# Build the typescript file
RUN npm run build

# Run the index.ts file
CMD ["node", "run", "start"]
