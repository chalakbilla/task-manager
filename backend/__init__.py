"""Loads .env for local development. On Vercel the variables come from project settings."""
import os

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
