from __future__ import annotations

import hashlib
import json
import os
import tempfile
from pathlib import Path
from typing import Any


class ArtifactStore:
    def __init__(self) -> None:
        self.root = Path(os.getenv("ML_ARTIFACT_DIR", "/tmp/acemarketing-ml-artifacts"))
        self.production = os.getenv("ML_ENV", "development") == "production"
        self.bucket = os.getenv("ML_ARTIFACT_S3_BUCKET", "").strip()
        self.prefix = os.getenv("ML_ARTIFACT_S3_PREFIX", "acemarketing/ml-artifacts").strip("/")
        self.root.mkdir(parents=True, exist_ok=True)

    def _metadata_path(self, artifact_id: str) -> Path:
        return self.root / f"{artifact_id}.json"

    def _artifact_path(self, artifact_id: str) -> Path:
        return self.root / f"{artifact_id}.joblib"

    def _object_key(self, artifact_id: str) -> str:
        return f"{self.prefix}/{artifact_id}.joblib" if self.prefix else f"{artifact_id}.joblib"

    def _s3(self):
        if not self.bucket:
            return None
        try:
            import boto3
        except ImportError as exc:
            raise RuntimeError("ML_ARTIFACT_S3_BUCKET is configured but boto3 is not installed") from exc
        return boto3.client(
            "s3",
            endpoint_url=os.getenv("ML_ARTIFACT_S3_ENDPOINT") or None,
            region_name=os.getenv("ML_ARTIFACT_S3_REGION") or None,
        )

    def save_joblib(self, artifact_id: str, obj: Any, metadata: dict[str, Any]) -> dict[str, Any]:
        if self.production and not self.bucket:
            raise RuntimeError("production artifact durability requires ML_ARTIFACT_S3_BUCKET")

        import joblib

        path = self._artifact_path(artifact_id)
        joblib.dump(obj, path)
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        object_key = None
        storage = "local-development"

        if self.bucket:
            object_key = self._object_key(artifact_id)
            s3 = self._s3()
            s3.upload_file(
                str(path),
                self.bucket,
                object_key,
                ExtraArgs={
                    "ServerSideEncryption": os.getenv("ML_ARTIFACT_S3_SSE", "AES256")
                },
            )
            storage = "s3"

        record = {
            **metadata,
            "artifactId": artifact_id,
            "sha256": digest,
            "storage": storage,
            "bucket": self.bucket or None,
            "objectKey": object_key,
            "path": str(path) if not self.production else None,
        }
        self._metadata_path(artifact_id).write_text(json.dumps(record, sort_keys=True), encoding="utf-8")
        return record

    def _load_metadata(self, artifact_id: str) -> dict[str, Any]:
        metadata_path = self._metadata_path(artifact_id)
        if not metadata_path.exists():
            raise FileNotFoundError("artifact metadata not found")
        return json.loads(metadata_path.read_text(encoding="utf-8"))

    def load_verified_joblib(self, artifact_id: str, expected_sha256: str) -> Any:
        import joblib

        metadata = self._load_metadata(artifact_id)
        local_path = self._artifact_path(artifact_id)
        cleanup_path: Path | None = None

        if metadata.get("storage") == "s3":
            if not self.bucket:
                raise RuntimeError("artifact metadata requires object storage but ML_ARTIFACT_S3_BUCKET is not configured")
            handle = tempfile.NamedTemporaryFile(prefix="ace-ml-", suffix=".joblib", delete=False)
            handle.close()
            cleanup_path = Path(handle.name)
            self._s3().download_file(self.bucket, str(metadata.get("objectKey") or self._object_key(artifact_id)), str(cleanup_path))
            path = cleanup_path
        else:
            path = local_path

        try:
            if not path.exists():
                raise FileNotFoundError("artifact not found")
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            if digest != expected_sha256:
                raise RuntimeError("artifact hash verification failed")
            return joblib.load(path)
        finally:
            if cleanup_path is not None:
                cleanup_path.unlink(missing_ok=True)
