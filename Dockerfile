# Use the latest Node.js LTS image
FROM denoland/deno:debian

# Set the working directory inside the Docker container
WORKDIR /app

# Copy package.json and package-lock.json (if it exists) to Docker image
COPY deno.json ./

# Install Node.js dependencies
RUN deno install

# Copy all other files from the current directory to /app in the container
COPY . .

EXPOSE 5000

# Command to run the application
CMD ["deno", "run", "prodstart"]