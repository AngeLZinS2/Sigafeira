# SIGA Feira

SIGA is an accessibility management platform designed to map urban barriers in Feira de Santana, Brazil.

Residents can explore accessibility reports on a collaborative map and report issues such as damaged sidewalks, missing curb ramps, street obstacles, and traffic lights without accessible features. The project was created as an academic civic technology initiative focused on community participation, transparency, and data-informed urban planning.

**Live application:** [sigafeira.online](https://sigafeira.online)

## Key Features

- Interactive map of Feira de Santana powered by OpenStreetMap
- Public access to reports and occurrence details
- Email/password and Google authentication
- Accessibility reports with location, description, and photo
- Device geolocation and direct point selection on the map
- Persistent report storage in PostgreSQL
- Automatic image conversion to WebP
- Local image moderation with NSFWJS
- Ownership controls that allow only the author to delete a report
- Educational resources about urban accessibility
- Responsive interface with keyboard navigation support

## Architecture

| Component | Technology | Responsibility |
| --- | --- | --- |
| Web application | React, Vite, and Leaflet | Renders the interface, map, and forms |
| Authentication | Firebase Authentication | Identifies and authenticates users |
| API | Node.js and Express | Validates access and processes reports |
| Database | PostgreSQL | Stores accessibility reports |
| Image pipeline | Sharp, NSFWJS, and Docker volumes | Converts, moderates, and stores images |
| Infrastructure | Docker Compose and Nginx | Runs and exposes the services on the VPS |

The browser never connects directly to PostgreSQL. The API validates Firebase tokens before creating or deleting reports, while map data and published reports remain publicly accessible.

## Technology Stack

- React 19
- Vite
- Leaflet and React Leaflet
- Firebase Authentication
- Node.js and Express
- PostgreSQL
- Sharp and NSFWJS
- Docker Compose
- Nginx
- Let's Encrypt

## Requirements

- Docker with the Docker Compose plugin; or
- Node.js 22 or later for front-end development.

## Environment Configuration

Create an environment file from the included template:

```sh
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Add the Firebase Web App credentials and choose a strong PostgreSQL password:

```dotenv
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=siga-be825.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=siga-be825
VITE_FIREBASE_APP_ID=
VITE_API_BASE_URL=/api
POSTGRES_PASSWORD=replace-with-a-strong-password
```

The `.env` file is excluded from Git and must never be committed.

Enable the **Email/Password** and **Google** providers in Firebase Authentication. Add the public application domain to the Firebase **Authorized domains** list.

## Run with Docker

From the project root:

```sh
docker compose up -d --build
```

Open `http://localhost:8081`. Docker Compose starts the web application, API, and PostgreSQL database. The database port is not exposed to the host.

Stop the containers without deleting persistent data:

```sh
docker compose down
```

Reports and photos remain stored in the `siga-postgres-data` and `siga-photo-data` volumes.

## Local Development

```sh
npm install
npm run dev
```

Vite serves the application at `http://localhost:5173` and forwards `/api` requests to the local API service.

Available commands:

```sh
npm run dev
npm run build
npm run lint
npm run preview
```

## VPS Deployment

Copy the repository files to the server, preserve the production `.env` file, and run:

```sh
docker compose up -d --build
```

The application listens on port `8081`. In production, Nginx acts as the reverse proxy and handles HTTPS traffic.

### Production Domain

The production domain is `sigafeira.online`, with `www.sigafeira.online` as an additional hostname. Reverse proxy templates are stored in `deploy/nginx`:

- `sigafeira.online.bootstrap.conf` handles HTTP and the ACME challenge before certificate issuance.
- `sigafeira.online.conf` redirects HTTP to HTTPS and defines the final secure proxy.

Both hostnames must point to the VPS public IP. The current deployment uses a Let's Encrypt certificate with automatic renewal.

## Data and Privacy

Published reports are visible on the public map. Accepted photos are converted to WebP and stored in a dedicated application volume. Image classification runs inside the API without sending uploads to a paid moderation service.

Automated classifiers can make mistakes, so human moderation is still recommended for a public production deployment. User email addresses are not displayed with public reports.

## Educational Resources

The ten public accessibility guides are stored in `public/materiais` and are available from the application's educational resources section. The extended academic abstract is kept separately in `docs/pesquisa` and is not published by the website.

## Project Structure

```text
Siga/
├── api/                  # Node.js API and image processing
├── deploy/nginx/         # Domain and HTTPS proxy configuration
├── docs/pesquisa/        # Academic documentation not served publicly
├── public/
│   ├── assets/           # Public logos, icons, and images
│   └── materiais/        # Ten accessibility guides available on the site
├── src/                  # React components, integrations, and styles
├── docker-compose.yml    # Web application, API, and PostgreSQL services
├── Dockerfile            # Front-end build and application Nginx image
└── README.md
```

## Author

Created by **Angelo** — [@AngeLZinS2](https://github.com/AngeLZinS2).

Academic project developed in Feira de Santana, Bahia, Brazil.
