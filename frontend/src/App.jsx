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
  Loader2,
  LayoutGrid,
  List,
  Table as TableIcon
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
    need_physical_count: 0,
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
  const [batchImportState, setBatchImportState] = useState('backed_up_owned');

  // Library View & Selection State
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'compact', 'table'
  const [selectedMovieIds, setSelectedMovieIds] = useState([]);

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

  // Bulk Actions
  const toggleMovieSelection = (movieId) => {
    setSelectedMovieIds(prev => {
      if (prev.includes(movieId)) {
        return prev.filter(id => id !== movieId);
      } else {
        return [...prev, movieId];
      }
    });
  };

  const toggleGroupSelection = (groupMovies) => {
    const groupIds = groupMovies.map(m => m.id);
    const allSelected = groupIds.every(id => selectedMovieIds.includes(id));
    setSelectedMovieIds(prev => {
      if (allSelected) {
        return prev.filter(id => !groupIds.includes(id));
      } else {
        const union = new Set([...prev, ...groupIds]);
        return Array.from(union);
      }
    });
  };

  const toggleSelectAll = () => {
    const visibleIds = movies.map(m => m.id);
    const allSelected = visibleIds.every(id => selectedMovieIds.includes(id));
    if (allSelected) {
      setSelectedMovieIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedMovieIds(prev => {
        const union = new Set([...prev, ...visibleIds]);
        return Array.from(union);
      });
    }
  };

  const handleBulkUpdate = async (updateData) => {
    if (selectedMovieIds.length === 0) return;
    try {
      const res = await fetch(`${API_BASE}/api/movies/bulk-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedMovieIds,
          ...updateData
        })
      });
      if (res.ok) {
        setSelectedMovieIds([]);
        fetchMovies();
        fetchStats();
      } else {
        const errData = await res.json();
        alert(`Error performing bulk update: ${errData.detail}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedMovieIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete the ${selectedMovieIds.length} selected movies?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/movies/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedMovieIds
        })
      });
      if (res.ok) {
        setSelectedMovieIds([]);
        fetchMovies();
        fetchStats();
      } else {
        const errData = await res.json();
        alert(`Error performing bulk delete: ${errData.detail}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Scanned item individual modification helper
  const updateFileItem = (index, field, value) => {
    setScannedFiles(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // Batch property handlers
  const handleBatchImportStateChange = (val) => {
    setBatchImportState(val);
    setScannedFiles(prev => prev.map(f => ({ ...f, import_state: val })));
  };

  const handleBatchPhysicalFormatChange = (val) => {
    setBatchPhysicalFormat(val);
    setScannedFiles(prev => prev.map(f => ({ ...f, physical_format: val })));
  };

  const handleBatchLocationChange = (val) => {
    setBatchLocation(val);
    setScannedFiles(prev => prev.map(f => ({ ...f, backup_location: val })));
  };

  const getGroupedMovies = (moviesList) => {
    const groups = {};
    moviesList.forEach(movie => {
      const key = movie.tmdb_id ? `tmdb_${movie.tmdb_id}` : `title_${movie.title.toLowerCase()}`;
      if (!groups[key]) {
        groups[key] = {
          key: key,
          tmdb_id: movie.tmdb_id,
          title: movie.title,
          release_year: movie.release_year,
          description: movie.description,
          poster_url: movie.poster_url,
          rating: movie.rating,
          runtime: movie.runtime,
          genres: movie.genres,
          owned: false,
          is_physical: false,
          is_digital: false,
          is_backed_up: false,
          movies: []
        };
      }
      const g = groups[key];
      g.movies.push(movie);
      
      if (movie.owned) g.owned = true;
      if (movie.is_physical) g.is_physical = true;
      if (movie.is_digital) g.is_digital = true;
      if (movie.owned && movie.is_backed_up) g.is_backed_up = true;
      
      if (!g.poster_url && movie.poster_url) g.poster_url = movie.poster_url;
      if (!g.description && movie.description) g.description = movie.description;
      if (!g.rating && movie.rating) g.rating = movie.rating;
      if (!g.genres && movie.genres) g.genres = movie.genres;
    });
    return Object.values(groups);
  };

  const getFormatLabel = (m) => {
    if (m.is_physical) {
      return m.physical_format || 'Physical';
    }
    if (m.is_digital) {
      let label = m.digital_format || 'Digital';
      if (m.backup_path) {
        const filename = m.backup_path.split('/').pop().toLowerCase();
        const tags = [];
        if (filename.includes('4k') || filename.includes('2160p')) tags.push('4K');
        else if (filename.includes('1080p')) tags.push('1080p');
        else if (filename.includes('720p')) tags.push('720p');
        
        if (filename.includes('extended')) tags.push('Extended');
        if (filename.includes('director')) tags.push("Director's Cut");
        if (filename.includes('remux')) tags.push('Remux');
        
        if (tags.length > 0) {
          label += ` (${tags.join(', ')})`;
        }
      }
      return label;
    }
    return '';
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
          const filesWithDefaults = data.results.map(file => ({
            ...file,
            import_state: batchImportState,
            physical_format: batchPhysicalFormat,
            backup_location: batchLocation
          }));
          setScannedFiles(filesWithDefaults);
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

    const itemImportState = scannedItem.import_state || batchImportState;
    const itemPhysicalFormat = scannedItem.physical_format || batchPhysicalFormat;
    const itemLocation = scannedItem.backup_location || batchLocation;

    const isPhysical = itemPhysicalFormat !== 'None';
    
    let owned = true;
    let isBackedUp = true;
    let isDigital = true;

    if (itemImportState === 'backed_up_wishlist') {
      owned = false;
      isBackedUp = true;
      isDigital = true;
    } else if (itemImportState === 'backed_up_owned') {
      owned = true;
      isBackedUp = true;
      isDigital = true;
    } else if (itemImportState === 'owned_not_backed_up') {
      owned = true;
      isBackedUp = false;
      isDigital = true;
    }

    try {
      const payload = {
        file_path: scannedItem.file_path,
        title: match.title,
        release_year: match.release_year ? parseInt(match.release_year) : null,
        tmdb_id: match.tmdb_id,
        is_physical: isPhysical,
        physical_format: isPhysical ? itemPhysicalFormat : null,
        is_digital: isDigital,
        digital_format: isDigital ? scannedItem.extension : null,
        is_backed_up: isBackedUp,
        backup_location: isBackedUp ? itemLocation : null,
        owned: owned
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
              Library
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
              <div className="stat-card">
                <span className="stat-title">Need Physical</span>
                <span className="stat-val" style={{ color: '#fde047' }}>{stats.need_physical_count}</span>
                <span className="text-muted" style={{ fontSize: '0.8rem' }}>Downloaded but not owned</span>
              </div>
              <div className="stat-card">
                <span className="stat-title">Wishlisted</span>
                <span className="stat-val" style={{ color: '#fca5a5' }}>{stats.wishlist_count}</span>
                <span className="text-muted" style={{ fontSize: '0.8rem' }}>Not owned or downloaded</span>
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

              <div className="filters-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <select 
                  className="filter-select" 
                  value={ownedFilter} 
                  onChange={(e) => setOwnedFilter(e.target.value)}
                >
                  <option value="all">Status: All Types</option>
                  <option value="owned">Owned Collection</option>
                  <option value="wishlist">Wishlist</option>
                  <option value="need_physical">Need Physical</option>
                  <option value="shopping_list">Shopping List</option>
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

                {/* View togglers */}
                <div style={{ 
                  display: 'flex', 
                  gap: '0.25rem', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--radius-md)', 
                  padding: '0.25rem', 
                  background: 'var(--bg-primary)' 
                }}>
                  <button 
                    className={`btn-icon ${viewMode === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewMode('grid')}
                    style={{ 
                      background: viewMode === 'grid' ? 'var(--accent)' : 'transparent', 
                      border: 'none', 
                      color: '#fff', 
                      padding: '0.4rem', 
                      borderRadius: '4px', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center' 
                    }}
                    title="Grid View"
                  >
                    <LayoutGrid size={16} />
                  </button>
                  <button 
                    className={`btn-icon ${viewMode === 'compact' ? 'active' : ''}`}
                    onClick={() => setViewMode('compact')}
                    style={{ 
                      background: viewMode === 'compact' ? 'var(--accent)' : 'transparent', 
                      border: 'none', 
                      color: '#fff', 
                      padding: '0.4rem', 
                      borderRadius: '4px', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center' 
                    }}
                    title="Compact List View"
                  >
                    <List size={16} />
                  </button>
                  <button 
                    className={`btn-icon ${viewMode === 'table' ? 'active' : ''}`}
                    onClick={() => setViewMode('table')}
                    style={{ 
                      background: viewMode === 'table' ? 'var(--accent)' : 'transparent', 
                      border: 'none', 
                      color: '#fff', 
                      padding: '0.4rem', 
                      borderRadius: '4px', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center' 
                    }}
                    title="Table View"
                  >
                    <TableIcon size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedMovieIds.length > 0 && (
              <div className="bulk-actions-bar" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 1.5rem',
                backgroundColor: 'var(--accent-glow)',
                border: '1px solid var(--accent)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedMovieIds.length} movie{selectedMovieIds.length > 1 ? 's' : ''} selected
                  </span>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                    onClick={() => setSelectedMovieIds([])}
                  >
                    Deselect All
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button 
                    className="btn btn-primary" 
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: 'rgba(59, 130, 246, 0.6)', borderColor: 'rgba(59, 130, 246, 0.8)' }}
                    onClick={() => handleBulkUpdate({ owned: true })}
                  >
                    Mark as Owned
                  </button>
                  <button 
                    className="btn btn-primary" 
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.6)', borderColor: 'rgba(239, 68, 68, 0.8)' }}
                    onClick={() => handleBulkUpdate({ owned: false })}
                  >
                    Mark as Wishlist
                  </button>
                  <button 
                    className="btn btn-primary" 
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: 'rgba(16, 185, 129, 0.6)', borderColor: 'rgba(16, 185, 129, 0.8)' }}
                    onClick={() => handleBulkUpdate({ is_backed_up: true })}
                  >
                    Mark as Backed Up
                  </button>
                  <button 
                    className="btn btn-primary" 
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: 'rgba(245, 158, 11, 0.6)', borderColor: 'rgba(245, 158, 11, 0.8)' }}
                    onClick={() => handleBulkUpdate({ is_backed_up: false })}
                  >
                    Mark as Pending
                  </button>
                  <button 
                    className="btn btn-primary" 
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: 'var(--danger)', borderColor: 'var(--danger)' }}
                    onClick={handleBulkDelete}
                  >
                    <Trash2 size={14} /> Delete Selected
                  </button>
                </div>
              </div>
            )}

            {/* Movie List Views */}
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
              <div>
                {/* 1. Grid View */}
                {viewMode === 'grid' && (
                  <div className="movie-grid">
                    {getGroupedMovies(movies).map((group) => {
                      const isSelected = group.movies.every(m => selectedMovieIds.includes(m.id));
                      const isPartiallySelected = !isSelected && group.movies.some(m => selectedMovieIds.includes(m.id));
                      
                      return (
                        <div 
                          key={group.key} 
                          className={`movie-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedMovie(group)}
                          style={{
                            border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border-color)',
                            position: 'relative'
                          }}
                        >
                          <img 
                            src={group.poster_url || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&q=80"} 
                            alt={group.title} 
                            className="movie-poster"
                            onError={(e) => {
                              e.target.src = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&q=80";
                            }}
                          />
                          
                          {/* Checkbox overlay in top-right */}
                          <div 
                            style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', zIndex: 10 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              ref={el => {
                                if (el) el.indeterminate = isPartiallySelected;
                              }}
                              onChange={() => toggleGroupSelection(group.movies)}
                              style={{
                                width: '20px',
                                height: '20px',
                                cursor: 'pointer',
                                accentColor: 'var(--accent)'
                              }}
                            />
                          </div>

                          {/* Glowing Badges in top-left */}
                          <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', zIndex: 2 }}>
                            {group.owned ? (
                              <>
                                <span className="badge owned-badge">Owned</span>
                                {group.is_backed_up ? (
                                  <span className="badge backed-up" title="Backed up to NAS">
                                    <CheckCircle2 size={10} /> Backed Up
                                  </span>
                                ) : (
                                  <span className="badge pending">
                                    <AlertTriangle size={10} /> Pending Backup
                                  </span>
                                )}
                                {group.is_digital && !group.is_backed_up && (
                                  <span className="badge digital">
                                    <HardDrive size={10} /> Downloaded
                                  </span>
                                )}
                              </>
                            ) : (
                              group.is_digital ? (
                                <span className="badge need-physical">
                                  <AlertTriangle size={10} /> Need Physical
                                </span>
                              ) : (
                                <span className="badge wishlist-badge">Wishlisted</span>
                              )
                            )}
                          </div>

                          {/* Movie info overlay on hover */}
                          <div className="movie-overlay">
                            <h4 className="movie-card-title">{group.title}</h4>
                            <div className="movie-card-year">{group.release_year || 'Unknown Year'}</div>
                            {group.rating > 0 && (
                              <div className="movie-card-rating">
                                ★ {group.rating.toFixed(1)}
                              </div>
                            )}
                            <div className="badge-group" style={{ marginTop: '0.5rem' }}>
                              {group.movies.map((m) => {
                                const lbl = getFormatLabel(m);
                                if (!lbl) return null;
                                return (
                                  <span 
                                    key={m.id} 
                                    className={`badge ${m.is_physical ? 'physical' : 'digital'}`}
                                    style={{ fontSize: '0.65rem' }}
                                  >
                                    {lbl}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. Compact List View */}
                {viewMode === 'compact' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {getGroupedMovies(movies).map((group) => {
                      const isSelected = group.movies.every(m => selectedMovieIds.includes(m.id));
                      const isPartiallySelected = !isSelected && group.movies.some(m => selectedMovieIds.includes(m.id));
                      
                      return (
                        <div 
                          key={group.key}
                          className={`movie-compact-row ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedMovie(group)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1.5rem',
                            padding: '1rem',
                            background: 'var(--bg-secondary)',
                            border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            transition: 'var(--transition)'
                          }}
                        >
                          {/* Checkbox */}
                          <div onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox"
                              checked={isSelected}
                              ref={el => {
                                if (el) el.indeterminate = isPartiallySelected;
                              }}
                              onChange={() => toggleGroupSelection(group.movies)}
                              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent)' }}
                            />
                          </div>

                          {/* Small poster */}
                          <img 
                            src={group.poster_url || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=100&q=80"}
                            alt={group.title}
                            style={{ width: '50px', height: '75px', objectFit: 'cover', borderRadius: '4px' }}
                            onError={(e) => {
                              e.target.src = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=100&q=80";
                            }}
                          />

                          {/* Movie details */}
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>{group.title}</h3>
                              <span className="text-muted" style={{ fontSize: '0.9rem' }}>({group.release_year || 'Unknown Year'})</span>
                              {group.rating > 0 && (
                                <span style={{ color: 'var(--warning)', fontWeight: 600, fontSize: '0.9rem' }}>★ {group.rating.toFixed(1)}</span>
                              )}
                            </div>
                            <p className="text-muted" style={{ fontSize: '0.9rem', margin: '0.25rem 0 0.5rem 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {group.description || 'No description available.'}
                            </p>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
                              {group.genres && group.genres.split(',').map((g, i) => (
                                <span key={i} style={{ background: 'var(--bg-primary)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{g.trim()}</span>
                              ))}
                            </div>
                          </div>

                          {/* Badges for status */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-start' }}>
                            {group.owned ? (
                              <>
                                <span className="badge owned-badge">Owned</span>
                                {group.is_backed_up ? (
                                  <span className="badge backed-up"><CheckCircle2 size={10} /> Backed Up</span>
                                ) : (
                                  <span className="badge pending"><AlertTriangle size={10} /> Pending Backup</span>
                                )}
                                {group.is_digital && !group.is_backed_up && (
                                  <span className="badge digital"><HardDrive size={10} /> Downloaded</span>
                                )}
                              </>
                            ) : (
                              group.is_digital ? (
                                <span className="badge need-physical">Need Physical</span>
                              ) : (
                                <span className="badge wishlist-badge">Wishlisted</span>
                              )
                            )}
                          </div>

                          {/* Formats list */}
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', maxWidth: '200px' }}>
                            {group.movies.map((m) => {
                              const lbl = getFormatLabel(m);
                              if (!lbl) return null;
                              return (
                                <span key={m.id} className={`badge ${m.is_physical ? 'physical' : 'digital'}`}>
                                  {lbl}
                                </span>
                              );
                            })}
                          </div>

                          {/* Actions */}
                          <div style={{ display: 'flex', gap: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.4rem', minWidth: 'auto' }} 
                              onClick={() => setSelectedMovie(group)}
                              title="View Formats & Details"
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 3. Text Table View */}
                {viewMode === 'table' && (
                  <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)' }}>
                    <table className="scan-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '1rem', width: '40px' }}>
                            <input 
                              type="checkbox"
                              checked={movies.length > 0 && movies.every(m => selectedMovieIds.includes(m.id))}
                              onChange={toggleSelectAll}
                              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent)' }}
                            />
                          </th>
                          <th style={{ padding: '1rem' }}>Title</th>
                          <th style={{ padding: '1rem' }}>Year</th>
                          <th style={{ padding: '1rem' }}>Rating</th>
                          <th style={{ padding: '1rem' }}>Genres</th>
                          <th style={{ padding: '1rem' }}>Status</th>
                          <th style={{ padding: '1rem' }}>Formats</th>
                          <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getGroupedMovies(movies).map((group) => {
                          const isSelected = group.movies.every(m => selectedMovieIds.includes(m.id));
                          const isPartiallySelected = !isSelected && group.movies.some(m => selectedMovieIds.includes(m.id));
                          
                          return (
                            <tr 
                              key={group.key} 
                              style={{ 
                                borderBottom: '1px solid var(--border-color)', 
                                backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                                cursor: 'pointer'
                              }}
                              onClick={() => setSelectedMovie(group)}
                            >
                              <td style={{ padding: '1rem' }} onClick={(e) => e.stopPropagation()}>
                                <input 
                                  type="checkbox"
                                  checked={isSelected}
                                  ref={el => {
                                    if (el) el.indeterminate = isPartiallySelected;
                                  }}
                                  onChange={() => toggleGroupSelection(group.movies)}
                                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent)' }}
                                />
                              </td>
                              <td style={{ padding: '1rem', fontWeight: 600 }}>{group.title}</td>
                              <td style={{ padding: '1rem' }}>{group.release_year || '-'}</td>
                              <td style={{ padding: '1rem' }}>{group.rating ? `★ ${group.rating.toFixed(1)}` : '-'}</td>
                              <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                {group.genres || '-'}
                              </td>
                              <td style={{ padding: '1rem' }}>
                                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                  {group.owned ? (
                                    <>
                                      <span className="badge owned-badge">Owned</span>
                                      {group.is_backed_up ? (
                                        <span className="badge backed-up">Backed Up</span>
                                      ) : (
                                        <span className="badge pending">Pending Backup</span>
                                      )}
                                      {group.is_digital && !group.is_backed_up && (
                                        <span className="badge digital">Downloaded</span>
                                      )}
                                    </>
                                  ) : (
                                    group.is_digital ? (
                                      <span className="badge need-physical">Need Physical</span>
                                    ) : (
                                      <span className="badge wishlist-badge">Wishlisted</span>
                                    )
                                  )}
                                </div>
                              </td>
                              <td style={{ padding: '1rem' }}>
                                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                  {group.movies.map((m) => {
                                    const lbl = getFormatLabel(m);
                                    if (!lbl) return null;
                                    return (
                                      <span key={m.id} className={`badge ${m.is_physical ? 'physical' : 'digital'}`} style={{ fontSize: '0.65rem' }}>
                                        {lbl}
                                      </span>
                                    );
                                  })}
                                </div>
                              </td>
                              <td style={{ padding: '1rem', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                  <button className="btn btn-secondary" style={{ padding: '0.4rem', minWidth: 'auto' }} onClick={() => setSelectedMovie(group)}>
                                    <ChevronRight size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
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
                      onChange={(e) => handleBatchLocationChange(e.target.value)} 
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Default Import State</label>
                    <select 
                      className="filter-select"
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', width: '180px' }}
                      value={batchImportState}
                      onChange={(e) => handleBatchImportStateChange(e.target.value)}
                    >
                      <option value="backed_up_wishlist">Wishlist (Backed Up)</option>
                      <option value="backed_up_owned">Owned & Backed Up</option>
                      <option value="owned_not_backed_up">Owned & Not Backed Up</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Also Own Physical Copy?</label>
                    <select 
                      className="filter-select"
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', width: '150px' }}
                      value={batchPhysicalFormat}
                      onChange={(e) => handleBatchPhysicalFormatChange(e.target.value)}
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
                      <th>Import Option</th>
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
                                  boxShadow: 'var(--shadow-md)'
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
                                  style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline', marginLeft: 'auto' }}
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
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <select 
                              className="filter-select"
                              style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', width: '180px' }}
                              value={fileItem.import_state || batchImportState}
                              onChange={(e) => updateFileItem(idx, 'import_state', e.target.value)}
                            >
                              <option value="backed_up_wishlist">Wishlist (Backed Up)</option>
                              <option value="backed_up_owned">Owned & Backed Up</option>
                              <option value="owned_not_backed_up">Owned & Not Backed Up</option>
                            </select>
                            
                            <select 
                              className="filter-select"
                              style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', width: '180px' }}
                              value={fileItem.physical_format || batchPhysicalFormat}
                              onChange={(e) => updateFileItem(idx, 'physical_format', e.target.value)}
                            >
                              <option value="None">Digital Only</option>
                              <option value="Blu-ray">Blu-ray</option>
                              <option value="DVD">DVD</option>
                              <option value="4K UHD">4K Ultra HD</option>
                            </select>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {fileItem.already_imported ? (
                            <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
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
                  {/* Tag 1: Ownership */}
                  {selectedMovie.owned ? (
                    <span className="badge owned-badge">Owned</span>
                  ) : (
                    selectedMovie.is_digital ? (
                      <span className="badge need-physical">Need Physical</span>
                    ) : (
                      <span className="badge wishlist-badge">Wishlisted</span>
                    )
                  )}
                  
                  {/* Tag 2: Backup */}
                  {selectedMovie.owned && (
                    selectedMovie.is_backed_up ? (
                      <span className="badge backed-up"><CheckCircle2 size={12} /> Backed Up</span>
                    ) : (
                      <span className="badge pending"><AlertTriangle size={12} /> Pending Backup</span>
                    )
                  )}

                  {/* Tag 3: Downloaded */}
                  {selectedMovie.is_digital && (
                    <span className="badge digital"><HardDrive size={12} /> Downloaded</span>
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

                <div className="detail-section-title">Formats & Backups ({selectedMovie.movies ? selectedMovie.movies.length : 1})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                  {selectedMovie.movies ? selectedMovie.movies.map((item, idx) => (
                    <div 
                      key={item.id} 
                      style={{ 
                        background: 'var(--bg-primary)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: 'var(--radius-sm)', 
                        padding: '1rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '1rem'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700 }}>Option #{idx + 1}</span>
                          {item.is_physical && <span className="badge physical">{item.physical_format}</span>}
                          {item.is_digital && <span className="badge digital">{item.digital_format || 'Digital'}</span>}
                          {item.owned ? <span className="badge owned-badge">Owned</span> : <span className="badge wishlist-badge">Wishlist</span>}
                          {item.is_backed_up ? <span className="badge backed-up">Backed Up</span> : <span className="badge pending">Pending</span>}
                        </div>
                        {item.is_digital && (
                          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            <div><strong>Path:</strong> <span style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{item.backup_path || 'No Path Info'}</span></div>
                            <div><strong>Location:</strong> {item.backup_location || 'Not Specified'}</div>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} 
                          onClick={() => openEditModal(item)}
                        >
                          <Edit3 size={14} /> Edit
                        </button>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: 'var(--danger)' }} 
                          onClick={async () => {
                            await handleDeleteMovie(item.id);
                            setSelectedMovie(null);
                          }}
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      </div>
                    </div>
                  )) : (
                    <div 
                      style={{ 
                        background: 'var(--bg-primary)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: 'var(--radius-sm)', 
                        padding: '1rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {selectedMovie.is_physical && <span className="badge physical">{selectedMovie.physical_format}</span>}
                          {selectedMovie.is_digital && <span className="badge digital">{selectedMovie.digital_format || 'Digital'}</span>}
                        </div>
                        {selectedMovie.is_digital && (
                          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            <div><strong>Path:</strong> <span style={{ fontFamily: 'monospace' }}>{selectedMovie.backup_path || 'No Path Info'}</span></div>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-secondary" onClick={() => openEditModal(selectedMovie)}><Edit3 size={14} /> Edit</button>
                        <button className="btn btn-secondary" style={{ color: 'var(--danger)' }} onClick={() => { handleDeleteMovie(selectedMovie.id); setSelectedMovie(null); }}><Trash2 size={14} /> Remove</button>
                      </div>
                    </div>
                  )}
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

                  {/* Catalog Status */}
                  <div className="form-row" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                    <div className="form-group">
                      <label>Catalog Status</label>
                      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                        <label className="form-checkbox-group">
                          <input 
                            type="radio" 
                            name="catalog_status" 
                            className="form-checkbox"
                            checked={manualMovieForm.owned === true}
                            onChange={() => setManualMovieForm({ ...manualMovieForm, owned: true })}
                          />
                          Owned Collection
                        </label>
                        <label className="form-checkbox-group">
                          <input 
                            type="radio" 
                            name="catalog_status" 
                            className="form-checkbox"
                            checked={manualMovieForm.owned === false && manualMovieForm.is_digital === true}
                            onChange={() => setManualMovieForm({ 
                              ...manualMovieForm, 
                              owned: false, 
                              is_physical: false, 
                              is_digital: true, 
                              is_backed_up: false 
                            })}
                          />
                          Downloaded (Need Physical)
                        </label>
                        <label className="form-checkbox-group">
                          <input 
                            type="radio" 
                            name="catalog_status" 
                            className="form-checkbox"
                            checked={manualMovieForm.owned === false && manualMovieForm.is_digital === false}
                            onChange={() => setManualMovieForm({ 
                              ...manualMovieForm, 
                              owned: false, 
                              is_physical: false, 
                              is_digital: false, 
                              is_backed_up: false 
                            })}
                          />
                          Wishlisted
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Format details (Owned or Downloaded) */}
                  {(manualMovieForm.owned || manualMovieForm.is_digital) && (
                    <div style={{ display: 'grid', gridTemplateColumns: manualMovieForm.owned ? '1fr 1fr' : '1fr', gap: '1.5rem', marginTop: '0.5rem' }}>
                      {manualMovieForm.owned && (
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
                      )}

                      {manualMovieForm.is_digital && (
                        <div style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-primary)' }}>
                          <label className="form-checkbox-group" style={{ fontWeight: 600, marginBottom: '0.75rem' }}>
                            {manualMovieForm.owned ? (
                              <input 
                                type="checkbox" 
                                className="form-checkbox"
                                checked={manualMovieForm.is_digital}
                                onChange={(e) => setManualMovieForm({ ...manualMovieForm, is_digital: e.target.checked })}
                              />
                            ) : (
                              <span style={{ marginRight: '0.5rem', color: 'var(--accent)' }}>●</span>
                            )}
                            Digital Archival Details
                          </label>
                          
                          <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div className="form-row" style={{ margin: 0, gap: '0.75rem' }}>
                              <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                                <label>Container Format</label>
                                <input 
                                  type="text" 
                                  placeholder="E.g., MKV, MP4"
                                  className="form-control" 
                                  value={manualMovieForm.digital_format || ''}
                                  onChange={(e) => setManualMovieForm({ ...manualMovieForm, digital_format: e.target.value })}
                                />
                              </div>
                              <div className="form-group" style={{ marginBottom: 0, flex: 1.5 }}>
                                <label>Backup Location</label>
                                <input 
                                  type="text" 
                                  placeholder="E.g., NAS-1, ExtA"
                                  className="form-control" 
                                  value={manualMovieForm.backup_location || ''}
                                  onChange={(e) => setManualMovieForm({ ...manualMovieForm, backup_location: e.target.value })}
                                />
                              </div>
                            </div>

                            {manualMovieForm.owned && (
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
                            )}

                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label>Mounted Source File Path</label>
                              <input 
                                type="text" 
                                placeholder="E.g. Gladiator (2000)/Gladiator.mkv"
                                className="form-control" 
                                value={manualMovieForm.backup_path || ''}
                                onChange={(e) => setManualMovieForm({ ...manualMovieForm, backup_path: e.target.value })}
                              />
                            </div>
                          </div>
                        </div>
                      )}
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
