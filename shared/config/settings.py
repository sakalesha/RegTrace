from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator, Field

class Settings(BaseSettings):
    # MongoDB
    mongodb_uri: str
    mongodb_db_name: str
    
    groq_api_key: str
    llm_model: str = "llama-3.3-70b-versatile"
    
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "password"
    
    # Auth
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    
    demo_mode: bool = True
    
    # Vector Search Settings
    vector_index_name: str = "clause_vector_index"
    vector_collection_name: str = "clauses"
    vector_field_name: str = "embedding"
    
    # Scheduler Settings
    monitoring_job_timezone: str = "Asia/Kolkata"
    
    # Gap Detection
    stale_deadline_threshold_days: int = Field(default=7, gt=0)
    
    @field_validator('mongodb_db_name', 'mongodb_uri', mode='before')
    @classmethod
    def strip_quotes(cls, v):
        if isinstance(v, str):
            return v.strip(' "\'')
        return v
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
