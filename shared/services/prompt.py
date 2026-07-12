import os

class PromptService:
    @staticmethod
    def load(agent: str, prompt_type: str) -> str:
        """
        Loads a prompt from the global prompts/ directory.
        agent: e.g. "obligation", "task", "evidence", "evaluation", "gap"
        prompt_type: e.g. "system", "human"
        """
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "prompts"))
        filename = f"{agent}_{prompt_type}.txt"
        file_path = os.path.join(base_dir, filename)
        
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Prompt file not found: {file_path}")
            
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read().strip()
