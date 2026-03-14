# Embedding Service API (v1 Draft)

Goal: self-hosted, CPU-only embedding and near-duplicate retrieval with full explainability.

## Service Boundary

- Node.js backend owns scoring and logs.
- Python service owns embedding generation and vector search.

## Transport

- HTTP/JSON for simplicity (can move to gRPC later).
- All responses must include a `modelVersion` string and a `requestId`.

## Endpoints

### 1) Health

GET /health

Response:

{
  "ok": true,
  "modelVersion": "bge-small-en@1.0.0",
  "indexSize": 12345
}

### 2) Embed only

POST /embed

Request:

{
  "text": "string",
  "meta": {
    "vendorId": "string",
    "feedbackId": "string"
  }
}

Response:

{
  "ok": true,
  "requestId": "uuid",
  "modelVersion": "bge-small-en@1.0.0",
  "embedding": [0.012, -0.44, 0.9]
}

### 3) Upsert and search (recommended)

POST /upsert-and-search

Request:

{
  "feedbackId": "feedbackId",
  "vendorId": "string",
  "text": "string",
  "topK": 5,
  "filters": {
    "vendorId": "string"
  }
}

Response:

{
  "ok": true,
  "requestId": "uuid",
  "modelVersion": "bge-small-en@1.0.0",
  "embeddingDim": 384,
  "neighborCount": 2,
  "neighbors": [
    { "id": "feedbackId2", "score": 0.932, "createdAt": "2026-02-10T12:01:00.000Z" },
    { "id": "feedbackId3", "score": 0.911, "createdAt": "2026-02-09T10:03:00.000Z" }
  ]
}

Notes:

- `score` is cosine similarity.
- `filters.vendorId` is mandatory to avoid cross-vendor leakage.
- `feedbackId` is the preferred request field; legacy `id` is still accepted by the FastAPI service.

### 4) Search by embedding (optional)

POST /search

Request:

{
  "embedding": [0.012, -0.44, 0.9],
  "topK": 5,
  "filters": {
    "vendorId": "string"
  }
}

Response:

{
  "ok": true,
  "requestId": "uuid",
  "modelVersion": "bge-small-en@1.0.0",
  "neighbors": [
    { "id": "feedbackId2", "score": 0.932, "createdAt": "2026-02-10T12:01:00.000Z" }
  ]
}

## Data Flow (backend)

1) Receive feedback in Node.js.
2) Call /upsert-and-search with the text and feedbackId.
3) Use `neighbors[0].score` as `maxSim` for dupAdj.
4) Store `neighbors` list in audit logs.

## Storage Options

### Local (phase 1)

- FAISS + SQLite for metadata (id, vendorId, createdAt).
- CPU-only, single instance.

### Cloud (phase 2)

- Qdrant (self-hosted) with filterable payload (vendorId, createdAt).
- Horizontal scaling with replicas.

## Explainability Requirements

Each response must include:

- modelVersion
- embeddingDim
- top-K neighbor list with scores

## Operational Constraints

- CPU only.
- No external API dependency.
- Must be deterministic across restarts (pin model version and tokenizer).

## Model Candidates (CPU-friendly)

- bge-small-en
- e5-small
- all-MiniLM-L6-v2 (baseline)

## Security/Privacy

- No raw user identifiers beyond vendorId and feedbackId.
- Do not log raw text in the embedding service.
