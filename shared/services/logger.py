import logging
import sys
from typing import Optional

def setup_logger():
    logger = logging.getLogger("Reg2Action")
    if not logger.handlers:
        logger.setLevel(logging.INFO)
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    return logger

app_logger = setup_logger()

class Logger:
    @staticmethod
    def info(agent_name: str, message: str):
        app_logger.info(f"[{agent_name}] {message}")
        
    @staticmethod
    def error(agent_name: str, message: str, exc: Optional[Exception] = None):
        if exc:
            app_logger.error(f"[{agent_name}] {message} - {str(exc)}")
        else:
            app_logger.error(f"[{agent_name}] {message}")
            
    @staticmethod
    def warning(agent_name: str, message: str):
        app_logger.warning(f"[{agent_name}] {message}")
