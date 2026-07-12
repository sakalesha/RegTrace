from abc import ABC, abstractmethod
from shared.schemas.pipeline import ExecutionContext

class BaseAgent(ABC):
    @classmethod
    @abstractmethod
    async def execute(cls, context: ExecutionContext) -> ExecutionContext:
        """
        Executes the agent's core logic.
        Reads necessary data from `context` or the database (via context.document_id),
        updates MongoDB/Neo4j, and returns the context.
        """
        pass
