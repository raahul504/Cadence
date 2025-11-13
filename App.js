import React, { useState, useEffect } from "react";
import Clock from "./clock";
import EventForm from "./EventForm";
import EventList from "./EventList";
import CalendarView from "./CalendarView";

function App() {
   const [events, setEvents] = useState([]);
   const [selectedDate, setSelectedDate] = useState(new Date());

  // Fetch events from backend
  useEffect(() => {
    fetch("http://localhost:5000/events")
      .then(res => res.json())
      .then(data => setEvents(data));
  }, []);

  // Add new event
  const addEvent = (event) => {
    fetch("http://localhost:5000/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    })
      .then(res => res.json())
      .then(() => {
        return fetch("http://localhost:5000/events");
      })
      .then(res => res.json())
      .then(data => setEvents(data));
  };

  // Delete event
  const deleteEvent = (id) => {
    fetch(`http://localhost:5000/events/${id}`, { method: "DELETE" })
      .then(() => setEvents(events.filter(e => e.id !== id)));
  };
  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>Cadence</h1>
      <Clock />
      <EventForm onAdd={addEvent}/>
      <EventList events={events} onDelete={deleteEvent}/>
      <CalendarView events={events} onSelectDate={setSelectedDate} />
      <br></br><p>Welcome! Backend is running on port 5000.</p>
    </div>
  );
}

export default App;
