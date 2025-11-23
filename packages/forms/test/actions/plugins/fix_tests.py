import re
import glob

for filepath in glob.glob('*.test.ts'):
    with open(filepath, 'r') as f:
        content = f.read()
    
    original_content = content
    # Replace pattern - match the entire plugin.execute call with old signature
    content = re.sub(
        r'plugin\.execute\(\{\s*trigger:\s*[^,]+,\s*context\s*\},\s*action\)', 
        'plugin.execute(context)',
        content
    )
    
    if content != original_content:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated {filepath}")
    else:
        print(f"No changes needed for {filepath}")
