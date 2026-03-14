# Embedding Service (CPU-only)

Lightweight FastAPI service for text embeddings and near-duplicate search.

## Run (local)

1) Create venv and install requirements.
2) Start service:

   uvicorn main:app --host 0.0.0.0 --port 8010

## Persistence

- Index and metadata are stored on disk.
- Defaults:
   - ./data/faiss.index
   - ./data/meta.json

You can override paths via env vars:

- EMBEDDING_DATA_DIR
- EMBEDDING_INDEX_PATH
- EMBEDDING_META_PATH

## Endpoints

- GET /health
- POST /embed
- POST /upsert-and-search
- POST /search

## Upsert request shape

Preferred request body for POST /upsert-and-search:

{
   "feedbackId": "feedback-id",
   "vendorId": "vendor-id",
   "text": "feedback text",
   "topK": 5,
   "filters": { "vendorId": "vendor-id" }
}

The service still accepts the legacy `id` field for compatibility.

## Notes

- FAISS index is persisted on each upsert.
- Vendor filtering is enforced by post-filtering results.
- Model can be swapped by editing MODEL_NAME in main.py.
