# Use the official Node.js image as the base image
FROM oven/bun:1

# Set the working directory inside the container
WORKDIR /app

# Copy the application code to the working directory
COPY * ./

# Install the dependencies
RUN bun install

# Run the index.ts file
CMD ["bun", "run", "src/index.ts"]
