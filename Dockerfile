# Use the official Node.js image as the base image
FROM node:lts

# Set the working directory inside the container
WORKDIR /app

# Copy the application code to the working directory
COPY . /app

# Install the dependencies
RUN npm install

# Build the typescript file
RUN npm run build

# Run the index.ts file
CMD ["npm", "run", "start"]
