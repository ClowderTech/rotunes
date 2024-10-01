# Use the latest Node.js LTS image
FROM node:lts

# Set the working directory inside the Docker container
WORKDIR /app

# Copy package.json and package-lock.json (if it exists) to Docker image
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy all other files from the current directory to /app in the container
COPY . .

# Command to build the application
RUN npm run build

EXPOSE 5000

# Command to run the application
CMD ["npm", "run", "start"]