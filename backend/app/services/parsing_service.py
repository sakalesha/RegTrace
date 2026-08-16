from app.agents.parsing_agent import ParsingAgent
from app.schemas.parsing import ParsingInput

class ParsingService:
    @staticmethod
    async def parse_document(document_id: str) -> dict:
        """
        Parses the document by its ID and returns the resulting ParsingOutput dict.
        """
        agent = ParsingAgent()
        input_data = ParsingInput(document_id=document_id)
        output = await agent.run(input_data)
        return output.dict()
