#!/usr/bin/env python3
import requests
import json
import os
import zipfile
import shutil
from pathlib import Path

def main():
    url = "https://app.codeguide.dev/api/urls/db0f1f40-a147-48e1-8f45-c98f2254d1c5?download=true"
    
    # Create project root directory if it doesn't exist
    project_root = Path(os.path.dirname(os.path.abspath(__file__)))
    documentation_dir = project_root / "documentation"
    
    # Make the request to the URL
    print(f"Requesting URL: {url}")
    response = requests.get(url)
    
    # Check if the response is JSON
    try:
        json_response = response.json()
        print("URL returned JSON response:")
        print(json.dumps(json_response, indent=2))
        print("\nThe URL returned a JSON response, which may indicate it has expired.")
        print("Please follow the instructions in the JSON response.")
        return
    except json.JSONDecodeError:
        # Not JSON, assume it's a blob
        print("URL returned a blob (binary data).")
        
        # Save the blob to a zip file
        zip_path = project_root / "downloaded_project.zip"
        with open(zip_path, 'wb') as f:
            f.write(response.content)
        print(f"Downloaded project files to {zip_path}")
        
        # Create documentation directory
        if documentation_dir.exists():
            shutil.rmtree(documentation_dir)
        documentation_dir.mkdir(exist_ok=True)
        
        # Extract the zip file
        try:
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(documentation_dir)
            print(f"Extracted files to {documentation_dir}")
            
            # List the extracted files
            print("\nExtracted files:")
            for root, dirs, files in os.walk(documentation_dir):
                level = root.replace(str(documentation_dir), '').count(os.sep)
                indent = ' ' * 4 * level
                print(f"{indent}{os.path.basename(root)}/")
                sub_indent = ' ' * 4 * (level + 1)
                for file in files:
                    print(f"{sub_indent}{file}")
            
            # Check for implementation_plan.md
            implementation_plan = documentation_dir / "implementation_plan.md"
            if implementation_plan.exists():
                print("\nFound implementation_plan.md. Please follow the instructions in this file.")
            else:
                print("\nNo implementation_plan.md found. Please proceed with implementation based on other documents.")
                
        except zipfile.BadZipFile:
            print("Error: The downloaded file is not a valid zip file.")
            return

if __name__ == "__main__":
    main()
