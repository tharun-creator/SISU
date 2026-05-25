import os
import sys

def search(path, query, case_insensitive=True):
    query_clean = query.lower() if case_insensitive else query
    results = []
    
    for root, dirs, files in os.walk(path):
        if "node_modules" in root or "venv" in root or ".git" in root or "__pycache__" in root:
            continue
        for file in files:
            file_path = os.path.join(root, file)
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    for line_num, line in enumerate(f, 1):
                        line_clean = line.lower() if case_insensitive else line
                        if query_clean in line_clean:
                            results.append((file_path, line_num, line.strip()))
            except Exception as e:
                pass
    return results

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python search_file.py <path> <query>")
        sys.exit(1)
    
    path = sys.argv[1]
    query = sys.argv[2]
    print(f"Searching for '{query}' in {path}...")
    res = search(path, query)
    print(f"Found {len(res)} matches:")
    for r in res[:50]:
        print(f"{r[0]}:{r[1]} -> {r[2]}")
