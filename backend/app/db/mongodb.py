from motor.motor_asyncio import AsyncIOMotorClient
from app.config import config

class MongoDB:
    client: AsyncIOMotorClient = None
    db = None

    @classmethod
    def connect(cls):
        if cls.client is None:
            cls.client = AsyncIOMotorClient(config.MONGODB_URI)
            cls.db = cls.client[config.DATABASE_NAME]

    @classmethod
    def disconnect(cls):
        if cls.client is not None:
            cls.client.close()
            cls.client = None
            cls.db = None

    @classmethod
    def get_db(cls):
        if cls.db is None:
            cls.connect()
        return cls.db

db = MongoDB()
