import { useState, useRef, useEffect } from "react";
import { Search, Bell, Menu, Mountain, Map as MapIcon } from "lucide-react";
import { searchLocation } from "../../services/geocodingService";

export default function Header({
  overallStatus,
  alertCount,
  viewMode,
  onViewModeChange,
  onSelectLocation,
  onToggleSidebar,
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const found = await searchLocation(query);
      setResults(found);
      setOpen(true);
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const statusText =
    overallStatus === "critical"
      ? "CRITICAL RISK DETECTED"
      : overallStatus === "warning"
      ? "ELEVATED RISK"
      : "SYSTEM OPERATIONAL";

  return (
    <header className="app-header">
      <button
        className="icon-button"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
        style={{ display: "none" }}
        id="sidebar-toggle"
      >
        <Menu size={16} />
      </button>

      <div className="brand">
        <div className="brand-mark">
          <Mountain size={17} strokeWidth={2.4} />
        </div>
        <div>
          <div className="brand-text-title">COAL MINE INTELLIGENCE</div>
          <div className="brand-text-subtitle">
            Subsidence Monitoring &amp; Early Warning — GIS
          </div>
        </div>
      </div>

      <div className="header-status-pill">
        <span className={`dot dot-${overallStatus}`} />
        {statusText}
      </div>

      <div className="header-search">
        <Search size={14} className="icon" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search mine / node / location e.g. Dhanbad, 23.742, 86.412"
        />
        {open && results.length > 0 && (
          <div className="header-search-results">
            {results.map((r) => (
              <button
                key={r.id}
                onMouseDown={() => {
                  onSelectLocation(r);
                  setQuery(r.label);
                  setOpen(false);
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="header-spacer" />

      <div className="view-toggle">
        <button
          className={viewMode === "2d" ? "active" : ""}
          onClick={() => onViewModeChange("2d")}
        >
          <MapIcon size={12} style={{ marginRight: 5, verticalAlign: -2 }} />
          2D MAP
        </button>
        <button
          className={viewMode === "3d" ? "active" : ""}
          onClick={() => onViewModeChange("3d")}
        >
          <Mountain size={12} style={{ marginRight: 5, verticalAlign: -2 }} />
          3D TERRAIN
        </button>
      </div>

      <div className="header-actions">
        <button className="icon-button" aria-label="Alerts">
          <Bell size={16} />
          {alertCount > 0 && (
            <span className="alert-badge">{alertCount}</span>
          )}
        </button>
      </div>
    </header>
  );
}
