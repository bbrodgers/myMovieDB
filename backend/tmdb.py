import os
import logging
import requests
from sqlalchemy.orm import Session
from models import AppSetting

logger = logging.getLogger(__name__)

def get_tmdb_api_key(db: Session = None) -> str:
    # 1. Try Environment Variable first
    api_key = os.getenv("TMDB_API_KEY")
    if api_key:
        return api_key.strip()
    
    # 2. Try DB config settings next
    if db:
        try:
            setting = db.query(AppSetting).filter(AppSetting.key == "tmdb_api_key").first()
            if setting and setting.value:
                return setting.value.strip()
        except Exception as e:
            logger.error(f"Error querying db for tmdb api key: {e}")
            
    return ""

def _get_request_config(api_key: str):
    headers = {}
    params = {}
    if api_key.startswith("eyJ"):
        headers["Authorization"] = f"Bearer {api_key}"
    else:
        params["api_key"] = api_key
    return headers, params

def search_movies(query: str, year: int = None, db: Session = None):
    api_key = get_tmdb_api_key(db)
    if not api_key:
        logger.warning("No TMDB API key configured. Returning mock search results.")
        return _get_mock_search_results(query, year)
    
    url = "https://api.themoviedb.org/3/search/movie"
    headers, params = _get_request_config(api_key)
    params.update({
        "query": query,
        "language": "en-US",
        "page": 1
    })
    if year:
        params["year"] = year
        params["primary_release_year"] = year

    try:
        response = requests.get(url, params=params, headers=headers, timeout=8)
        if response.status_code == 401:
            logger.error("TMDB API Key is unauthorized (401).")
            return []
        response.raise_for_status()
        data = response.json()
        results = []
        for item in data.get("results", []):
            poster_path = item.get("poster_path")
            poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else None
            results.append({
                "tmdb_id": str(item.get("id")),
                "title": item.get("title"),
                "release_year": item.get("release_date", "")[:4] if item.get("release_date") else None,
                "description": item.get("overview"),
                "poster_url": poster_url,
                "rating": item.get("vote_average"),
            })
        return results
    except Exception as e:
        logger.error(f"Error calling TMDB Search: {e}")
        return []

def get_movie_details(tmdb_id: str, db: Session = None):
    api_key = get_tmdb_api_key(db)
    if not api_key:
        return _get_mock_details(tmdb_id)
        
    url = f"https://api.themoviedb.org/3/movie/{tmdb_id}"
    headers, params = _get_request_config(api_key)
    params.update({
        "language": "en-US"
    })
    
    try:
        response = requests.get(url, params=params, headers=headers, timeout=8)
        response.raise_for_status()
        item = response.json()
        
        poster_path = item.get("poster_path")
        poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else None
        
        genres_list = [g.get("name") for g in item.get("genres", [])]
        genres_str = ",".join(genres_list) if genres_list else None
        
        return {
            "tmdb_id": str(item.get("id")),
            "title": item.get("title"),
            "release_year": item.get("release_date", "")[:4] if item.get("release_date") else None,
            "description": item.get("overview"),
            "poster_url": poster_url,
            "rating": item.get("vote_average"),
            "runtime": item.get("runtime"),
            "genres": genres_str
        }
    except Exception as e:
        logger.error(f"Error calling TMDB movie details: {e}")
        return None

def _get_mock_search_results(query: str, year: int = None):
    """Fallback search results to allow app features to be tested without an API key."""
    mocks = [
        {"title": "Gladiator", "year": 2000, "genres": "Action,Drama", "rating": 8.2, "runtime": 155, "desc": "A former Roman General sets out to exact vengeance against the corrupt emperor who murdered his family and sent him into slavery."},
        {"title": "Inception", "year": 2010, "genres": "Action,Sci-Fi,Adventure", "rating": 8.8, "runtime": 148, "desc": "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O."},
        {"title": "The Matrix", "year": 1999, "genres": "Action,Sci-Fi", "rating": 8.7, "runtime": 136, "desc": "When a beautiful stranger leads computer hacker Neo to a forbidding underworld, he discovers the shocking truth--the life he knows is the elaborate deception of an evil cyber intelligence."},
        {"title": "Interstellar", "year": 2014, "genres": "Adventure,Drama,Sci-Fi", "rating": 8.6, "runtime": 169, "desc": "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival."},
        {"title": "Pulp Fiction", "year": 1994, "genres": "Crime,Drama", "rating": 8.9, "runtime": 154, "desc": "The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption."}
    ]
    
    query_lower = query.lower()
    results = []
    
    for i, m in enumerate(mocks):
        if query_lower in m["title"].lower():
            if year and m["year"] != int(year):
                continue
            # Use a free static mockup image as poster placeholder
            results.append({
                "tmdb_id": f"mock-{i}",
                "title": m["title"],
                "release_year": m["year"],
                "description": m["desc"],
                "poster_url": f"https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&q=80", # high-quality splash movie poster placeholder
                "rating": m["rating"]
            })
            
    # If no results matched, add a generic one so testing still works
    if not results and query:
        results.append({
            "tmdb_id": "mock-generic",
            "title": query.capitalize(),
            "release_year": year or 2026,
            "description": f"No TMDB key configured. This is a placeholder description for '{query}'. Please configure a TMDB API key in settings to fetch real movie metadata.",
            "poster_url": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&q=80",
            "rating": 7.0
        })
    return results

def _get_mock_details(tmdb_id: str):
    """Fallback movie details."""
    mocks = {
        "mock-0": {"title": "Gladiator", "year": 2000, "genres": "Action,Drama", "rating": 8.2, "runtime": 155, "desc": "A former Roman General sets out to exact vengeance against the corrupt emperor who murdered his family and sent him into slavery."},
        "mock-1": {"title": "Inception", "year": 2010, "genres": "Action,Sci-Fi,Adventure", "rating": 8.8, "runtime": 148, "desc": "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O."},
        "mock-2": {"title": "The Matrix", "year": 1999, "genres": "Action,Sci-Fi", "rating": 8.7, "runtime": 136, "desc": "When a beautiful stranger leads computer hacker Neo to a forbidding underworld, he discovers the shocking truth--the life he knows is the elaborate deception of an evil cyber intelligence."},
        "mock-3": {"title": "Interstellar", "year": 2014, "genres": "Adventure,Drama,Sci-Fi", "rating": 8.6, "runtime": 169, "desc": "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival."},
        "mock-4": {"title": "Pulp Fiction", "year": 1994, "genres": "Crime,Drama", "rating": 8.9, "runtime": 154, "desc": "The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption."}
    }
    
    info = mocks.get(tmdb_id, {
        "title": "Mock Movie",
        "year": 2026,
        "genres": "Drama",
        "rating": 7.5,
        "runtime": 120,
        "desc": "This is fallback mock data since TMDB API key is not configured."
    })
    
    return {
        "tmdb_id": tmdb_id,
        "title": info["title"],
        "release_year": info["year"],
        "description": info["desc"],
        "poster_url": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&q=80",
        "rating": info["rating"],
        "runtime": info["runtime"],
        "genres": info["genres"]
    }
