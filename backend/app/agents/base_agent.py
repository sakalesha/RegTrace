from abc import ABC, abstractmethod
from typing import Any

class BaseAgent(ABC):
    """
    Base class for all AI agents in the RegTrace workflow.
    Ensures a consistent interface: validate -> process -> validate -> persist.
    """
    
    async def run(self, input_data: Any) -> Any:
        await self.validate(input_data)
        output = await self.process(input_data)
        await self.validate_output(output)
        await self.persist(output)
        return output

    @abstractmethod
    async def validate(self, input_data: Any):
        """Validate the input data before processing."""
        pass

    @abstractmethod
    async def process(self, input_data: Any) -> Any:
        """Core logic of the agent."""
        pass

    @abstractmethod
    async def validate_output(self, output_data: Any):
        """Validate the output data before persisting."""
        pass

    @abstractmethod
    async def persist(self, output_data: Any):
        """Persist the output data to the database or storage."""
        pass
