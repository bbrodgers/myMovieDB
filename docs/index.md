# MyMovieDB

Welcome to the documentation for **MyMovieDB**.

MyMovieDB is a personal movie database management application. It allows you to keep track of your movie collection, including both physical and digital formats. It also provides tools to manage backups, wishlists, and shopping lists.

## Architecture

The project consists of three main components:

1.  **Backend:** A RESTful API built with Python, FastAPI, and SQLAlchemy.
2.  **Frontend:** A user interface built with React and Vite.
3.  **Database:** A PostgreSQL database to store movie metadata and application settings.

The application is containerized using Docker and Docker Compose, making it easy to deploy and manage.

## Features

-   **Movie Management:** Add, update, delete, and view movies in your collection.
-   **Format Tracking:** Keep track of physical (e.g., Blu-ray, DVD) and digital formats.
-   **Backup Status:** Monitor the backup status of your digital movies.
-   **Wishlist & Shopping List:** Track movies you want to buy or need physical copies of.
-   **Directory Scanning:** Automatically scan a mounted directory for digital movie files.
-   **TMDB Integration:** Fetch movie metadata (title, year, poster, etc.) from The Movie Database (TMDB).

## Getting Started

Check out the [Setup Guide](setup.md) to get your own instance of MyMovieDB up and running.
