# Backend Architecture

The MyMovieDB backend is a RESTful API built with Python, [FastAPI](https://fastapi.tiangolo.com/), and [SQLAlchemy](https://www.sqlalchemy.org/).

## Core Components

-   **`main.py`**: The entry point for the FastAPI application. It defines all the API endpoints, Pydantic schemas for request/response validation, and configures CORS.
-   **`database.py`**: Handles the connection to the PostgreSQL database using SQLAlchemy. It sets up the engine and provides a dependency (`get_db`) to inject database sessions into route handlers.
-   **`models.py`**: Contains the SQLAlchemy ORM models, defining the structure of the database tables (e.g., `Movie`, `AppSetting`).
-   **`tmdb.py`**: Contains utility functions to interact with The Movie Database (TMDB) API for searching movies and fetching metadata.
-   **`scanner.py`**: Provides functionality to scan the mounted movie directory (`/movies`), detect movie files, and potentially match them with existing database entries or prepare them for import.

## Key API Endpoints

The API provides various endpoints grouped by functionality:

### Movies

-   `GET /api/movies`: Retrieve a list of movies. Supports filtering by search query, ownership status (owned, wishlist, shopping_list, need_physical), format (physical, digital), and backup status.
-   `GET /api/movies/{movie_id}`: Retrieve a specific movie by its ID.
-   `POST /api/movies`: Create a new movie entry.
-   `PUT /api/movies/{movie_id}`: Update an existing movie.
-   `DELETE /api/movies/{movie_id}`: Delete a movie.
-   `POST /api/movies/bulk-delete`: Delete multiple movies at once.
-   `POST /api/movies/bulk-update`: Update multiple movies at once (e.g., mark as owned or backed up).

### Scanning and Importing

-   `GET /api/scan`: Initiates a scan of the mounted movies directory.
-   `GET /api/scan/progress`: Retrieves the progress of the current scan.
-   `POST /api/scan/import`: Imports a scanned movie file into the database, optionally fetching details from TMDB.

### Settings and TMDB

-   `GET /api/settings`: Retrieves application settings (specifically if the TMDB API key is configured).
-   `POST /api/settings`: Updates application settings.
-   `GET /api/tmdb/search`: Searches TMDB for movies based on a query and optional release year.

### Statistics

-   `GET /api/stats`: Retrieves statistics about the movie collection (total movies, owned, physical count, digital count, backed up count, etc.).

## Database Schema

The primary entity is the `Movie` model, which stores extensive information about each movie, including metadata (title, release year, description, poster URL), physical/digital ownership details, and backup status. The application uses a PostgreSQL database. Tables are automatically created on startup via SQLAlchemy `Base.metadata.create_all`.
