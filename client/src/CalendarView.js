import React, { useState } from "react";
import Calendar from "react-calendar";
import 'react-calendar/dist/Calendar.css';

function CalendarView({ events, onSelectDate }) {
  const [date, setDate] = useState(new Date());

  const handleDateChange = (d) => {
    setDate(d);
    onSelectDate(d);
  };

  // ADD THIS - Function to check if a date is in the past
  const isPastDate = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  const eventsForSelectedDate = events.filter(
    e => {
    // Create local date string without timezone conversion
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formatted = `${year}-${month}-${day}`;
    
    return e.date === formatted;
  }
  );

  return (
    <div>
      <Calendar 
        onChange={handleDateChange} 
        value={date}
        minDate={new Date()} // ADD THIS - Disable past dates
        tileClassName={({ date: d, view }) => {
          if (view === 'month') {
            // Create local date string without timezone conversion
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const formatted = `${year}-${month}-${day}`;

            const eventDates = events.map(e => e.date);
            if (eventDates.includes(formatted)) {
              return 'event-date';
            }
          }
          return null;
        }}
        tileDisabled={({ date: d, view }) => { // ADD THIS - Disable past dates
          if (view === 'month') {
            return isPastDate(d);
          }
          return false;
        }}
      />
      
      {eventsForSelectedDate.length > 0 && (
        <div className="selected-date-events">
          <h3 className="selected-date-title">
            Events on {date.toDateString()}
          </h3>
          <ul className="selected-date-list">
            {eventsForSelectedDate.map(e => (
              <li key={e.id} className="selected-date-item" style={{ borderLeftColor: e.color || '#3f51b5' }}>
                <strong>{e.title}</strong> at {e.time}
                {e.description && ` — ${e.description}`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default CalendarView;