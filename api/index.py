import os
import sys

# Make the backend package importable when deployed as a single Vercel project.
BACKEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from mangum import Mangum
from app.main import app

handler = Mangum(app)
