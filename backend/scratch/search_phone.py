import os
import re

search_dir = r"c:\Users\mohan\Downloads\sisu-booking-system"
phone_pattern = re.compile(r'\+?\d[\d -]{8,12}\d')

for root, dirs, files in os.walk(search_dir):
    dirs[:] = [d for d in dirs if d not in ('venv', '.git', '__pycache__', 'chatmodel.zip', 'node_modules')]
    for file in files:
        if file.endswith('.html') or file.endswith('.js') or file.endswith('.jsx') or file.endswith('.py'):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    matches = phone_pattern.findall(content)
                    if matches:
                        # filter out standard code/dates
                        real_matches = [m for m in matches if any(char.isdigit() for char in m) and len(m.replace('-', '').replace(' ', '').strip()) >= 9]
                        if real_matches:
                            print(f"Found in: {path}")
                            print(f"  Matches: {real_matches}")
            except Exception as e:
                pass
