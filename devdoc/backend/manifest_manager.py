"""
Incremental Manifest Manager for DevDoc.
Tracks file content hashes (SHA-256) to detect added, modified, deleted,
and unchanged source files for fast incremental ingestion and graph updates.
"""

from __future__ import annotations

import hashlib
import json
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

from config import settings


@dataclass
class ManifestDelta:
    dataset: str
    added_files: list[str] = field(default_factory=list)
    modified_files: list[str] = field(default_factory=list)
    deleted_files: list[str] = field(default_factory=list)
    unchanged_files: list[str] = field(default_factory=list)
    file_hashes: dict[str, str] = field(default_factory=dict)
    has_changes: bool = False

    def summary(self) -> str:
        return (
            f"Delta Summary for '{self.dataset}': "
            f"{len(self.added_files)} added, "
            f"{len(self.modified_files)} modified, "
            f"{len(self.deleted_files)} deleted, "
            f"{len(self.unchanged_files)} unchanged."
        )


class ManifestManager:
    @classmethod
    def _manifest_path(cls, dataset: str) -> Path:
        manifest_dir = settings.DATA_DIR / "manifests"
        manifest_dir.mkdir(parents=True, exist_ok=True)
        return manifest_dir / f"{dataset}.json"

    @classmethod
    def compute_file_hash(cls, file_path: str | Path) -> str:
        p = Path(file_path)
        hasher = hashlib.sha256()
        try:
            with open(p, "rb") as f:
                for chunk in iter(lambda: f.read(65536), b""):
                    hasher.update(chunk)
            return hasher.hexdigest()
        except Exception:
            return ""

    @classmethod
    def load_manifest(cls, dataset: str) -> dict[str, Any]:
        p = cls._manifest_path(dataset)
        if not p.exists():
            return {"dataset": dataset, "last_updated": 0, "files": {}}
        try:
            with open(p, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {"dataset": dataset, "last_updated": 0, "files": {}}

    @classmethod
    def save_manifest(cls, dataset: str, files_dict: dict[str, dict[str, Any]]) -> None:
        p = cls._manifest_path(dataset)
        data = {
            "dataset": dataset,
            "last_updated": time.time(),
            "files": files_dict,
        }
        temp_file = p.with_suffix(".tmp")
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        temp_file.replace(p)

    @classmethod
    def diff_manifest(cls, dataset: str, current_files: list[str | Path]) -> ManifestDelta:
        manifest = cls.load_manifest(dataset)
        old_files = manifest.get("files", {})

        current_file_map: dict[str, str] = {}
        for fp in current_files:
            clean = str(Path(fp).resolve()).replace("\\", "/")
            h = cls.compute_file_hash(fp)
            if h:
                current_file_map[clean] = h

        added: list[str] = []
        modified: list[str] = []
        unchanged: list[str] = []
        deleted: list[str] = []

        # Check current files against old manifest
        for clean_path, new_hash in current_file_map.items():
            if clean_path not in old_files:
                added.append(clean_path)
            else:
                old_hash = old_files[clean_path].get("sha256", "")
                if old_hash != new_hash:
                    modified.append(clean_path)
                else:
                    unchanged.append(clean_path)

        # Check deleted files
        for old_path in old_files:
            if old_path not in current_file_map:
                deleted.append(old_path)

        has_changes = bool(added or modified or deleted)

        return ManifestDelta(
            dataset=dataset,
            added_files=added,
            modified_files=modified,
            deleted_files=deleted,
            unchanged_files=unchanged,
            file_hashes=current_file_map,
            has_changes=has_changes,
        )

    @classmethod
    def update_manifest(cls, dataset: str, current_files: list[str | Path]) -> ManifestDelta:
        delta = cls.diff_manifest(dataset, current_files)

        new_files_dict: dict[str, dict[str, Any]] = {}
        for clean_path, h in delta.file_hashes.items():
            try:
                p = Path(clean_path)
                stat = p.stat()
                new_files_dict[clean_path] = {
                    "sha256": h,
                    "size": stat.st_size,
                    "mtime": stat.st_mtime,
                }
            except Exception:
                new_files_dict[clean_path] = {
                    "sha256": h,
                    "size": 0,
                    "mtime": time.time(),
                }

        cls.save_manifest(dataset, new_files_dict)
        return delta
