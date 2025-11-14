import React, { useState, useEffect } from "react";
import Clock from "./clock";
import EventForm from "./EventForm";
import EventList from "./EventList";
import CalendarView from "./CalendarView";
import "./modern-calendar.css"; // Import the new CSS file

function App() {
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const eventsForSelectedDate = events.filter(
    e => e.date === selectedDate.toISOString().slice(0, 10));
  const [editingEvent, setEditingEvent] = useState(null);
  const [isEventListExpanded, setIsEventListExpanded] = useState(false); // ADD THIS
  const [showEventForm, setShowEventForm] = useState(false); // ADD THIS
  const [eventToDelete, setEventToDelete] = useState(null); // ADD THIS

  // Fetch events from backend
  useEffect(() => {
    fetch("http://localhost:5000/events")
      .then(res => res.json())
      .then(data => setEvents(data));
  }, []);

  const saveEvent = async (event) => {
    try {
      if (event.id) {
        // Existing event — update
        await fetch(`http://localhost:5000/events/${event.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(event),
        });

        setEvents((prev) =>
          prev.map((e) => (e.id === event.id ? { ...e, ...event } : e))
        );
      } else {
        // New event — add
        const res = await fetch("http://localhost:5000/events", {
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
  const deleteEvent = (id) => {
    fetch(`http://localhost:5000/events/${id}`, { method: "DELETE" })
      .then(() => setEvents(events.filter(e => e.id !== id)));
      setEventToDelete(null); // ADD THIS - Close confirmation modal
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
          {isEventListExpanded && (
            <EventList 
              events={events} 
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