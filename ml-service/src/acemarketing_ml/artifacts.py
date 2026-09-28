from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
from typing import Any


class ArtifactStore:
    def __init__(self) -> None:
        self.root = Path(os.getenv("ML_ARTIFACT_DIR", "/tmp/acemarketing-ml-artifacts"))
        self.production = os.getenv("ML_ENV", "development") == "production"
        self.bucket = os.getenv("ML_ARTIFACT_S3_BUCKET", "").strip()
        self.root.mkdir(parents=True, exist_ok=True)

    def _metadata_path(self, artifact_id: str) -> Path:
        return self.root / f"{artifact_id}.json"

    def _artifact_path(self, artifact_id: str) -> Path:
        return self.root / f"{artifact_id}.joblib"

    def save_joblib(self, artifact_id: str, obj: Any, metadata: dict[str, Any]) -> dict[str, Any]:
        if self.production and not self.bucket:
            raise RuntimeError("production artifact durability requires ML_ARTIFACT_S3_BUCKET")
        import joblib

        path = self._artifact_path(artifact_id)
        joblib.dump(obj, path)
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        record = {
            **metadata,
            "artifactId": artifact_id,
            "sha256": digest,
            "storage": "local-development" if not self.bucket else "s3-compatible-pending-upload",
            "path": str(path) if not self.production else None,
        }
        self._metadata_path(artifact_id).write_text(json.dumps(record, sort_keys=True), encoding="utf-8")
        return record

    def load_verified_joblib(self, artifact_id: str, expected_sha256: str) -> Any:
        import joblib

        path = self._artifact_path(artifact_id)
        if not path.exists():
            raise FileNotFoundError("artifact not found")
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest != expected_sha256:
            raise RuntimeError("artifact hash verification failed")
        return joblib.load(path)
