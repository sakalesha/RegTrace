import os
import re
import glob

# Directory containing the agents
agents_dir = r"c:\Users\ronad\OneDrive\Desktop\Projects\WEB + ML\Reg2Action\agents"

# Regex pattern to match:
# 1. Optional comment about Next Agent
# 2. Optional import statement from agents
# 3. await <AgentClass>.process_document(document_id)
# 4. Optional return statement right after if it was part of gap.py early return

pattern = re.compile(r'(\s*#\s*(?:Next Agent:|Still trigger the next agent|Trigger next agent).*?\n)?(\s*from\s+agents\.\w+\s+import\s+\w+Agent\s*\n)?\s*await\s+[A-Za-z]+Agent\.process_document\([^)]+\)\s*\n', re.MULTILINE | re.IGNORECASE)

files = glob.glob(os.path.join(agents_dir, "*.py"))

for file_path in files:
    if os.path.basename(file_path) == "orchestrator.py":
        continue
    
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Also remove imports at the top of the file
    # e.g., from agents.gap import GapAnalysisAgent
    # We can match `from agents.xyz import XyzAgent` at the top level
    
    # Remove the invocation at the bottom
    new_content = pattern.sub('\n', content)
    
    # Also clean up any top-level imports from other agents
    top_level_import_pattern = re.compile(r'^from\s+agents\.\w+\s+import\s+\w+Agent\s*\n', re.MULTILINE)
    new_content = top_level_import_pattern.sub('', new_content)
    
    if content != new_content:
        print(f"Updated {os.path.basename(file_path)}")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(new_content)
    else:
        print(f"No changes needed in {os.path.basename(file_path)}")
