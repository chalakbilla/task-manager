"""Single Supabase client shared by the app (uses the service_role key)."""
import os

from supabase import create_client

url = os.environ["SUPABASE_URL"].strip()
key = os.environ["SUPABASE_SERVICE_KEY"].strip().strip("\"'")

# supabase-py 2.7.x only accepts JWT-style keys. The newer "sb_secret_..." keys are rejected
# with a confusing "Invalid API key", so fail early with a clear message instead.
if not key.startswith("eyJ"):
    raise RuntimeError(
        "SUPABASE_SERVICE_KEY must be the legacy service_role JWT (starts with 'eyJ...'). "
        "Find it in Supabase -> Project Settings -> API Keys -> 'Legacy API Keys' tab -> service_role."
    )

supabase = create_client(url, key)
