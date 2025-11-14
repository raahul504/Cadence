import React, { useState, useEffect } from "react";

// ADD THIS - Color options array
const colorOptions = [
  { name: 'tomato', value: '#d50000' },
  { name: 'flamingo', value: '#e67c73' },
  { name: 'tangerine', value: '#f4511e' },
  { name: 'banana', value: '#f6bf26' },
  { name: 'sage', value: '#33b679' },
  { name: 'basil', value: '#0b8043' },
  { name: 'peacock', value: '#039be5' },
  { name: 'blueberry', value: '#3f51b5' },
  { name: 'lavender', value: '#7986cb' },
  { name: 'grape', value: '#8e24aa' },
  { name: 'graphite', value: '#616161' },
];

function EventForm({ onSave, editingEvent, onCancel }) {
  const [form, setForm] = useState({ 
    title: "", 
    date: "", 
    time: "", 
    description: "" ,
    color: "#3f51b5" // ADD THIS - Default color (blueberry)
  });
  const [initialForm, setInitialForm] = useState(null); // ADD THIS - track initial state

  useEffect(() => {
    if (editingEvent) {
      const formData = {
        title: editingEvent.title || "",
        date: editingEvent.date || "",
        time: editingEvent.time || "",
        description: editingEvent.description || "",
        color: editingEvent.color || "#3f51b5", // ADD THIS
      };
      setForm(formData);
      setInitialForm(formData); // ADD THIS - save initial state
    } else {
      setInitialForm({ title: "", date: "", time: "", description: "" }); // ADD THIS
    }
  }, [editingEvent]);

  // ADD THIS - Check if form has changes
  const hasChanges = () => {
    if (!initialForm) return false;
    // Normalize color values for comparison
    const currentColor = form.color || "#3f51b5";
    const initialColor = initialForm.color || "#3f51b5";
    return (
      form.title !== initialForm.title ||
      form.date !== initialForm.date ||
      form.time !== initialForm.time ||
      form.description !== initialForm.description ||
      currentColor !== initialColor // UPDATE THIS LINE
    );
  };

  // ADD THIS - Check if form is valid (required fields filled)
  const isFormValid = () => {
    return form.title.trim() !== "" && form.date !== "" && form.time !== "";
  };

  // ADD THIS - Check if button should be disabled
  const isButtonDisabled = () => {
    if (editingEvent) {
      // For editing: disable if no changes OR invalid
      return !hasChanges() || !isFormValid();
    } else {
      // For new event: disable if invalid
      return !isFormValid();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // ADD THIS - Validate that date/time is not in the past
    const selectedDateTime = new Date(`${form.date}T${form.time}`);
    const now = new Date();
  
    if (selectedDateTime < now) {
      alert("Cannot create events in the past. Please select a future date and time.");
      return;
    }

    const eventToSave = editingEvent ? { ...editingEvent, ...form } : form;
    onSave(eventToSave);
    //setForm({ title: "", date: "", time: "", description: "" }); // Form will close automatically via App.js state change    
  };

  const handleCancel = () => {
    onCancel();
    setForm({ title: "", date: "", time: "", description: "" });
  };

  return (
    <form onSubmit={handleSubmit} className="event-form">
      <div className="form-group">
        <label className="form-label">Event Title</label>
        <input 
          className="form-input"
          placeholder="Enter event title" 
          value={form.title} 
          onChange={e => setForm({...form, title: e.target.value})} 
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Date</label>
        <input 
          className="form-input"
          type="date" 
          value={form.date} 
          onChange={e => setForm({...form, date: e.target.value})}
          min={new Date().toISOString().split('T')[0]} // ADD THIS
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Time</label>
        <input 
          className="form-input"
          type="time" 
          value={form.time} 
          onChange={e => setForm({...form, time: e.target.value})} 
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Description (Optional)</label>
        <input 
          className="form-input"
          placeholder="Add event details" 
          value={form.description} 
          onChange={e => setForm({...form, description: e.target.value})} 
        />
      </div>

      {/* ADD THIS - Color Picker */}
      <div className="form-group color-picker-group">
        <label className="form-label">Event Color</label>
        <div className="color-options">
          {colorOptions.map(color => (
            <button
              key={color.name}
              type="button"
              className={`color-option color-${color.name} ${form.color === color.value ? 'selected' : ''}`}
              onClick={() => setForm({...form, color: color.value})}
              title={color.name}
            />
          ))}
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={isButtonDisabled()}>
          {editingEvent ? "💾 Update Event" : "➕ Add Event"}
        </button>
        {editingEvent && (
          <button type="button" onClick={handleCancel} className="btn btn-secondary">
            ✕ Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default EventForm;