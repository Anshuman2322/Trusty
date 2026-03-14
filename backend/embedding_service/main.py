import hashlib
import json
import os
import threading
from datetime import datetime, timezone
from typing import Dict, List, Optional

import faiss
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer

MODEL_NAME = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
DATA_DIR = os.getenv("EMBEDDING_DATA_DIR", "./data")
INDEX_PATH = os.getenv("EMBEDDING_INDEX_PATH", os.path.join(DATA_DIR, "faiss.index"))
META_PATH = os.getenv("EMBEDDING_META_PATH", os.path.join(DATA_DIR, "meta.json"))


def stable_int64_id(value: str) -> int:
    digest = hashlib.sha256(value.encode("utf-8")).digest()
    # Fit into signed int64 range for FAISS
    raw = int.from_bytes(digest[:8], byteorder="big", signed=False)
    return raw % (2**63 - 1)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class EmbedRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000)
    meta: Optional[Dict[str, str]] = None


class UpsertAndSearchRequest(BaseModel):
    feedbackId: Optional[str] = Field(None, min_length=1)
    id: Optional[str] = Field(None, min_length=1)
    vendorId: str = Field(..., min_length=1)
    text: str = Field(..., min_length=1, max_length=4000)
    topK: int = Field(5, ge=1, le=50)
    filters: Optional[Dict[str, str]] = None


class SearchRequest(BaseModel):
    embedding: List[float] = Field(..., min_items=3)
    topK: int = Field(5, ge=1, le=50)
    filters: Optional[Dict[str, str]] = None


class Neighbor(BaseModel):
    id: str
    score: float
    createdAt: str


class EmbeddingService:
    def __init__(self, model_name: str) -> None:
        self.model = SentenceTransformer(model_name)
        self.dim = self.model.get_sentence_embedding_dimension()
        self.index = faiss.IndexFlatIP(self.dim)
        self.id_index = faiss.IndexIDMap2(self.index)
        self.lock = threading.Lock()
        self.meta_by_int: Dict[int, Dict[str, str]] = {}
        self.model_version = f"{model_name}@1.0.0"
        self._load_state()

    def _load_state(self) -> None:
        os.makedirs(DATA_DIR, exist_ok=True)
        if os.path.exists(INDEX_PATH):
            self.id_index = faiss.read_index(INDEX_PATH)
        if os.path.exists(META_PATH):
            with open(META_PATH, "r", encoding="utf-8") as handle:
                raw = json.load(handle)
                self.meta_by_int = {int(k): v for k, v in raw.items()}

    def _persist_state(self) -> None:
        os.makedirs(DATA_DIR, exist_ok=True)
        faiss.write_index(self.id_index, INDEX_PATH)
        with open(META_PATH, "w", encoding="utf-8") as handle:
            json.dump({str(k): v for k, v in self.meta_by_int.items()}, handle)

    def embed_text(self, text: str) -> np.ndarray:
        vec = self.model.encode([text], normalize_embeddings=True)
        return vec.astype("float32")

    def upsert(self, doc_id: str, vendor_id: str, text: str) -> None:
        int_id = stable_int64_id(doc_id)
        embedding = self.embed_text(text)
        with self.lock:
            if int_id in self.meta_by_int:
                self.id_index.remove_ids(np.array([int_id], dtype=np.int64))
            self.id_index.add_with_ids(embedding, np.array([int_id], dtype=np.int64))
            self.meta_by_int[int_id] = {
                "id": doc_id,
                "vendorId": vendor_id,
                "createdAt": now_iso(),
            }
            self._persist_state()

    def search(self, embedding: np.ndarray, top_k: int, vendor_id: str) -> List[Neighbor]:
        # Retrieve extra candidates for filtering
        fetch_k = min(max(top_k * 5, top_k), 200)
        with self.lock:
            if self.id_index.ntotal == 0:
                return []
            scores, ids = self.id_index.search(embedding, fetch_k)

        neighbors: List[Neighbor] = []
        for score, int_id in zip(scores[0], ids[0]):
            if int_id == -1:
                continue
            meta = self.meta_by_int.get(int_id)
            if not meta:
                continue
            if meta.get("vendorId") != vendor_id:
                continue
            neighbors.append(Neighbor(id=meta["id"], score=float(score), createdAt=meta["createdAt"]))
            if len(neighbors) >= top_k:
                break
        return neighbors


app = FastAPI(title="Embedding Service", version="1.0.0")
service = EmbeddingService(MODEL_NAME)


@app.get("/health")
def health() -> Dict[str, object]:
    return {
        "ok": True,
        "modelVersion": service.model_version,
        "indexSize": int(service.id_index.ntotal),
        "dataDir": os.path.abspath(DATA_DIR),
    }


@app.post("/embed")
def embed(req: EmbedRequest) -> Dict[str, object]:
    embedding = service.embed_text(req.text)
    return {
        "ok": True,
        "requestId": stable_int64_id(req.text),
        "modelVersion": service.model_version,
        "embedding": embedding[0].tolist(),
    }


@app.post("/upsert-and-search")
def upsert_and_search(req: UpsertAndSearchRequest) -> Dict[str, object]:
    doc_id = req.feedbackId or req.id
    if not doc_id:
        return {
            "ok": False,
            "error": "feedbackId is required",
        }

    vendor_id = req.vendorId
    if req.filters and req.filters.get("vendorId"):
        vendor_id = req.filters["vendorId"]

    service.upsert(doc_id, vendor_id, req.text)
    embedding = service.embed_text(req.text)
    neighbors = service.search(embedding, req.topK, vendor_id)

    return {
        "ok": True,
        "requestId": stable_int64_id(doc_id),
        "modelVersion": service.model_version,
        "embeddingDim": service.dim,
        "neighborCount": len(neighbors),
        "neighbors": [n.dict() for n in neighbors],
    }


@app.post("/search")
def search(req: SearchRequest) -> Dict[str, object]:
    if not req.filters or "vendorId" not in req.filters:
        return {
            "ok": False,
            "error": "filters.vendorId is required",
        }
    embedding = np.array([req.embedding], dtype="float32")
    neighbors = service.search(embedding, req.topK, req.filters["vendorId"])

    return {
        "ok": True,
        "requestId": stable_int64_id(req.filters["vendorId"]),
        "modelVersion": service.model_version,
        "neighbors": [n.dict() for n in neighbors],
    }
