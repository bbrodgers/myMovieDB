from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import os

from database import engine, Base, get_db
import models
import tmdb
import scanner

# Auto-create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="MyMovieDB API", version="1.0.0")

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas
from pydantic import BaseModel

class MovieBase(BaseModel):
    title: str
    release_year: Optional[int] = None
    description: Optional[str] = None
    poster_url: Optional[str] = None
    tmdb_id: Optional[str] = None
    rating: Optional[float] = None
    runtime: Optional[int] = None
    genres: Optional[str] = None
    
    owned: bool = True
    is_physical: bool = False
    physical_format: Optional[str] = None
    is_digital: bool = False
    digital_format: Optional[str] = None
    
    is_backed_up: bool = False
    backup_location: Optional[str] = None
    backup_path: Optional[str] = None

class MovieCreate(MovieBase):
    pass

class MovieUpdate(MovieBase):
    pass

class MovieResponse(MovieBase):
    id: int
    created_at: str
    updated_at: str

    class Config:
        orm_mode = True
        from_attributes = True

class ImportRequest(BaseModel):
    file_path: str
    title: str
    release_year: Optional[int] = None
    tmdb_id: Optional[str] = None
    is_physical: bool = False
    physical_format: Optional[str] = None
    is_digital: bool = True
    digital_format: Optional[str] = None
    is_backed_up: bool = True
    backup_location: Optional[str] = None
    owned: Optional[bool] = True

class SettingUpdate(BaseModel):
    tmdb_api_key: str

class BulkDeleteRequest(BaseModel):
    ids: List[int]

class BulkUpdateRequest(BaseModel):
    ids: List[int]
    owned: Optional[bool] = None
    is_backed_up: Optional[bool] = None

# Endpoints

@app.get("/api/movies")
def get_movies(
    search: Optional[str] = None,
    owned: Optional[str] = "all", # "owned", "wishlist", "all"
    format: Optional[str] = "all", # "physical", "digital", "both", "all"
    status: Optional[str] = "all", # "backed_up", "pending_backup", "all"
    db: Session = Depends(get_db)
):
    query = db.query(models.Movie)
    
    if search:
        query = query.filter(models.Movie.title.ilike(f"%{search}%"))
        
    if owned == "owned":
        query = query.filter(models.Movie.owned == True)
    elif owned == "wishlist":
        query = query.filter(models.Movie.owned == False, models.Movie.is_digital == False)
    elif owned == "need_physical":
        query = query.filter(models.Movie.owned == False, models.Movie.is_digital == True)
    elif owned == "shopping_list":
        query = query.filter(models.Movie.owned == False)
        
    if format == "physical":
        query = query.filter(models.Movie.is_physical == True)
    elif format == "digital":
        query = query.filter(models.Movie.is_digital == True)
    elif format == "both":
        query = query.filter(models.Movie.is_physical == True, models.Movie.is_digital == True)
        
    if status == "backed_up":
        query = query.filter(models.Movie.is_backed_up == True)
    elif status == "pending_backup":
        query = query.filter(models.Movie.is_backed_up == False, models.Movie.owned == True)
        
    # Sort by created_at desc (newest first)
    query = query.order_by(models.Movie.created_at.desc())
    
    movies = query.all()
    
    # Standardize output for datetime conversion
    results = []
    for m in movies:
        m_dict = {c.name: getattr(m, c.name) for c in m.__table__.columns}
        m_dict["created_at"] = m.created_at.isoformat() if m.created_at else ""
        m_dict["updated_at"] = m.updated_at.isoformat() if m.updated_at else ""
        results.append(m_dict)
        
    return results

@app.get("/api/movies/{movie_id}")
def get_movie(movie_id: int, db: Session = Depends(get_db)):
    movie = db.query(models.Movie).filter(models.Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    return movie

@app.post("/api/movies")
def create_movie(movie_in: MovieCreate, db: Session = Depends(get_db)):
    # Check if duplicate by tmdb_id
    if movie_in.tmdb_id:
        existing = db.query(models.Movie).filter(models.Movie.tmdb_id == movie_in.tmdb_id).first()
        if existing:
            # If it already exists, just return it or raise exception
            # For ease, let's allow duplicates if backup path or formats differ, or prompt
            pass
            
    db_movie = models.Movie(**movie_in.dict())
    db.add(db_movie)
    db.commit()
    db.refresh(db_movie)
    return db_movie

@app.put("/api/movies/{movie_id}")
def update_movie(movie_id: int, movie_in: MovieUpdate, db: Session = Depends(get_db)):
    db_movie = db.query(models.Movie).filter(models.Movie.id == movie_id).first()
    if not db_movie:
        raise HTTPException(status_code=404, detail="Movie not found")
        
    for field, value in movie_in.model_dump().items():
        setattr(db_movie, field, value)
        
    db.commit()
    db.refresh(db_movie)
    return db_movie

@app.delete("/api/movies/{movie_id}")
def delete_movie(movie_id: int, db: Session = Depends(get_db)):
    db_movie = db.query(models.Movie).filter(models.Movie.id == movie_id).first()
    if not db_movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    db.delete(db_movie)
    db.commit()
    return {"message": "Movie deleted successfully"}

@app.post("/api/movies/bulk-delete")
def bulk_delete_movies(req: BulkDeleteRequest, db: Session = Depends(get_db)):
    db.query(models.Movie).filter(models.Movie.id.in_(req.ids)).delete(synchronize_session=False)
    db.commit()
    return {"message": f"Successfully deleted {len(req.ids)} movies"}

@app.post("/api/movies/bulk-update")
def bulk_update_movies(req: BulkUpdateRequest, db: Session = Depends(get_db)):
    update_data = {}
    if req.owned is not None:
        update_data[models.Movie.owned] = req.owned
    if req.is_backed_up is not None:
        update_data[models.Movie.is_backed_up] = req.is_backed_up
        
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
        
    db.query(models.Movie).filter(models.Movie.id.in_(req.ids)).update(update_data, synchronize_session=False)
    db.commit()
    return {"message": f"Successfully updated {len(req.ids)} movies"}

# Directory Scan & Import Endpoints

@app.get("/api/scan")
def scan_movies_directory(db: Session = Depends(get_db)):
    movies_dir = "/movies"
    if not os.path.exists(movies_dir):
        # Fallback for local development relative to main.py
        movies_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../movies")
        
    if not os.path.exists(movies_dir):
        logger_msg = f"Directory {movies_dir} not mounted or missing."
        return {"error": logger_msg, "results": []}
    
    results = scanner.scan_directory(movies_dir, db)
    return {"results": results}

@app.get("/api/scan/progress")
def get_scan_progress():
    return scanner.scan_progress

@app.post("/api/scan/import")
def import_scanned_movie(req: ImportRequest, db: Session = Depends(get_db)):
    # 1. Fetch full details from TMDB if tmdb_id is available
    movie_details = {}
    if req.tmdb_id:
        fetched = tmdb.get_movie_details(req.tmdb_id, db)
        if fetched:
            movie_details = fetched
            
    # 2. Combine files with details
    title = movie_details.get("title", req.title)
    release_year = movie_details.get("release_year", req.release_year)
    description = movie_details.get("description", "")
    poster_url = movie_details.get("poster_url", "")
    rating = movie_details.get("rating", 0.0)
    runtime = movie_details.get("runtime", 0)
    genres = movie_details.get("genres", "")
    
    # Check if this exact backup path is already in the db
    existing = db.query(models.Movie).filter(models.Movie.backup_path == req.file_path).first()
    if existing:
        raise HTTPException(status_code=400, detail="Movie file already imported")

    # Determine digital format extension from filename if not specified
    digital_format = req.digital_format
    if not digital_format and req.file_path:
        _, ext = os.path.splitext(req.file_path)
        if ext:
            digital_format = ext[1:].upper()

    db_movie = models.Movie(
        title=title,
        release_year=release_year,
        description=description,
        poster_url=poster_url,
        tmdb_id=req.tmdb_id,
        rating=rating,
        runtime=runtime,
        genres=genres,
        owned=req.owned if req.owned is not None else True,
        is_physical=req.is_physical,
        physical_format=req.physical_format,
        is_digital=req.is_digital,
        digital_format=digital_format,
        is_backed_up=req.is_backed_up,
        backup_location=req.backup_location,
        backup_path=req.file_path
    )
    
    db.add(db_movie)
    db.commit()
    db.refresh(db_movie)
    return db_movie

# Settings Endpoints

@app.get("/api/settings")
def get_settings(db: Session = Depends(get_db)):
    setting = db.query(models.AppSetting).filter(models.AppSetting.key == "tmdb_api_key").first()
    
    # Hide key values partially for safety, but for configuration we might want to return if they've set it
    has_key = False
    if setting and setting.value:
        has_key = True
        
    # Return if env var is configured
    env_key = os.getenv("TMDB_API_KEY")
    if env_key:
        has_key = True
        
    return {
        "tmdb_api_key_configured": has_key
    }

@app.post("/api/settings")
def update_settings(settings: SettingUpdate, db: Session = Depends(get_db)):
    setting = db.query(models.AppSetting).filter(models.AppSetting.key == "tmdb_api_key").first()
    if not setting:
        setting = models.AppSetting(key="tmdb_api_key", value=settings.tmdb_api_key)
        db.add(setting)
    else:
        setting.value = settings.tmdb_api_key
        
    db.commit()
    return {"message": "Settings updated successfully"}

# TMDB Proxy Search for manual adding

@app.get("/api/tmdb/search")
def search_tmdb(query: str, year: Optional[int] = None, db: Session = Depends(get_db)):
    if not query:
        return []
    return tmdb.search_movies(query, year, db)

# Stats Endpoint

@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    total = db.query(models.Movie).count()
    physical = db.query(models.Movie).filter(models.Movie.is_physical == True).count()
    digital = db.query(models.Movie).filter(models.Movie.is_digital == True).count()
    backed_up = db.query(models.Movie).filter(models.Movie.is_backed_up == True, models.Movie.owned == True).count()
    wishlist = db.query(models.Movie).filter(models.Movie.owned == False, models.Movie.is_digital == False).count()
    need_physical = db.query(models.Movie).filter(models.Movie.owned == False, models.Movie.is_digital == True).count()
    owned_count = db.query(models.Movie).filter(models.Movie.owned == True).count()
    
    backup_percentage = 0
    if owned_count > 0:
        backup_percentage = round((backed_up / owned_count) * 100)
        
    return {
        "total_movies": total,
        "owned_movies": owned_count,
        "physical_count": physical,
        "digital_count": digital,
        "backed_up_count": backed_up,
        "wishlist_count": wishlist,
        "need_physical_count": need_physical,
        "backup_percentage": backup_percentage
    }
