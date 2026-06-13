import os
import re
from sqlalchemy.orm import Session
from models import Movie
import tmdb

VIDEO_EXTENSIONS = ('.mkv', '.mp4', '.avi', '.m4v', '.mov', '.iso')

# Regex to find title and year, e.g., "Inception (2010)" or "Gladiator.2000.1080p"
YEAR_REGEX = re.compile(r'(.*?)\b(19\d{2}|20\d{2})\b')

def parse_filename(filename: str):
    # Remove extension
    name_without_ext, ext = os.path.splitext(filename)
    
    # Try to find a year
    match = YEAR_REGEX.search(name_without_ext)
    if match:
        raw_title = match.group(1)
        year_str = match.group(2)
        
        # Clean up title: remove dots, underscores, dashes, parentheses
        title = clean_title(raw_title)
        return title, int(year_str), ext[1:].upper()
    else:
        title = clean_title(name_without_ext)
        return title, None, ext[1:].upper()

def clean_title(title: str) -> str:
    # Replace dots, underscores with spaces
    title = title.replace('.', ' ').replace('_', ' ')
    # Remove bracketed or parenthesized tags (e.g. [1080p], (Dual Audio))
    title = re.sub(r'\[.*?\]|\(.*?\)', '', title)
    # Remove multiple spaces
    title = re.sub(r'\s+', ' ', title)
    # Strip trailing parentheses, brackets, dashes, underscores, and spaces
    return title.strip().rstrip('([-_ ')

scan_progress = {"status": "Idle", "current": 0, "total": 0}

def scan_directory(directory_path: str, db: Session):
    global scan_progress
    scan_progress = {"status": "Initializing...", "current": 0, "total": 0}
    
    if not os.path.exists(directory_path):
        scan_progress = {"status": "Directory not found", "current": 0, "total": 0}
        return []

    # Pre-scan video files to determine total count
    video_files = []
    for root, _, files in os.walk(directory_path):
        for file in files:
            if file.lower().endswith(VIDEO_EXTENSIONS):
                video_files.append((root, file))

    total = len(video_files)
    scan_progress["total"] = total
    
    if total == 0:
        scan_progress = {"status": "No movie files found in directory", "current": 0, "total": 0}
        return []

    results = []
    
    # Query database for existing backup paths to flag duplicates
    existing_paths = {m.backup_path for m in db.query(Movie).filter(Movie.backup_path.isnot(None)).all()}

    for idx, (root, file) in enumerate(video_files):
        current_num = idx + 1
        scan_progress["current"] = current_num
        scan_progress["status"] = f"Scanning file {current_num} of {total}: {file}"
        
        full_path = os.path.join(root, file)
        rel_path = os.path.relpath(full_path, directory_path)
        
        # Check if already imported
        already_imported = rel_path in existing_paths
        
        # If we have a folder structure like "Gladiator (2000)/Gladiator (2000).mkv",
        # the folder name might be a better source for parsing than the filename itself,
        # but let's parse both. We'll prioritize folder name if it has a year and filename doesn't.
        parent_dir = os.path.basename(root)
        
        p_title, p_year, p_ext = parse_filename(file)
        dir_title, dir_year, _ = parse_filename(parent_dir)
        
        # If parent dir has a year and filename doesn't, use parent dir details
        if dir_year and not p_year:
            final_title = dir_title
            final_year = dir_year
        else:
            final_title = p_title
            final_year = p_year
        
        # Search TMDB for a suggested match
        suggested_match = None
        if not already_imported and final_title:
            matches = tmdb.search_movies(final_title, final_year, db)
            if matches:
                suggested_match = matches[0] # Top match
        
        results.append({
            "file_path": rel_path,
            "filename": file,
            "parsed_title": final_title,
            "parsed_year": final_year,
            "extension": p_ext,
            "already_imported": already_imported,
            "suggested_match": suggested_match
        })
        
    scan_progress = {"status": f"Completed. Scanned {total} files.", "current": total, "total": total}
    return results
