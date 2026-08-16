import os
import sys

# Ensure the backend package root is importable when run as a Vercel
# Python serverless function.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mangum import Mangum
from app.main import app

handler = Mangum(app)
