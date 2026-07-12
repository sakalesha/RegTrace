from neo4j import GraphDatabase
from shared.config.settings import settings

class Neo4jManager:
    driver = None

    @classmethod
    def connect(cls):
        try:
            cls.driver = GraphDatabase.driver(
                settings.neo4j_uri,
                auth=(settings.neo4j_user, settings.neo4j_password)
            )
            # Verify connectivity
            cls.driver.verify_connectivity()
            print("Successfully connected to Neo4j.")
        except Exception as e:
            print(f"Failed to connect to Neo4j. Check credentials in .env! Error: {e}")
            cls.driver = None

    @classmethod
    def disconnect(cls):
        if cls.driver:
            cls.driver.close()

    @classmethod
    def get_driver(cls):
        if not cls.driver:
            cls.connect()
        return cls.driver

    @classmethod
    def execute_query(cls, query: str, parameters: dict = None):
        driver = cls.get_driver()
        if not driver:
            print("Skipping graph creation: Neo4j is not connected.")
            return []
            
        with driver.session() as session:
            result = session.run(query, parameters)
            return [record.data() for record in result]
