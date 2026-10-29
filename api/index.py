"""Vercel entrypoint. Vercel's Python runtime serves the WSGI object named `app`."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend.app import app  # noqa: E402,F401
