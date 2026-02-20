from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from .config import settings

def get_db_client():
    try:
        # Set a short timeout for the connection verification
        client = MongoClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
        # The ismaster command is cheap and does not require auth.
        client.admin.command('ismaster')
        return client
    except (ConnectionFailure, ServerSelectionTimeoutError) as e:
        print(f"Connection to MongoDB failed: {e}")
        return None
