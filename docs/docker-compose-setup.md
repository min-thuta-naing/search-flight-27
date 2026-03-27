## AIRPAZ New Data Testing

### in the frontend folder 

```bash 
cd frontend 
npm install --legacy-peer-deps
npm install plotly.js
```

### in the backend folder 

```bash 
cd backend 
npm install
npm install googleapis
python3 -m pip install pandas selenium undetected-chromedriver

```

- create .env file 
- and copy the following 
```bash 
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
# For Docker: use 'postgres' as host (service name in docker-compose)
# For local: use 'localhost'
DB_HOST=postgres
DB_PORT=5432
DB_NAME=flight_search
DB_USER=postgres
DB_PASSWORD=postgres

# TimescaleDB Extension
ENABLE_TIMESCALEDB=true

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
# Window in milliseconds (default: 60000 = 1 minute)
RATE_LIMIT_WINDOW_MS=60000
# Max requests per window (default: 1000 in dev, 300 in prod)
RATE_LIMIT_MAX_REQUESTS=1000
AUTO_IMPORT_FLIGHTS=true

# ============================================
# Scheduled Jobs Configuration
# ============================================
#
# Enable/disable scheduled background jobs
#
ENABLE_SCHEDULED_JOBS=false
```

### in the root folder 

Create a `.env` file in the root folder (same folder as `docker-compose.yml`). Docker Compose reads this file when substituting variables in the yml.

**For localhost only:**
```bash 
NEXT_PUBLIC_OPENWEATHERMAP_API_KEY=your_api_key
```

**For testing on mobile / via machine IP** (e.g. http://192.168.1.20:3000):  
Replace `<IP-PC>` with your machine's IP (from `ipconfig`).
```bash 
NEXT_PUBLIC_OPENWEATHERMAP_API_KEY=your_api_key
NEXT_PUBLIC_API_URL=http://<IP-PC>:3001/api
CORS_ORIGIN=http://localhost:3000,http://<IP-PC>:3000
```
After changing `CORS_ORIGIN` or `NEXT_PUBLIC_API_URL`, run:  
`docker compose up -d --build` then `docker compose up -d --force-recreate backend`

### Running the TEST Environment

From the root directory:
Run the following command: 
```bash 
docker compose -f docker-compose.yml up --build
``` 

But if you want it to be down 
```bash 
docker compose -f docker-compose.yml down
```

### Access URLs

Frontend: http://localhost:3000

Backend API: http://localhost:3001/api/health 

Database:
Host: localhost
Port: 5432
DB Name: flight_search


### in the docker database 

in the exec terminal of flight_search_db on docker 
- psql -U postgres
- \c flight_search 
- \dt (to see all db tables)

#### importing airpaz flight data 

Currently the flight data are automatically imported from the airpaz csv files when you run the docker compose -f docker-compose.test.yml up --build

but if you want to import the flight data manually
here is the detail on how: 
in the root folder 
```bash

docker exec -it flight_search_backend sh

/app $ npm run import-airports
/app $ npm run import-airpaz-flights  
/app $ npm run import-intl-flights
npm run import-intl-flights -- --dir=/app/data/intl_flight_data/asia/americansamoa 
npm run import-intl-flights -- --drive
npm run import-intl-flights -- --drive --folder-id=YOUR_FOLDER_ID
npm run import-intl-flights -- --drive --folder-id=1JRowqzZEA8TO38U65Z7a2ksDizUD3FBC

```
for running migration 
```bash
npm run migrate
npm run migrate:up
docker exec flight_search_backend npm run migrate:up
```

in the backend folder 
```bash 
npm list googleapis 
```

after every changes, run this 
```bash 
docker-compose build backend && docker-compose up -d backend
docker compose build --no-cache backend && docker compose up -d backend
```

to view the logs of the backend (to check if cross-check happen or not)
```bash
docker-compose logs -f backend
```
...


