import React, { useState, useMemo, useEffect } from "react";

function EventList({ events, onDelete, onEdit, onEventClick, timeFormat, timeZone, viewMode, sortOption, onViewModeChange, onSortOptionChange }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Filter recurring events to show only the base event (not instances)
  const filterRecurringEvents = (eventList) => {
    const seen = new Set();
    return eventList.filter(event => {
      // If it's a recurring event instance (id contains '_')
      if (String(event.id).includes('_')) {
        // Extract the base event ID from instance ID (e.g., "123_2024-05-15" -> "123")
        const baseId = String(event.id).split('_')[0];
        // Check if we've already seen this series
        if (seen.has(baseId)) {
          return false; // Skip this instance
        }
        seen.add(baseId);
        return true; // Show first instance of the series
      }
      // For non-recurring events or base recurring events, always show
      return true;
    });
  };

  // Filter out duplicate recurring instances
  const filteredEvents = filterRecurringEvents(events);

  // Sort events based on selected option
  const sortedEvents = useMemo(() => {
    const sorted = [...filteredEvents];
    
    switch (sortOption) {
      case "date-asc":
        sorted.sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.time || "00:00"}`);
          const dateB = new Date(`${b.date}T${b.time || "00:00"}`);
          return dateA - dateB;
        });
        break;
      case "date-desc":
        sorted.sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.time || "00:00"}`);
          const dateB = new Date(`${b.date}T${b.time || "00:00"}`);
          return dateB - dateA;
        });
        break;
      case "color":
        sorted.sort((a, b) => {
          const colorA = a.color || "#000000";
          const colorB = b.color || "#000000";
          return colorA.localeCompare(colorB);
        });
        break;
      default:
        // Default: sort by date descending
        sorted.sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.time || "00:00"}`);
          const dateB = new Date(`${b.date}T${b.time || "00:00"}`);
          return dateB - dateA;
        });
    }
    
    return sorted;
  }, [filteredEvents, sortOption]);

  const formatTime = (time) => {
    if (!time) return "No time";

    // Time coming from server: "13:00:00"
    const [h, m] = time.split(":");

    const dateObj = new Date();
    dateObj.setHours(h, m);

    return dateObj.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: timeFormat === "12h",
      timeZone
    });
  };

  const formatDate = (date) => {
    if (!date) return "No date";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone
    });
  };

  // Handle clicking outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownOpen && !event.target.closest('.event-list-controls')) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  if (events.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '2rem 1rem' }}>
      <div className="empty-state-icon" style={{ fontSize: '2rem' }}>📭</div>
      <p className="empty-state-text" style={{ fontSize: '0.9rem' }}>
        No events yet
      </p>
      </div>
    );
  }

  return (
    <>
      {/* Controls: View Mode Toggle and Sort Dropdown */}
      <div className="event-list-controls">
        <div className="event-list-header">
          <div className="view-toggle">
            <button 
              className={`btn-view-mode ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => onViewModeChange && onViewModeChange('list')}
              title="Single column view"
            >
              <span className="material-icons icon-small">list</span>
            </button>
            <button 
              className={`btn-view-mode ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => onViewModeChange && onViewModeChange('grid')}
              title="Two column grid view"
            >
              <span className="material-icons icon-small">grid_view</span>
            </button>
          </div>
          
          <div className="sort-dropdown event-list-controls">
            <button 
              className="btn-sort-trigger"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              title="Sort and view options"
            >
              <span className="material-icons icon-small">sort</span>
            </button>
            
            {dropdownOpen && (
              <div className="sort-menu">
                <div className="sort-menu-header">Sort By</div>
                <button 
                  className={`sort-option ${sortOption === 'date-asc' ? 'active' : ''}`}
                  onClick={() => { onSortOptionChange && onSortOptionChange('date-asc'); setDropdownOpen(false); }}
                >
                  <span className="material-icons icon-small">sort_by_alpha</span>
                  <span>Oldest to Newest</span>
                </button>
                <button 
                  className={`sort-option ${sortOption === 'date-desc' ? 'active' : ''}`}
                  onClick={() => { onSortOptionChange && onSortOptionChange('date-desc'); setDropdownOpen(false); }}
                >
                  <span className="material-icons icon-small">sort_by_alpha</span>
                  <span>Newest to Oldest</span>
                </button>
                <button 
                  className={`sort-option ${sortOption === 'color' ? 'active' : ''}`}
                  onClick={() => { onSortOptionChange && onSortOptionChange('color'); setDropdownOpen(false); }}
                >
                  <span className="material-icons icon-small">palette</span>
                  <span>By Color</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <ul className={`event-list ${viewMode === 'grid' ? 'grid-view' : 'list-view'}`}>
      {sortedEvents.map(e => (
        <li key={e.id} className="event-item" style={{ "--eventColor": e.color || "#3f51b5" }}>
          <div 
            className="event-info"
            onClick={() => onEventClick && onEventClick(e)}
            style={{ cursor: onEventClick ? 'pointer' : 'default' }}
          >
            <div className="event-title">
              {e.title}
              {(e.is_recurring || e.series_id) && (
                <span className="recurrence-indicator" title="Recurring event">🔁</span>
              )}
            </div>
            {e.description && (
              <div className="event-description">{e.description}</div>
            )}
            <div className="event-meta">
              <span> {formatDate(e.date)}</span>
              <span> {formatTime(e.time)}</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
    </>
  );
}

export default EventList;
