import datetime
from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, Text
from database import Base

class Movie(Base):
    __tablename__ = "movies"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    release_year = Column(Integer, nullable=True)
    description = Column(Text, nullable=True)
    poster_url = Column(String(500), nullable=True)
    tmdb_id = Column(String(50), nullable=True)
    rating = Column(Float, nullable=True)
    runtime = Column(Integer, nullable=True) # in minutes
    genres = Column(String(255), nullable=True) # Comma-separated list

    # Ownership & Formats
    owned = Column(Boolean, default=True, index=True)
    is_physical = Column(Boolean, default=False)
    physical_format = Column(String(50), nullable=True) # 'DVD', 'Blu-ray', '4K UHD', 'VHS', etc.
    is_digital = Column(Boolean, default=False)
    digital_format = Column(String(50), nullable=True) # 'MKV', 'MP4', 'ISO', etc.

    # Backup Details
    is_backed_up = Column(Boolean, default=False, index=True)
    backup_location = Column(String(255), nullable=True) # 'NAS-1', 'External Drive A', etc.
    backup_path = Column(String(500), nullable=True) # Relative path to movie mount folder

    # Metadata
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class AppSetting(Base):
    __tablename__ = "app_settings"

    key = Column(String(255), primary_key=True)
    value = Column(Text, nullable=True)
