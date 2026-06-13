# Setup Guide

This guide will walk you through setting up and running MyMovieDB using Docker Compose.

## Prerequisites

-   [Docker](https://docs.docker.com/get-docker/) installed on your system.
-   [Docker Compose](https://docs.docker.com/compose/install/) installed.
-   (Optional) A [TMDB API Key](https://www.themoviedb.org/documentation/api) for fetching movie metadata.

## Configuration

1.  **Environment Variables:** You can set the `TMDB_API_KEY` in the application settings or as an environment variable in the `docker-compose.yml` file or a `.env` file.
2.  **Volume Mounts:** By default, the `docker-compose.yml` file mounts `/plex/Plex-Movies` to `/movies` inside the backend container. You may want to change `/plex/Plex-Movies` to the actual path where your movies are stored.

```yaml
    volumes:
      - ./backend:/app:z
      - /path/to/your/movies:/movies:z # Update this path
```

## Running the Application

1.  Open a terminal and navigate to the project root directory (`/home/bbrodge/MyMovieDB`).
2.  Run the following command to build and start the containers:

    ```bash
    docker-compose up -d --build
    ```

3.  The application will start, and you can access the frontend at `http://localhost:3000`. The backend API is available at `http://localhost:8000`.

## Stopping the Application

To stop the containers, run:

```bash
docker-compose down
```

## SSL Support

If you want to enable SSL for the frontend, uncomment the relevant lines in the `docker-compose.yml` under the `frontend` service (ports and volumes) and provide your certificate paths and an `nginx.ssl.conf` file.
