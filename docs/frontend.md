# Frontend Architecture

The MyMovieDB frontend is built using [React](https://react.dev/) and bundled with [Vite](https://vitejs.dev/). It provides the user interface for managing the movie collection.

## Tech Stack

-   **Framework:** React 19
-   **Build Tool:** Vite
-   **Icons:** [Lucide React](https://lucide.dev/)
-   **Linting:** ESLint

## Project Structure

The frontend code is located in the `frontend` directory. Key files and directories include:

-   **`package.json`**: Defines dependencies and scripts (`dev`, `build`, `lint`, `preview`).
-   **`vite.config.js`**: Configuration file for Vite.
-   **`index.html`**: The main HTML file serving the React application.
-   **`src/`**: Contains the source code for the React application.
-   **`public/`**: Static assets.

## Deployment

The frontend is containerized using a `Dockerfile`. During the build process, Vite compiles the React application into static assets. These assets are then served by an Nginx web server configured within the container.

-   **`Dockerfile`**: Defines the multi-stage build process.
-   **`nginx.conf`**: The configuration file for the Nginx server serving the built assets.
-   **`nginx.ssl.conf`**: An alternative Nginx configuration file for serving the application over HTTPS (requires SSL certificates).
