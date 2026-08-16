import asyncio
import os
import sys
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.agents.task_generation_agent import TaskGenerationAgent
from app.agents.task_assignment_agent import TaskAssignmentAgent
from app.models.obligation import ObligationModel

load_dotenv()


async def main():
    if not os.environ.get("GROQ_API_KEY"):
        print("ERROR: GROQ_API_KEY is not set.")
        return

    sample_obligation = ObligationModel(
        _id="000000000000000000000000",
        document_id="sample-doc",
        clause_id="sample-clause",
        actor="Stock Broker",
        action="Name all new bank and demat accounts as per the prescribed nomenclature and "
               "communicate the details to the Stock Exchange within one week of opening.",
        condition="When opening a new bank or demat account",
        deadline="Within one week of opening",
        frequency="Event-driven",
        is_mandatory=True,
        confidence_score=0.95,
    )

    generation_agent = TaskGenerationAgent()
    assignment_agent = TaskAssignmentAgent()

    print("Running task generation on sample obligation...")
    print("-" * 40)
    print(sample_obligation.model_dump_json(indent=2))
    print("-" * 40)

    try:
        result = await generation_agent.run(sample_obligation)
        print("Generated Tasks:")
        print(result.model_dump_json(indent=2))

        for task in result.tasks:
            assigned = await assignment_agent.run({
                "title": task.title,
                "description": task.description,
                "category": task.category,
            })
            print(f"\nAssigned department for '{task.title}': {assigned.value}")
    except Exception as e:
        print(f"Error during task generation: {e}")


if __name__ == "__main__":
    asyncio.run(main())