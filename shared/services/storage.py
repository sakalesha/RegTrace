import os

class StorageService:
    @staticmethod
    def ensure_dir(path: str):
        os.makedirs(path, exist_ok=True)
        
    @staticmethod
    def save_text(file_path: str, content: str):
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
            
    @staticmethod
    def read_text(file_path: str) -> str:
        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
        return f"[File Missing: {file_path}]"
