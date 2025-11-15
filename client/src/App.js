import React, { useState, useEffect } from "react";
import Clock from "./clock";
import EventForm from "./EventForm";
import EventList from "./EventList";
import CalendarView from "./CalendarView";
import "./modern-calendar.css"; // Import the new CSS file

// API URL - will use environment variable in production, localhost in development
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const eventsForSelectedDate = events.filter(e => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const selectedYYYYMMDD = `${year}-${month}-${day}`;
    return e.date === selectedYYYYMMDD;
  });
  const [editingEvent, setEditingEvent] = useState(null);
  const [isEventListExpanded, setIsEventListExpanded] = useState(false); // ADD THIS
  const [showEventForm, setShowEventForm] = useState(false); // ADD THIS
  const [eventToDelete, setEventToDelete] = useState(null); // ADD THIS
  const [viewMode, setViewMode] = useState("selected"); 


  // Fetch events from backend
  useEffect(() => {
    fetch(`${API_URL}/events`)
      .then(res => res.json())
      .then(data => setEvents(data));
  }, []);

  const saveEvent = async (event) => {
    try {
      if (event.id) {
        // Existing event — update
        await fetch(`${API_URL}/events/${event.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(event),
        });

        setEvents((prev) =>
          prev.map((e) => (e.id === event.id ? { ...e, ...event } : e))
        );
      } else {
        // New event — add
        const res = await fetch(`${API_URL}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(event),
        });
        const newEvent = await res.json();
        setEvents((prev) => [...prev, { ...event, id: newEvent.id }]);
      }

      setEditingEvent(null);
      setShowEventForm(false);
    } catch (error) {
      console.error("Error saving event:", error);
    }
  };

  // Delete event
  const deleteEvent = async (id) => {
    try {
      const response = await fetch(`${API_URL}/events/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        // Handle non-successful responses (e.g., server errors)
        console.error("Failed to delete event:", response.status, response.statusText);
        // Optionally, you can show an error message to the user
        return;
      }

      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (error) {
      console.error("Error deleting event:", error);
      // Optionally, show an error message to the user
    } finally {
      setEventToDelete(null); // Close confirmation modal
    }
  };

  const formatSelectedDate = (date) => {
    if (!date) return "";
    return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
  };

  // Format date like "14 November 2025"
  const formatDateLong = (date) => {
    if (!date) return "";
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  };

  const selectedDateFormatted = selectedDate 
  ? formatDateLong(new Date(selectedDate))
  : "";


  const handleShowAllEvents = () => {
    setViewMode("all");
  };
  const handleDateClick = (date) => {
    setSelectedDate(date);
    setViewMode("selected");
  };

  return (
    <div className="app-container">
    <header className="app-header">
      <h1 className="app-title">🗓️ Cadence</h1>
      <div className="clock-container">
        <Clock />
      </div>
    </header>

      {/* REPLACE the main-grid section with this: */}
      <div className="calendar-layout">
        {/* Collapsible Event List Sidebar */}
        <div className={`event-sidebar ${isEventListExpanded ? 'expanded' : ''}`}>
          <div className="event-sidebar-header">
            <button 
              className="btn-toggle-sidebar" 
              onClick={() => setIsEventListExpanded(!isEventListExpanded)}
            >

            {isEventListExpanded ? '◀' : '▶'}
            </button>
            {isEventListExpanded && (
              <>
                <h2 className="sidebar-title">📋 Events</h2>
                <button 
                  className="btn btn-add-event"
                  onClick={() => setShowEventForm(true)}
                >
                  ➕ Add Event
                </button>
              </>
            )}
          </div>

          {/* ---- NEW event list header ---- */}
          {isEventListExpanded && (
            <div className="event-list-header">
                <div className="event-list-title">
                    {viewMode === "all" 
                        ? "All Events"
                        : `Events for ${selectedDateFormatted}`
                    }
                </div>

                {viewMode !== "all" && (
                    <button 
                        className="all-events-btn"
                        onClick={handleShowAllEvents}
                    >
                        All Events
                    </button>
                )}
            </div>
          )} 

          {isEventListExpanded && (
            <EventList 
              events={
                viewMode === "all" 
                  ? events 
                  : events.filter(e => {
                    const year = selectedDate.getFullYear();
                    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                    const day = String(selectedDate.getDate()).padStart(2, '0');
                    const selectedYYYYMMDD = `${year}-${month}-${day}`;
                    return e.date === selectedYYYYMMDD;
                  })
              }
              onDelete={setEventToDelete} // CHANGE THIS - Pass setEventToDelete instead of deleteEvent 
              onEdit={(event) => {
                setEditingEvent(event);
                setShowEventForm(true);
              }} 
            />
          )}
        </div>

        {/* Calendar View */}
        <div className={`calendar-main ${isEventListExpanded ? 'shrink' : ''}`}>
          <div className="card">
            <div className="calendar-summary">
              <strong>📅 {selectedDate.toDateString()}</strong>
              <span style={{ marginLeft: "1rem" }}>
                {eventsForSelectedDate.length > 0
                  ? `${eventsForSelectedDate.length} event${eventsForSelectedDate.length > 1 ? 's' : ''} scheduled`
                  : "No events scheduled"}
              </span>
            </div>
            <CalendarView 
              events={events} 
              onSelectDate={setSelectedDate}
              onChangeViewMode={setViewMode} 
              selectedDate={selectedDate}
            />
          </div>
        </div>
      </div>

      {/* REPLACE Event Form with Modal */}
      {showEventForm && (
        <div className="modal-overlay" onClick={() => {
          setShowEventForm(false);
          setEditingEvent(null);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingEvent ? "✏️ Edit Event" : "➕ Create Event"}
              </h2>
              <button 
                className="btn-close-modal"
                onClick={() => {
                  setShowEventForm(false);
                  setEditingEvent(null);
                }}
              >
                ✕
              </button>
            </div>
            <EventForm 
              onSave={saveEvent} 
              editingEvent={editingEvent} 
              onCancel={() => {
                setShowEventForm(false);
                setEditingEvent(null);
              }} 
            />
          </div>
        </div>
      )}

      {/* ADD THIS - Delete Confirmation Modal */}
      {eventToDelete && (
        <div className="modal-overlay" onClick={() => setEventToDelete(null)}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">⚠️ Delete Event</h2>
              <button 
                className="btn-close-modal"
                onClick={() => setEventToDelete(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p className="delete-warning-text">
                Are you sure you want to delete <strong>"{eventToDelete.title}"</strong>?
              </p>
              <p className="delete-warning-subtext">
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setEventToDelete(null)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-delete-confirm"
                onClick={() => deleteEvent(eventToDelete.id)}
              >
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="app-footer">
        <p>Backend running on port 5000 • Made with ❤️</p>
      </footer>
    </div>
  );
}

export default App;