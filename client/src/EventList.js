import React from "react";

function EventList({ events, onDelete, onEdit }) {
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
    <ul className="event-list">
      {events.map(e => (
        <li key={e.id} className="event-item" style={{ borderLeftColor: e.color || '#3f51b5' }}>
          <div className="event-info">
            <div className="event-title">{e.title}</div>
            <div className="event-meta">
              <span>📅 {e.date}</span>
              <span>🕐 {e.time}</span>
            </div>
            {e.description && (
              <div className="event-description">{e.description}</div>
            )}
          </div>
          <div className="event-actions">
            <button 
              onClick={() => onEdit(e)} 
              className="btn btn-edit"
              title="Edit event"
            >
              ✏️ Edit
            </button>
            <button 
              onClick={() => onDelete(e)} // CHANGE from onDelete(e.id) to onDelete(e)
              className="btn btn-danger"
              title="Delete event"
            >
              🗑️ Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default EventList;