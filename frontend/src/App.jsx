import React, { useState, useEffect } from 'react';
import { 
  Film, 
  FolderOpen, 
  Settings as SettingsIcon, 
  Plus, 
  Search, 
  Database, 
  HardDrive, 
  FileVideo, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Trash2, 
  Edit3, 
  X,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Loader2
} from 'lucide-react';

const API_BASE = window.location.port === '3000' || window.location.port === '5173'
  ? `http://${window.location.hostname}:8000`
  : ''; // Serve via relative path in production proxy

export default function App() {
  // Navigation & UI state
  const [activeTab, setActiveTab] = useState('library');
  const [movies, setMovies] = useState([]);
  const [stats, setStats] = useState({
    total_movies: 0,
    owned_movies: 0,
    physical_count: 0,
    digital_count: 0,
    backed_up_count: 0,
    wishlist_count: 0,
    backup_percentage: 0
  });

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [ownedFilter, setOwnedFilter] = useState('all'); // all, owned, wishlist
  const [formatFilter, setFormatFilter] = useState('all'); // all, physical, digital, both
  const [statusFilter, setStatusFilter] = useState('all'); // all, backed_up, pending_backup

  // Modal States
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Settings State
  const [tmdbApiKey, setTmdbApiKey] = useState('');
  const [settingsConfigured, setSettingsConfigured] = useState(false);

  // Scanning State
  const [scannedFiles, setScannedFiles] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [batchLocation, setBatchLocation] = useState('NAS-1');
  const [batchPhysicalFormat, setBatchPhysicalFormat] = useState('None');

  // Fetch movies and stats
  const fetchMovies = async () => {
    try {
      const url = new URL(`${API_BASE}/api/movies`);
      if (searchQuery) url.searchParams.append('search', searchQuery);
      if (ownedFilter !== 'all') url.searchParams.append('owned', ownedFilter);
      if (formatFilter !== 'all') url.searchParams.append('format', formatFilter);
      if (statusFilter !== 'all') url.searchParams.append('status', statusFilter);

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMovies(data);
      }
    } catch (err) {
      console.error('Error fetching movies:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchSettingsStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/settings`);
      if (res.ok) {
        const data = await res.json();
        setSettingsConfigured(data.tmdb_api_key_configured);
      }
    } catch (err) {
      console.error('Error fetching settings status:', err);
    }
  };

  useEffect(() => {
    fetchMovies();
    fetchStats();
  }, [searchQuery, ownedFilter, formatFilter, statusFilter]);

  useEffect(() => {
    fetchSettingsStatus();
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'library') {
      fetchMovies();
      fetchStats();
    }
  };

  // Movie CRUD
  const handleDeleteMovie = async (movieId) => {
    if (!window.confirm('Are you sure you want to delete this movie from your database?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/movies/${movieId}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedMovie(null);
        fetchMovies();
        fetchStats();
      }
    } catch (err) {
      console.error('Error deleting movie:', err);
    }
  };

  // Add Movie / TMDB search subcomponent state
  const [manualMovieForm, setManualMovieForm] = useState({
    title: '',
    release_year: '',
    description: '',
    poster_url: '',
    tmdb_id: '',
    rating: '',
    runtime: '',
    genres: '',
    owned: true,
    is_physical: false,
    physical_format: 'Blu-ray',
    is_digital: false,
    digital_format: 'MKV',
    is_backed_up: false,
    backup_location: 'NAS-1',
    backup_path: ''
  });

  const [tmdbSearchQuery, setTmdbSearchQuery] = useState('');
  const [tmdbSearchResults, setTmdbSearchResults] = useState([]);
  const [isSearchingTmdb, setIsSearchingTmdb] = useState(false);
  const [addModalTab, setAddModalTab] = useState('search'); // 'search' or 'form'

  const handleTmdbSearch = async () => {
    if (!tmdbSearchQuery) return;
    setIsSearchingTmdb(true);
    try {
      const res = await fetch(`${API_BASE}/api/tmdb/search?query=${encodeURIComponent(tmdbSearchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setTmdbSearchResults(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingTmdb(false);
    }
  };

  const selectTmdbMatch = async (item) => {
    // Populate form fields
    setManualMovieForm({
      ...manualMovieForm,
      title: item.title,
      release_year: item.release_year || '',
      description: item.description || '',
      poster_url: item.poster_url || '',
      tmdb_id: item.tmdb_id || '',
      rating: item.rating || '',
      runtime: item.runtime || ''
    });
    setAddModalTab('form');
  };

  const handleSaveMovie = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...manualMovieForm };
      
      // Clean up fields
      payload.release_year = payload.release_year ? parseInt(payload.release_year) : null;
      payload.rating = payload.rating ? parseFloat(payload.rating) : null;
      payload.runtime = payload.runtime ? parseInt(payload.runtime) : null;
      
      if (!payload.is_physical) payload.physical_format = null;
      if (!payload.is_digital) {
        payload.digital_format = null;
        payload.is_backed_up = false;
        payload.backup_location = null;
        payload.backup_path = null;
      }

      let res;
      if (isEditing) {
        res = await fetch(`${API_BASE}/api/movies/${selectedMovie.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${API_BASE}/api/movies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        setIsAddModalOpen(false);
        setIsEditing(false);
        setSelectedMovie(null);
        fetchMovies();
        fetchStats();
        // Reset form
        setManualMovieForm({
          title: '',
          release_year: '',
          description: '',
          poster_url: '',
          tmdb_id: '',
          rating: '',
          runtime: '',
          genres: '',
          owned: true,
          is_physical: false,
          physical_format: 'Blu-ray',
          is_digital: false,
          digital_format: 'MKV',
          is_backed_up: false,
          backup_location: 'NAS-1',
          backup_path: ''
        });
        setTmdbSearchQuery('');
        setTmdbSearchResults([]);
        setAddModalTab('search');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openEditModal = (movie) => {
    setManualMovieForm({
      title: movie.title,
      release_year: movie.release_year || '',
      description: movie.description || '',
      poster_url: movie.poster_url || '',
      tmdb_id: movie.tmdb_id || '',
      rating: movie.rating || '',
      runtime: movie.runtime || '',
      genres: movie.genres || '',
      owned: movie.owned,
      is_physical: movie.is_physical,
      physical_format: movie.physical_format || 'Blu-ray',
      is_digital: movie.is_digital,
      digital_format: movie.digital_format || 'MKV',
      is_backed_up: movie.is_backed_up,
      backup_location: movie.backup_location || 'NAS-1',
      backup_path: movie.backup_path || ''
    });
    setIsEditing(true);
    setAddModalTab('form');
    setIsAddModalOpen(true);
  };

  // Scanning triggers
  const handleScanDirectory = async () => {
    setIsScanning(true);
    setScanMessage('Scanning movies directory...');
    try {
      const res = await fetch(`${API_BASE}/api/scan`);
      if (res.ok) {
        const data = await res.json();
        if (data.error) {
          setScanMessage(data.error);
        } else {
          setScannedFiles(data.results);
          setScanMessage(`Scanning completed. Found ${data.results.length} movie files.`);
        }
      } else {
        setScanMessage('Scanning failed.');
      }
    } catch (err) {
      setScanMessage('Error scanning directory.');
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleImportScanned = async (scannedItem, overrideMatch = null) => {
    const match = overrideMatch || scannedItem.suggested_match;
    if (!match) {
      alert('Cannot import without a movie match. Please resolve search suggestion.');
      return;
    }

    try {
      const isPhysical = batchPhysicalFormat !== 'None';
      const payload = {
        file_path: scannedItem.file_path,
        title: match.title,
        release_year: match.release_year ? parseInt(match.release_year) : null,
        tmdb_id: match.tmdb_id,
        is_physical: isPhysical,
        physical_format: isPhysical ? batchPhysicalFormat : null,
        is_digital: true,
        digital_format: scannedItem.extension,
        is_backed_up: true,
        backup_location: batchLocation
      };

      const res = await fetch(`${API_BASE}/api/scan/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        // Mark as imported in UI
        setScannedFiles(prev => prev.map(item => {
          if (item.file_path === scannedItem.file_path) {
            return { ...item, already_imported: true };
          }
          return item;
        }));
        fetchStats();
      } else {
        const errData = await res.json();
        alert(`Error importing: ${errData.detail}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBatchImport = async () => {
    const unimported = scannedFiles.filter(item => !item.already_imported && item.suggested_match);
    if (unimported.length === 0) {
      alert('No unimported items with valid matches to batch import.');
      return;
    }

    if (!window.confirm(`Are you sure you want to batch import ${unimported.length} movies?`)) return;

    setScanMessage(`Batch importing ${unimported.length} files...`);
    
    for (const item of unimported) {
      await handleImportScanned(item);
    }

    setScanMessage('Batch import completed.');
    // Re-scan to clean list status
    handleScanDirectory();
  };

  // Scanned item manual correction
  const [correctingIndex, setCorrectingIndex] = useState(null);
  const [correctQuery, setCorrectQuery] = useState('');
  const [correctResults, setCorrectResults] = useState([]);
  const [isCorrectingSearch, setIsCorrectingSearch] = useState(false);

  const startCorrection = (index, currentTitle) => {
    setCorrectingIndex(index);
    setCorrectQuery(currentTitle);
    setCorrectResults([]);
  };

  const searchCorrection = async () => {
    setIsCorrectingSearch(true);
    try {
      const res = await fetch(`${API_BASE}/api/tmdb/search?query=${encodeURIComponent(correctQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setCorrectResults(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCorrectingSearch(false);
    }
  };

  const selectCorrection = (index, matchItem) => {
    setScannedFiles(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, suggested_match: matchItem };
      }
      return item;
    }));
    setCorrectingIndex(null);
  };

  // Settings management
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmdb_api_key: tmdbApiKey })
      });
      if (res.ok) {
        alert('Settings saved successfully!');
        setTmdbApiKey('');
        fetchSettingsStatus();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="logo">
          <Film size={28} className="text-accent" style={{ stroke: '#6366f1' }} />
          My<span>MovieDB</span>
        </div>
        
        <nav style={{ flex: 1 }}>
          <ul className="nav-menu">
            <li 
              className={`nav-item ${activeTab === 'library' ? 'active' : ''}`}
              onClick={() => handleTabChange('library')}
            >
              <Database size={20} />
              Library Grid
            </li>
            <li 
              className={`nav-item ${activeTab === 'scan' ? 'active' : ''}`}
              onClick={() => handleTabChange('scan')}
            >
              <FolderOpen size={20} />
              Scan & Import
            </li>
            <li 
              className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => handleTabChange('settings')}
            >
              <SettingsIcon size={20} />
              Settings
            </li>
          </ul>
        </nav>

        <div className="text-muted" style={{ fontSize: '0.8rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          Local Database Sidecar
        </div>
      </aside>

      {/* Main Container */}
      <main className="main-content">
        
        {/* TAB 1: LIBRARY VIEW */}
        {activeTab === 'library' && (
          <div>
            <header className="top-header">
              <div>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>Personal Library</h1>
                <p className="text-muted">Track backups, wishlists, and physical media formats.</p>
              </div>
              <button className="btn btn-primary" onClick={() => { setIsEditing(false); setIsAddModalOpen(true); }}>
                <Plus size={18} />
                Add Movie
              </button>
            </header>

            {/* Quick Metrics */}
            <div className="stats-container">
              <div className="stat-card">
                <span className="stat-title">Library Size</span>
                <span className="stat-val">{stats.total_movies}</span>
                <span className="text-muted" style={{ fontSize: '0.8rem' }}>Movies catalogued</span>
              </div>
              <div className="stat-card">
                <span className="stat-title">Physical Media</span>
                <span className="stat-val">{stats.physical_count}</span>
                <span className="text-muted" style={{ fontSize: '0.8rem' }}>Blu-ray, DVD, UHD</span>
              </div>
              <div className="stat-card">
                <span className="stat-title">Digitized Files</span>
                <span className="stat-val">{stats.digital_count}</span>
                <span className="text-muted" style={{ fontSize: '0.8rem' }}>MKV, MP4 backups</span>
              </div>
              <div className="stat-card backup">
                <span className="stat-title">Backup Health</span>
                <span className="stat-val">{stats.backup_percentage}%</span>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: `${stats.backup_percentage}%` }}></div>
                </div>
              </div>
            </div>

            {/* Filtering Toolbar */}
            <div className="toolbar">
              <div className="search-wrapper">
                <Search size={18} className="search-icon" />
                <input 
                  type="text" 
                  placeholder="Search catalogued titles..." 
                  className="search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="filters-group">
                <select 
                  className="filter-select" 
                  value={ownedFilter} 
                  onChange={(e) => setOwnedFilter(e.target.value)}
                >
                  <option value="all">Status: All Types</option>
                  <option value="owned">Owned Collection</option>
                  <option value="wishlist">Wishlist</option>
                </select>

                <select 
                  className="filter-select" 
                  value={formatFilter} 
                  onChange={(e) => setFormatFilter(e.target.value)}
                >
                  <option value="all">Format: All formats</option>
                  <option value="physical">Physical Media Only</option>
                  <option value="digital">Digital Backup Only</option>
                  <option value="both">Both Physical & Digital</option>
                </select>

                <select 
                  className="filter-select" 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Archive: All status</option>
                  <option value="backed_up">Fully Backed Up</option>
                  <option value="pending_backup">Pending Backup</option>
                </select>
              </div>
            </div>

            {/* Movie Grid */}
            {movies.length === 0 ? (
              <div className="empty-state">
                <HelpCircle size={48} className="text-muted" />
                <h3>No movies match your filters</h3>
                <p className="text-muted">Start adding manually or trigger a local file scan directory.</p>
                <button className="btn btn-secondary" onClick={() => { setIsEditing(false); setIsAddModalOpen(true); }}>
                  Add a Movie Now
                </button>
              </div>
            ) : (
              <div className="movie-grid">
                {movies.map((movie) => (
                  <div 
                    key={movie.id} 
                    className="movie-card"
                    onClick={() => setSelectedMovie(movie)}
                  >
                    <img 
                      src={movie.poster_url || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&q=80"} 
                      alt={movie.title} 
                      className="movie-poster"
                      onError={(e) => {
                        e.target.src = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&q=80";
                      }}
                    />
                    
                    {/* Glowing Badges in top-left */}
                    <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', zIndex: 2 }}>
                      {movie.owned ? (
                        movie.is_backed_up ? (
                          <span className="badge backed-up" title={`Backed up at: ${movie.backup_location || 'unknown'}`}>
                            <CheckCircle2 size={10} /> Backed Up
                          </span>
                        ) : (
                          <span className="badge pending">
                            <AlertTriangle size={10} /> Pending Backup
                          </span>
                        )
                      ) : (
                        <span className="badge wishlist-badge">Wishlist</span>
                      )}
                    </div>

                    {/* Movie info overlay on hover */}
                    <div className="movie-overlay">
                      <h4 className="movie-card-title">{movie.title}</h4>
                      <div className="movie-card-year">{movie.release_year || 'Unknown Year'}</div>
                      {movie.rating > 0 && (
                        <div className="movie-card-rating">
                          ★ {movie.rating.toFixed(1)}
                        </div>
                      )}
                      <div className="badge-group">
                        {movie.is_physical && (
                          <span className="badge physical">{movie.physical_format}</span>
                        )}
                        {movie.is_digital && (
                          <span className="badge digital">{movie.digital_format || 'Digital'}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DIRECTORY SCANNING PANEL */}
        {activeTab === 'scan' && (
          <div className="scan-container card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
            <div className="scan-header">
              <div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.25rem' }}>Local Movie Archival Scanner</h2>
                <p className="text-muted">Scan the `/movies` Docker mount volume to import metadata matches automatically.</p>
              </div>
              <button 
                className="btn btn-primary" 
                onClick={handleScanDirectory} 
                disabled={isScanning}
              >
                {isScanning ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Scanning...
                  </>
                ) : (
                  <>
                    <FolderOpen size={18} />
                    Scan `/movies` Directory
                  </>
                )}
              </button>
            </div>

            {scanMessage && (
              <div style={{ 
                padding: '1rem', 
                backgroundColor: 'var(--bg-primary)', 
                borderLeft: '4px solid var(--accent)', 
                borderRadius: 'var(--radius-sm)', 
                marginBottom: '1.5rem',
                fontSize: '0.95rem'
              }}>
                {scanMessage}
              </div>
            )}

            {!settingsConfigured && (
              <div style={{ 
                padding: '1rem', 
                backgroundColor: 'var(--warning-glow)', 
                border: '1px solid var(--warning)', 
                borderRadius: 'var(--radius-sm)', 
                marginBottom: '1.5rem',
                color: '#fef08a',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <AlertTriangle size={18} />
                <span><strong>No TMDB API Key Configured.</strong> The scanner will output fallback simulated results. Go to the Settings tab to provide a TMDB API Key.</span>
              </div>
            )}

            {scannedFiles.length > 0 && (
              <div>
                {/* Batch Settings Options */}
                <div style={{ 
                  display: 'flex', 
                  gap: '1.5rem', 
                  alignItems: 'flex-end', 
                  flexWrap: 'wrap',
                  padding: '1.25rem', 
                  backgroundColor: 'var(--bg-primary)', 
                  borderRadius: 'var(--radius-md)', 
                  marginBottom: '1.5rem',
                  border: '1px solid var(--border-color)' 
                }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Import Backup Storage Location</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                      value={batchLocation} 
                      onChange={(e) => setBatchLocation(e.target.value)} 
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Also Own Physical Copy?</label>
                    <select 
                      className="filter-select"
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', width: '150px' }}
                      value={batchPhysicalFormat}
                      onChange={(e) => setBatchPhysicalFormat(e.target.value)}
                    >
                      <option value="None">Digital Only</option>
                      <option value="Blu-ray">Blu-ray</option>
                      <option value="DVD">DVD</option>
                      <option value="4K UHD">4K Ultra HD</option>
                    </select>
                  </div>

                  <button 
                    className="btn btn-primary" 
                    style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }}
                    onClick={handleBatchImport}
                  >
                    Batch Import All Matched
                  </button>
                </div>

                <table className="scan-table">
                  <thead>
                    <tr>
                      <th>File Details</th>
                      <th>Parsed Information</th>
                      <th>Suggested Metadata Match</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scannedFiles.map((fileItem, idx) => (
                      <tr key={idx} style={{ opacity: fileItem.already_imported ? 0.5 : 1 }}>
                        <td>
                          <div className="scan-file-info">
                            <span className="scan-file-name">{fileItem.filename}</span>
                            <span className="scan-file-path">{fileItem.file_path}</span>
                          </div>
                        </td>
                        <td>
                          <div className="flex-col">
                            <span style={{ fontWeight: 600 }}>{fileItem.parsed_title}</span>
                            <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                              Year: {fileItem.parsed_year || 'Unknown'} | Ext: {fileItem.extension}
                            </span>
                          </div>
                        </td>
                        <td>
                          {correctingIndex === idx ? (
                            <div className="flex gap-2">
                              <input 
                                type="text" 
                                className="form-control" 
                                style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem', width: '160px' }}
                                value={correctQuery} 
                                onChange={(e) => setCorrectQuery(e.target.value)}
                              />
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                                onClick={searchCorrection}
                                disabled={isCorrectingSearch}
                              >
                                Search
                              </button>
                              {correctResults.length > 0 && (
                                <div style={{ 
                                  position: 'absolute', 
                                  background: 'var(--bg-secondary)', 
                                  border: '1px solid var(--border-color)', 
                                  borderRadius: 'var(--radius-sm)', 
                                  zIndex: 10,
                                  maxHeight: '180px',
                                  overflowY: 'auto',
                                  padding: '0.25rem',
                                  width: '240px',
                                  boxShadow: var(--shadow-md)
                                }}>
                                  {correctResults.map(cr => (
                                    <div 
                                      key={cr.tmdb_id}
                                      style={{ padding: '0.35rem', cursor: 'pointer', fontSize: '0.8rem', borderBottom: '1px solid var(--border-color)' }}
                                      onClick={() => selectCorrection(idx, cr)}
                                    >
                                      {cr.title} ({cr.release_year || '?'})
                                    </div>
                                  ))}
                                </div>
                              )}
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '0.35rem', color: 'var(--danger)' }}
                                onClick={() => setCorrectingIndex(null)}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            fileItem.suggested_match ? (
                              <div className="scan-match-box">
                                <img 
                                  src={fileItem.suggested_match.poster_url || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=100&q=80"} 
                                  alt="" 
                                  className="scan-match-poster" 
                                />
                                <div className="scan-match-details">
                                  <span className="scan-match-title">{fileItem.suggested_match.title}</span>
                                  <span className="scan-match-year">Year: {fileItem.suggested_match.release_year || 'Unknown'}</span>
                                </div>
                                <button 
                                  style={{ background: 'none', border: 'none', color: var(--accent), cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline', marginLeft: 'auto' }}
                                  onClick={() => startCorrection(idx, fileItem.parsed_title)}
                                >
                                  Fix
                                </button>
                              </div>
                            ) : (
                              <div className="flex align-center gap-2">
                                <span className="text-muted" style={{ fontSize: '0.85rem' }}>No automated match.</span>
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                                  onClick={() => startCorrection(idx, fileItem.parsed_title)}
                                >
                                  Find Match
                                </button>
                              </div>
                            )
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {fileItem.already_imported ? (
                            <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.9rem', display: 'inline-flex', alignCenter: true, gap: '0.25rem' }}>
                              <CheckCircle2 size={16} /> Imported
                            </span>
                          ) : (
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                              onClick={() => handleImportScanned(fileItem)}
                              disabled={!fileItem.suggested_match}
                            >
                              Import
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!isScanning && scannedFiles.length === 0 && (
              <div className="empty-state">
                <FolderOpen size={48} className="text-muted" />
                <h3>No scanned items loaded</h3>
                <p className="text-muted">Place movie files in your backup folder and trigger a scan to load files.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SETTINGS PANEL */}
        {activeTab === 'settings' && (
          <div className="card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '2.5rem', maxWidth: '600px' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.25rem' }}>Application Settings</h2>
            <p className="text-muted" style={{ marginBottom: '2rem' }}>Configure TMDB API keys and inspect library metrics.</p>

            <form onSubmit={handleSaveSettings}>
              <div className="form-group">
                <label>The Movie Database (TMDB) API Key</label>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                  <input 
                    type="password" 
                    placeholder={settingsConfigured ? "••••••••••••••••••••••••••••••••" : "Enter TMDB API Key"} 
                    className="form-control" 
                    style={{ flex: 1 }}
                    value={tmdbApiKey}
                    onChange={(e) => setTmdbApiKey(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary">Save Key</button>
                </div>
                <span className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.35rem', display: 'block' }}>
                  TMDB API key is used to fetch official metadata (posters, summary, rating). 
                  <a href="https://www.themoviedb.org/documentation/api" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', marginLeft: '0.5rem' }}>
                    Get API Key <ExternalLink size={10} />
                  </a>
                </span>
              </div>
            </form>

            <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Developer Diagnostics</h3>
              <table style={{ width: '100%', fontSize: '0.95rem' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.5rem 0', color: 'var(--text-secondary)' }}>Docker Volume Mount:</td>
                    <td style={{ padding: '0.5rem 0', fontWeight: 600, textAlign: 'right' }}>/movies</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.5rem 0', color: 'var(--text-secondary)' }}>Database Host:</td>
                    <td style={{ padding: '0.5rem 0', fontWeight: 600, textAlign: 'right' }}>moviedb_postgres (PostgreSQL)</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.5rem 0', color: 'var(--text-secondary)' }}>TMDB Metadata Status:</td>
                    <td style={{ padding: '0.5rem 0', fontWeight: 600, textAlign: 'right', color: settingsConfigured ? 'var(--success)' : 'var(--warning)' }}>
                      {settingsConfigured ? 'Configured & Active' : 'Not Configured (Running in Mock mode)'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* DETAIL MODAL VIEW */}
      {selectedMovie && (
        <div className="modal-overlay" onClick={() => setSelectedMovie(null)}>
          <div className="modal-content wide" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedMovie(null)}>
              <X size={24} />
            </button>
            
            <div className="movie-detail-grid">
              <div className="detail-poster-wrapper">
                <img 
                  src={selectedMovie.poster_url || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&q=80"} 
                  alt={selectedMovie.title} 
                  className="detail-poster"
                  onError={(e) => {
                    e.target.src = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&q=80";
                  }}
                />
              </div>

              <div className="detail-info">
                <h2 className="detail-title">{selectedMovie.title}</h2>
                <div className="detail-meta">
                  {selectedMovie.release_year && (
                    <span style={{ fontWeight: 600 }}>{selectedMovie.release_year}</span>
                  )}
                  {selectedMovie.runtime && (
                    <span style={{ display: 'flex', alignCenter: true, gap: '0.25rem' }}><Clock size={16} /> {selectedMovie.runtime} min</span>
                  )}
                  {selectedMovie.rating > 0 && (
                    <span style={{ color: 'var(--warning)', fontWeight: 600 }}>★ {selectedMovie.rating.toFixed(1)} / 10</span>
                  )}
                </div>

                <div className="badge-group" style={{ marginBottom: '1.5rem' }}>
                  {selectedMovie.owned ? (
                    selectedMovie.is_backed_up ? (
                      <span className="badge backed-up"><CheckCircle2 size={12} /> Backed Up ({selectedMovie.backup_location})</span>
                    ) : (
                      <span className="badge pending"><AlertTriangle size={12} /> Pending Backup</span>
                    )
                  ) : (
                    <span className="badge wishlist-badge">On Wishlist</span>
                  )}
                </div>

                {selectedMovie.description && (
                  <p className="detail-description">{selectedMovie.description}</p>
                )}

                {selectedMovie.genres && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <span className="detail-label">Genres</span>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                      {selectedMovie.genres.split(',').map((g, i) => (
                        <span key={i} style={{ backgroundColor: 'var(--bg-primary)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                          {g.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="detail-section-title">Media Details</div>
                <div className="detail-fields-grid">
                  <div className="detail-field">
                    <span className="detail-label">Physical Media Owned</span>
                    <span className="detail-value">{selectedMovie.is_physical ? `Yes (${selectedMovie.physical_format})` : 'No'}</span>
                  </div>

                  <div className="detail-field">
                    <span className="detail-label">Digital File Backup</span>
                    <span className="detail-value">{selectedMovie.is_digital ? `Yes (${selectedMovie.digital_format || 'Format unknown'})` : 'No'}</span>
                  </div>

                  {selectedMovie.is_digital && (
                    <>
                      <div className="detail-field">
                        <span className="detail-label">Backup Location</span>
                        <span className="detail-value">{selectedMovie.backup_location || 'Not Specified'}</span>
                      </div>
                      <div className="detail-field">
                        <span className="detail-label">Backup Source Path</span>
                        <span className="detail-value" style={{ fontFamily: 'monospace', fontSize: '0.85rem', wordBreak: 'break-all' }}>{selectedMovie.backup_path || 'No Path Info'}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="detail-actions">
                  <button className="btn btn-secondary" onClick={() => openEditModal(selectedMovie)}>
                    <Edit3 size={16} /> Edit Movie
                  </button>
                  <button className="btn btn-secondary" style={{ color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)' }} onClick={() => handleDeleteMovie(selectedMovie.id)}>
                    <Trash2 size={16} /> Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT MOVIE MODAL */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setIsAddModalOpen(false)}>
              <X size={24} />
            </button>
            
            <h2 className="form-title">{isEditing ? 'Edit Movie Specifications' : 'Catalog New Movie'}</h2>

            {!isEditing && (
              <div className="tabs">
                <div 
                  className={`tab ${addModalTab === 'search' ? 'active' : ''}`}
                  onClick={() => setAddModalTab('search')}
                >
                  Search TMDB Metadata
                </div>
                <div 
                  className={`tab ${addModalTab === 'form' ? 'active' : ''}`}
                  onClick={() => setAddModalTab('form')}
                >
                  Manual Entry Form
                </div>
              </div>
            )}

            {addModalTab === 'search' && !isEditing ? (
              <div className="form-body">
                <div className="form-group">
                  <label>Search Movie Title</label>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                    <input 
                      type="text" 
                      placeholder="E.g., The Matrix or Gladiator" 
                      className="form-control" 
                      style={{ flex: 1 }}
                      value={tmdbSearchQuery}
                      onChange={(e) => setTmdbSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleTmdbSearch()}
                    />
                    <button className="btn btn-primary" onClick={handleTmdbSearch} disabled={isSearchingTmdb}>
                      {isSearchingTmdb ? <Loader2 className="animate-spin" size={18} /> : 'Search'}
                    </button>
                  </div>
                </div>

                {tmdbSearchResults.length > 0 && (
                  <div className="tmdb-results-list">
                    {tmdbSearchResults.map((item) => (
                      <div 
                        key={item.tmdb_id} 
                        className="tmdb-result-item"
                        onClick={() => selectTmdbMatch(item)}
                      >
                        <div className="tmdb-result-info">
                          <img 
                            src={item.poster_url || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=100&q=80"} 
                            alt="" 
                            className="tmdb-result-thumb" 
                          />
                          <div className="tmdb-result-text">
                            <span className="tmdb-result-title">{item.title}</span>
                            <span className="tmdb-result-meta">Year: {item.release_year || 'Unknown'} | TMDB ID: {item.tmdb_id}</span>
                          </div>
                        </div>
                        <ChevronRight size={18} className="text-muted" />
                      </div>
                    ))}
                  </div>
                )}

                {tmdbSearchResults.length === 0 && !isSearchingTmdb && (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Search TMDB to fetch details and posters, or click the "Manual Entry Form" tab to create one from scratch.
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSaveMovie}>
                <div className="form-body">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Movie Title *</label>
                      <input 
                        type="text" 
                        required
                        className="form-control" 
                        value={manualMovieForm.title}
                        onChange={(e) => setManualMovieForm({ ...manualMovieForm, title: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Release Year</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={manualMovieForm.release_year}
                        onChange={(e) => setManualMovieForm({ ...manualMovieForm, release_year: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Poster URL</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={manualMovieForm.poster_url}
                        onChange={(e) => setManualMovieForm({ ...manualMovieForm, poster_url: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Genres (comma separated)</label>
                      <input 
                        type="text" 
                        placeholder="Action, Sci-Fi"
                        className="form-control" 
                        value={manualMovieForm.genres}
                        onChange={(e) => setManualMovieForm({ ...manualMovieForm, genres: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>TMDB Movie ID</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={manualMovieForm.tmdb_id}
                        onChange={(e) => setManualMovieForm({ ...manualMovieForm, tmdb_id: e.target.value })}
                      />
                    </div>
                    <div className="form-row" style={{ margin: 0, gap: '0.75rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Rating (out of 10)</label>
                        <input 
                          type="number" 
                          step="0.1"
                          max="10"
                          className="form-control" 
                          value={manualMovieForm.rating}
                          onChange={(e) => setManualMovieForm({ ...manualMovieForm, rating: e.target.value })}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Runtime (minutes)</label>
                        <input 
                          type="number" 
                          className="form-control" 
                          value={manualMovieForm.runtime}
                          onChange={(e) => setManualMovieForm({ ...manualMovieForm, runtime: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-group full-width">
                    <label>Description / Overview</label>
                    <textarea 
                      rows="3"
                      className="form-control" 
                      style={{ resize: 'vertical' }}
                      value={manualMovieForm.description}
                      onChange={(e) => setManualMovieForm({ ...manualMovieForm, description: e.target.value })}
                    />
                  </div>

                  {/* Ownership status */}
                  <div className="form-row" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                    <div className="form-group">
                      <label>Catalog Status</label>
                      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
                        <label className="form-checkbox-group">
                          <input 
                            type="radio" 
                            name="owned" 
                            className="form-checkbox"
                            checked={manualMovieForm.owned === true}
                            onChange={() => setManualMovieForm({ ...manualMovieForm, owned: true })}
                          />
                          Owned Collection
                        </label>
                        <label className="form-checkbox-group">
                          <input 
                            type="radio" 
                            name="owned" 
                            className="form-checkbox"
                            checked={manualMovieForm.owned === false}
                            onChange={() => setManualMovieForm({ ...manualMovieForm, owned: false, is_backed_up: false })}
                          />
                          Wishlist
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Format details (only if owned) */}
                  {manualMovieForm.owned && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '0.5rem' }}>
                      <div style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-primary)' }}>
                        <label className="form-checkbox-group" style={{ fontWeight: 600, marginBottom: '0.75rem' }}>
                          <input 
                            type="checkbox" 
                            className="form-checkbox"
                            checked={manualMovieForm.is_physical}
                            onChange={(e) => setManualMovieForm({ ...manualMovieForm, is_physical: e.target.checked })}
                          />
                          Physical Media Details
                        </label>
                        
                        {manualMovieForm.is_physical && (
                          <div className="form-group" style={{ marginBottom: 0, marginTop: '0.5rem' }}>
                            <label>Physical Source Format</label>
                            <select 
                              className="filter-select"
                              style={{ width: '100%', marginTop: '0.25rem' }}
                              value={manualMovieForm.physical_format}
                              onChange={(e) => setManualMovieForm({ ...manualMovieForm, physical_format: e.target.value })}
                            >
                              <option value="Blu-ray">Blu-ray</option>
                              <option value="DVD">DVD</option>
                              <option value="4K UHD">4K Ultra HD</option>
                              <option value="VHS">VHS</option>
                            </select>
                          </div>
                        )}
                      </div>

                      <div style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-primary)' }}>
                        <label className="form-checkbox-group" style={{ fontWeight: 600, marginBottom: '0.75rem' }}>
                          <input 
                            type="checkbox" 
                            className="form-checkbox"
                            checked={manualMovieForm.is_digital}
                            onChange={(e) => setManualMovieForm({ ...manualMovieForm, is_digital: e.target.checked })}
                          />
                          Digital Archival Details
                        </label>
                        
                        {manualMovieForm.is_digital && (
                          <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div className="form-row" style={{ margin: 0, gap: '0.75rem' }}>
                              <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                                <label>Container Format</label>
                                <input 
                                  type="text" 
                                  placeholder="E.g., MKV, MP4"
                                  className="form-control" 
                                  value={manualMovieForm.digital_format}
                                  onChange={(e) => setManualMovieForm({ ...manualMovieForm, digital_format: e.target.value })}
                                />
                              </div>
                              <div className="form-group" style={{ marginBottom: 0, flex: 1.5 }}>
                                <label>Backup Location</label>
                                <input 
                                  type="text" 
                                  placeholder="E.g., NAS-1, ExtA"
                                  className="form-control" 
                                  value={manualMovieForm.backup_location}
                                  onChange={(e) => setManualMovieForm({ ...manualMovieForm, backup_location: e.target.value })}
                                />
                              </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-checkbox-group">
                                <input 
                                  type="checkbox" 
                                  className="form-checkbox"
                                  checked={manualMovieForm.is_backed_up}
                                  onChange={(e) => setManualMovieForm({ ...manualMovieForm, is_backed_up: e.target.checked })}
                                />
                                Archive Completed (Backed Up)
                              </label>
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label>Mounted Source File Path</label>
                              <input 
                                type="text" 
                                placeholder="E.g. Gladiator (2000)/Gladiator.mkv"
                                className="form-control" 
                                value={manualMovieForm.backup_path}
                                onChange={(e) => setManualMovieForm({ ...manualMovieForm, backup_path: e.target.value })}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>

                <div className="form-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">{isEditing ? 'Save Changes' : 'Catalog Movie'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
