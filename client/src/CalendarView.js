import React from "react";
import Calendar from "react-calendar";
import 'react-calendar/dist/Calendar.css';

function CalendarView({ events, selectedDate, onSelectDate, onChangeViewMode }) {
  const handleDateChange = (d) => {
    onSelectDate(d);
    onChangeViewMode("selected");   // <-- add this line
  };

  return (
    <div>
      <Calendar 
        onChange={handleDateChange} 
        value={selectedDate}
        //minDate={new Date()} ADD THIS - Disable past dates
        tileClassName={({ date: d, view }) => {
          if (view === 'month') {
            // Create local date string without timezone conversion
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const formatted = `${year}-${month}-${day}`;

            const eventDates = events.map(e => {
              // Extract just the date part if it's a full timestamp
              if (e.date && e.date.includes('T')) {
                return e.date.split('T')[0];
              }
              return e.date;
            });
            const hasEvent = eventDates.includes(formatted);
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            
            if (hasEvent && isWeekend) {
              return 'event-date weekend-event';
            }
            if (hasEvent) {
              return 'event-date';
            }
          }
          return null;
        }}
        /*tileDisabled={({ date: d, view }) => { // ADD THIS - Disable past dates
          if (view === 'month') {
            return isPastDate(d);
          }
          return false;
        }}*/
      />
    </div>
  );
}

export default CalendarView;