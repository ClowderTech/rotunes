# Use the latest Deno image for Debian.
FROM denoland/deno:debian

# Set the working directory inside the Docker container.
WORKDIR /app

# Copy deno.json to Docker image.
COPY deno.json ./

# Install Deno dependencies.
RUN deno install --allow-scripts=npm:sharp

# Add user so we don't need --no-sandbox.
RUN groupadd clowdertech && useradd -g clowdertech clowdertech \
    && mkdir -p /home/clowdertech/Downloads /app \
    && chown -R clowdertech:clowdertech /home/clowdertech \
    && chown -R clowdertech:clowdertech /app
	
# Run everything after as non-privileged user.
USER clowdertech

# Copy all other files from the current directory to /app in the container.
COPY . .

# Command to run the application.
CMD ["deno", "task", "start"]