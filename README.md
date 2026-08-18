# Mini CDN

A small, distributed CDN-style system built to understand how routing, edge caching, origin servers, health checks, latency-based selection, cache invalidation, and observability work together.

## Architecture

```text
                         ┌──────────────┐
                         │   Frontend   │
                         └──────┬───────┘
                                │
                         Router URL only
                                │
                                ▼
                         ┌──────────────┐
                         │    Router    │
                         └──────┬───────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
          Delhi Edge       Pune Edge       London Edge
                │               │               │
                └───────────────┼───────────────┘
                                ▼
                         ┌──────────────┐
                         │    Origin    │
                         └──────────────┘
```

### Request flow

1. The frontend sends file requests to the Router.
2. The Router continuously health-checks the Edge servers and measures their response latency.
3. Healthy Edges are ordered by measured latency.
4. The Router sends the request to the fastest healthy Edge.
5. The Edge checks its local in-memory cache.
6. On a cache hit, the Edge returns the cached file.
7. On a cache miss, the Edge fetches the file from the Origin, stores it in its cache, and returns it to the client.
8. If an Edge fails during a request, the Router tries the next healthy Edge.

## Components

### Origin Server

The source of truth for static files. It exposes files through `/files/:filename` and listens on the deployment platform's `PORT` environment variable, with port `3000` as the local fallback.

Location:

```text
backend/origin/
```

### Edge Servers

There are three Edge instances representing different locations:

- Delhi
- Pune
- London

Each Edge maintains its own in-memory cache with:

- TTL-based expiration
- LRU-style eviction
- Cache hit/miss counters
- Cache eviction counters
- Cache invalidation endpoint

Location:

```text
backend/edge/
```

The three instances currently use the same implementation pattern but are started with different scripts:

```text
npm run start:delhi
npm run start:pune
npm run start:london
```

### Router

The Router is the public backend entry point used by the frontend. It keeps the individual Edge URLs in backend environment variables rather than exposing them to the frontend.

Current routing policy:

- Ignore unhealthy Edges.
- Prefer the healthy Edge with the lowest measured latency.
- If the selected Edge fails, try another healthy Edge.

The Router also provides aggregated statistics, history snapshots, and cache invalidation across Edges.

The current Router does **not** perform cache-aware Edge selection. Cache-aware routing is planned as a future improvement.

## Repository Structure

```text
minicdn/
├── backend/
│   ├── edge/
│   │   ├── edge-delhi.js
│   │   ├── edge-pune.js
│   │   ├── edge-london.js
│   │   ├── router.js
│   │   ├── package.json
│   │   └── .env.example
│   │
│   └── origin/
│       ├── server.js
│       ├── files/
│       ├── package.json
│       └── package-lock.json
│
├── frontend/
│   ├── src/
│   ├── package.json
│   └── .env.example
│
├── package.json
├── .gitignore
└── README.md
```

## Environment Variables

### Router / Edge

The backend uses environment variables so local addresses can be replaced with deployed service URLs without changing the code.

```env
PORT=7000
EDGE_DELHI_URL=http://localhost:4000
EDGE_PUNE_URL=http://localhost:5000
EDGE_LONDON_URL=http://localhost:6000
ORIGIN_URL=http://localhost:3000
```

In production, the deployed service URLs are supplied through the deployment platform's environment-variable configuration.

### Frontend

The frontend only needs the Router URL:

```env
VITE_ROUTER_URL=https://your-router-service.example.com
```

The frontend does not need the individual Edge or Origin URLs.

## Running Locally

Install dependencies for the backend services and frontend separately.

### Origin

```bash
cd backend/origin
npm install
npm start
```

### Edge servers

```bash
cd backend/edge
npm install

npm run start:delhi
npm run start:pune
npm run start:london
```

Run the three Edge commands in separate terminals.

### Router

From `backend/edge`:

```bash
npm start
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

### Router

```text
GET  /health
GET  /files/:filename
GET  /stats
GET  /history
DELETE /invalidate/:filename
```

### Edge

```text
GET    /health
GET    /files/:filename
GET    /stats
DELETE /cache/:filename
```

### Origin

```text
GET /files/:filename
```

## Caching Model

Each Edge uses an in-memory `Map` as its cache.

The current configuration uses:

- TTL: 30 seconds
- Maximum cached files: 5
- LRU-style eviction by refreshing recently accessed entries

The cache lifecycle is:

```text
Request
   │
   ▼
Cache lookup
   │
   ├── HIT ──────► Return cached file
   │
   └── MISS
        │
        ▼
      Origin
        │
        ▼
    Store in Edge cache
        │
        ▼
      Return file
```

## Observability

The Router collects Edge statistics and latency information and exposes aggregated data for the frontend dashboard.

Tracked metrics include:

- Total requests
- Cache hits
- Cache misses
- Cache evictions
- Cache hit rate
- Number of cached files
- Edge health
- Edge latency
- Historical snapshots

## Current Routing Strategy

The current Router uses health and latency information:

```text
Healthy Edges
      │
      ▼
Sort by measured latency
      │
      ▼
Fastest healthy Edge
```

Cache-aware routing is intentionally not implemented yet. A planned next version will consider whether an Edge already has the requested object before choosing between healthy Edges.

## Deployment Architecture

The project is structured as independent services so the Origin, each Edge instance, Router, and frontend can be deployed separately.

The intended public request path is:

```text
Browser
   │
   ▼
Frontend
   │
   ▼
Public Router
   │
   ├── Edge Delhi
   ├── Edge Pune
   └── Edge London
          │
          ▼
        Origin
```

The frontend only receives the Router URL. Edge and Origin service addresses are backend configuration values.

## Future Improvements

- Cache-aware Edge selection
- Geographic / proximity-based routing
- Load-aware routing
- Better cache eviction based on object size
- HTTP cache headers and ETags
- Persistent cache storage
- More detailed monitoring and alerts
- Private/internal Edge and Origin networking
- Consolidate the three Edge implementations into one configurable Edge server

## Learning Goals

This project is intentionally built incrementally to understand CDN and distributed-system concepts rather than hiding them behind an existing CDN provider.

Key concepts explored:

- Origin servers
- Edge servers
- Reverse proxying
- Health checks
- Latency-based routing
- Caching
- TTL
- LRU eviction
- Cache invalidation
- Service-to-service communication
- Environment-based configuration
- Multi-service deployment
- Observability
