import React from "react";
import { formatRecurrencePattern } from "./lib/recurrenceUtils";

function EventDetailView({ event, onBack, onEdit, onDelete, timeFormat, timeZone }) {
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
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone
    });
  };

  return (
    <div className="event-detail-view">
      <div className="event-detail-header">
        <button onClick={onBack} className="btn-back" title="Back to list">
          <span className="material-icons">arrow_back</span>
          <span>Back</span>
        </button>
      </div>

      <div className="event-detail-content">
        <h2 
          className="event-detail-title"
          style={{ "--eventColor": event.color || "#3f51b5" }}
        >{event.title}</h2>

        <div className="event-detail-info">
          <div className="event-detail-info-item">
            <span className="material-icons">calendar_today</span>
            <span>{formatDate(event.date)}</span>
          </div>

          <div className="event-detail-info-item">
            <span className="material-icons">access_time</span>
            <span>{formatTime(event.time)}</span>
          </div>

          {event.recurrence && (
            <div className="event-detail-info-item">
              <span className="material-icons">repeat</span>
              <span>{formatRecurrencePattern(event.recurrence)}</span>
            </div>
          )}
        </div>

        {event.description && (
          <div className="event-detail-description">
            <p>{event.description}</p>
          </div>
        )}

        <div className="event-detail-actions">
          <button 
            onClick={() => onEdit(event)} 
            className="btn btn-primary"
          >
            <span className="material-icons">edit</span>
            <span>Edit</span>
          </button>
          <button 
            onClick={() => onDelete(event)} 
            className="btn btn-danger"
          >
            <span className="material-icons">delete_outline</span>
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default EventDetailView;
