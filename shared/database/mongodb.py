from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from shared.config.settings import settings

class MongoDBManager:
    client: AsyncIOMotorClient = None
    
    @classmethod
    def connect(cls):
        cls.client = AsyncIOMotorClient(settings.mongodb_uri)
        
    @classmethod
    def disconnect(cls):
        if cls.client:
            cls.client.close()
            
    @classmethod
    def get_db(cls):
        if not cls.client:
            cls.connect()
        return cls.client[settings.mongodb_db_name]

    @classmethod
    def get_gridfs(cls):
        return AsyncIOMotorGridFSBucket(cls.get_db())

def get_db():
    return MongoDBManager.get_db()
