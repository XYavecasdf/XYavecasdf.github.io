"""Verified Hillenbrand acquisition and Git provenance (stdlib only).

The digest is pinned to the preserved Phase 3 aggregates. A mutable upstream URL
is only a transport location: differing bytes are rejected before ZIP parsing.
Acquisition does not imply permission to publish recordings or token metadata.
"""
import hashlib
from pathlib import Path
import subprocess
import urllib.request

ARCHIVE_URL = "https://raw.githubusercontent.com/santiagobarreda/hillenbrand_et_al_1995/main/h95-alldata.zip"
ARCHIVE_SHA256 = "2560548591e3a726c88549b6dc9d226995616c26874d601c69fee8b9eee9d730"
MAX_ARCHIVE_BYTES = 40_000_000


def acquire_archive(cache_path=None):
    """Read a supplied cache without modifying it, or fetch with standard TLS.

    Never fall back to downloading when a supplied cache fails verification.
    Return only verified bytes and their digest; callers may then open the ZIP.
    """
    if cache_path is not None:
        with Path(cache_path).open("rb") as stream:
            archive = stream.read(MAX_ARCHIVE_BYTES + 1)
    else:
        request = urllib.request.Request(
            ARCHIVE_URL, headers={"User-Agent": "VowelScope-VerifiedResearch/1.0"})
        with urllib.request.urlopen(request, timeout=120) as stream:
            archive = stream.read(MAX_ARCHIVE_BYTES + 1)
    if len(archive) > MAX_ARCHIVE_BYTES:
        raise ValueError("Hillenbrand archive exceeds 40,000,000-byte limit")
    digest = hashlib.sha256(archive).hexdigest()
    if digest != ARCHIVE_SHA256:
        raise ValueError(
            f"Hillenbrand archive SHA-256 mismatch: expected {ARCHIVE_SHA256}, got {digest}")
    return archive, digest


def outside_checkout(path, checkout_root, label):
    """Resolve symlinks before enforcing the external-artifact boundary."""
    resolved = Path(path).expanduser().resolve()
    if resolved.is_relative_to(Path(checkout_root).resolve()):
        raise ValueError(f"{label} must be outside the checkout: {resolved}")
    return resolved


def git_provenance(checkout_root):
    """Report actual checked-out HEAD, including tracked and untracked changes.

    CI environment variables cannot override the Git revision being evaluated.
    The diff hash distinguishes tracked edits without publishing their contents.
    Benchmark configuration also records actual evaluated source digests.
    """
    def git(*args):
        return subprocess.check_output(["git", "-C", str(checkout_root), *args])

    return {
        "source_commit": git("rev-parse", "HEAD").decode("ascii").strip(),
        "source_dirty": bool(git("status", "--porcelain", "--untracked-files=all")),
        "source_diff_sha256": hashlib.sha256(git("diff", "HEAD", "--binary")).hexdigest(),
    }
