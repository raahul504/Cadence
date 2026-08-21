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

function EventForm({ onSave, editingEvent, onCancel, recurrencePattern }) {
  const [form, setForm] = useState({ 
    title: "", 
    date: "", 
    time: "", 
    description: "" ,
    color: "#3f51b5" // ADD THIS - Default color (blueberry)
  });
  
  // Recurrence state - integrated directly
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState('daily');
  const [interval, setInterval] = useState(1);
  const [daysOfWeek, setDaysOfWeek] = useState([]);
  const [endType, setEndType] = useState('never');
  const [endDate, setEndDate] = useState('');
  const [occurrenceCount, setOccurrenceCount] = useState(5);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [initialForm, setInitialForm] = useState(null); // ADD THIS - track initial state
  const [initialRecurrence, setInitialRecurrence] = useState(null); // Track initial recurrence state
  const [isSaving, setIsSaving] = useState(false);

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
      
      // Set recurrence pattern if provided
      if (recurrencePattern) {
        setIsRecurring(true);
        setFrequency(recurrencePattern.frequency || 'daily');
        setInterval(recurrencePattern.interval || 1);
        setDaysOfWeek(recurrencePattern.days_of_week || []);
        
        if (recurrencePattern.end_date) {
          setEndType('on_date');
          setEndDate(recurrencePattern.end_date);
        } else if (recurrencePattern.occurrence_count) {
          setEndType('after_count');
          setOccurrenceCount(recurrencePattern.occurrence_count);
        } else {
          setEndType('never');
        }
        // Save initial recurrence state
        setInitialRecurrence({
          isRecurring: true,
          frequency: recurrencePattern.frequency || 'daily',
          interval: recurrencePattern.interval || 1,
          daysOfWeek: recurrencePattern.days_of_week || [],
          endType: recurrencePattern.end_date ? 'on_date' : (recurrencePattern.occurrence_count ? 'after_count' : 'never'),
          endDate: recurrencePattern.end_date || '',
          occurrenceCount: recurrencePattern.occurrence_count || 5
        });
      } else {
        setIsRecurring(false);
        setInitialRecurrence({ isRecurring: false });
      }
    } else {
      setInitialForm({ title: "", date: "", time: "", description: "", color: "#3f51b5" });
      setIsRecurring(false);
      setInitialRecurrence(null);
    }
  }, [editingEvent, recurrencePattern]);

  // ADD THIS - Check if form has changes
  const hasChanges = () => {
    if (!initialForm) return false;
    // Normalize color values for comparison
    const currentColor = form.color || "#3f51b5";
    const initialColor = initialForm.color || "#3f51b5";
    const formChanged = (
      form.title !== initialForm.title ||
      form.date !== initialForm.date ||
      form.time !== initialForm.time ||
      form.description !== initialForm.description ||
      currentColor !== initialColor
    );
    
    // Check if recurrence settings have changed
    let recurrenceChanged = false;
    if (initialRecurrence) {
      recurrenceChanged = (
        isRecurring !== initialRecurrence.isRecurring ||
        (isRecurring && (
          frequency !== initialRecurrence.frequency ||
          interval !== initialRecurrence.interval ||
          JSON.stringify(daysOfWeek) !== JSON.stringify(initialRecurrence.daysOfWeek) ||
          endType !== initialRecurrence.endType ||
          endDate !== initialRecurrence.endDate ||
          occurrenceCount !== initialRecurrence.occurrenceCount
        ))
      );
    } else if (isRecurring) {
      // If there's no initial recurrence but now is recurring, it's a change
      recurrenceChanged = true;
    }
    
    return formChanged || recurrenceChanged;
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSaving) return; // prevent double clicks
    
    // Check if editing a recurring event - show modal to choose scope
    if (editingEvent && (editingEvent.is_recurring || editingEvent.series_id)) {
      setShowEditModal(true);
      return;
    }

    // Proceed with save
    await performSave();
  };

  const performSave = async (scope = null) => {
    setIsSaving(true);

    // ADD THIS - Validate that date/time is not in the past
    const selectedDateTime = new Date(`${form.date}T${form.time}`);
    const now = new Date();
  
    if (selectedDateTime < now) {
      alert("Cannot create events in the past. Please select a future date and time.");
      setIsSaving(false);
      return;
    }

    // Build recurrence pattern
    let recurrence = null;
    if (isRecurring) {
      recurrence = {
        frequency,
        interval: parseInt(interval, 10),
      };

      // Add days of week for weekly recurrence (only if days are selected)
      if (frequency === 'weekly' && daysOfWeek.length > 0) {
        recurrence.days_of_week = daysOfWeek;
      }

      // Add end condition
      if (endType === 'on_date' && endDate) {
        recurrence.end_date = endDate;
      } else if (endType === 'after_count' && occurrenceCount > 0) {
        recurrence.occurrence_count = parseInt(occurrenceCount, 10);
      }
    }

    const eventToSave = {
      ...(editingEvent || {}),
      ...form,
      is_recurring: isRecurring,
      recurrence: recurrence,
      scope: scope // 'instance', 'series', or null for new events
    };
    
    await onSave(eventToSave);
    setIsSaving(false);
    //setForm({ title: "", date: "", time: "", description: "" }); // Form will close automatically via App.js state change    
  };

  const handleEditModalChoice = async (scope) => {
    setShowEditModal(false);
    await performSave(scope);
  };

  const handleCancel = () => {
    onCancel();
    setForm({ title: "", date: "", time: "", description: "" });
    setIsRecurring(false);
    setShowEditModal(false);
  };

  // Recurrence helper functions
  const handleToggleRecurring = (e) => {
    setIsRecurring(e.target.checked);
  };

  const handleFrequencyChange = (e) => {
    const newFrequency = e.target.value;
    setFrequency(newFrequency);
    
    // Reset days of week when changing away from weekly
    if (newFrequency !== 'weekly') {
      setDaysOfWeek([]);
    }
  };

  const handleIntervalChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (value > 0 && value <= 365) {
      setInterval(value);
    }
  };

  const handleDayToggle = (day) => {
    setDaysOfWeek(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day].sort((a, b) => a - b);
      }
    });
  };

  const handleEndTypeChange = (e) => {
    setEndType(e.target.value);
  };

  const handleEndDateChange = (e) => {
    setEndDate(e.target.value);
  };

  const handleOccurrenceCountChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (value > 0 && value <= 999) {
      setOccurrenceCount(value);
    }
  };

  const getFrequencyLabel = () => {
    const labels = {
      daily: 'day(s)',
      weekly: 'week(s)',
      monthly: 'month(s)',
      yearly: 'year(s)'
    };
    return labels[frequency] || 'day(s)';
  };

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Get minimum date for end date (should be after event date)
  const getMinEndDate = () => {
    if (!form.date) return new Date().toISOString().split('T')[0];
    const minDate = new Date(form.date);
    minDate.setDate(minDate.getDate() + 1);
    return minDate.toISOString().split('T')[0];
  };

  return (
    <>
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Recurring Event</h3>
            <p>This is a recurring event. What would you like to edit?</p>
            <div className="modal-actions">
              <button 
                className="btn btn-primary" 
                onClick={() => handleEditModalChoice('instance')}
              >
                This Event Only
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => handleEditModalChoice('series')}
              >
                All Events in Series
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="event-form">
      <div className="form-group">
        {/*<label className="form-label">Event Title</label>*/}
        <input 
          className="form-input"
          placeholder="Event title" 
          value={form.title} 
          onChange={e => setForm({...form, title: e.target.value})} 
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group form-group-half">
          {/*<label className="form-label">Date</label>*/}
          <input 
            className="form-input"
            type="date"
            placeholder="Date" 
            value={form.date} 
            onChange={e => setForm({...form, date: e.target.value})}
            min={new Date().toISOString().split('T')[0]} // ADD THIS
            required
          />
        </div>

        <div className="form-group form-group-half">
          {/*<label className="form-label">Time</label>*/}
          <input 
            className="form-input"
            type="time" 
            placeholder="Time"
            value={form.time} 
            onChange={e => setForm({...form, time: e.target.value})} 
            required
          />
        </div>
      </div>

      <div className="form-group">
        {/*<label className="form-label">Description (Optional)</label>*/}
        <input 
          className="form-input"
          placeholder="Description (Optional)" 
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

      {/* Recurrence Selector - Integrated */}
      <div className="recurrence-selector">
        <div className="recurrence-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={handleToggleRecurring}
              className="toggle-checkbox"
            />
            <span className="toggle-text">Make this a recurring event</span>
          </label>
        </div>

        {isRecurring && (
          <div className="recurrence-options">
            <div className="form-group">
              <label className="form-label">Repeats</label>
              <select
                className="form-input"
                value={frequency}
                onChange={handleFrequencyChange}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Every</label>
              <div className="interval-input-group">
                <input
                  type="number"
                  className="form-input interval-number"
                  value={interval}
                  onChange={handleIntervalChange}
                  min="1"
                  max="365"
                />
                <span className="interval-label">{getFrequencyLabel()}</span>
              </div>
            </div>

            {frequency === 'weekly' && (
              <div className="form-group">
                <label className="form-label">Repeat on</label>
                <div className="days-of-week">
                  {dayLabels.map((label, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`day-button ${daysOfWeek.includes(index) ? 'selected' : ''}`}
                      onClick={() => handleDayToggle(index)}
                      title={dayNames[index]}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Ends</label>
              <div className="end-options">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="endType"
                    value="never"
                    checked={endType === 'never'}
                    onChange={handleEndTypeChange}
                  />
                  <span>Never</span>
                </label>

                <label className="radio-label">
                  <input
                    type="radio"
                    name="endType"
                    value="on_date"
                    checked={endType === 'on_date'}
                    onChange={handleEndTypeChange}
                  />
                  <span>On</span>
                  <input
                    type="date"
                    className="form-input end-date-input"
                    value={endDate}
                    onChange={handleEndDateChange}
                    min={getMinEndDate()}
                    disabled={endType !== 'on_date'}
                  />
                </label>

                <label className="radio-label">
                  <input
                    type="radio"
                    name="endType"
                    value="after_count"
                    checked={endType === 'after_count'}
                    onChange={handleEndTypeChange}
                  />
                  <span>After</span>
                  <input
                    type="number"
                    className="form-input occurrence-count-input"
                    value={occurrenceCount}
                    onChange={handleOccurrenceCountChange}
                    min="1"
                    max="999"
                    disabled={endType !== 'after_count'}
                  />
                  <span>occurrence(s)</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={isButtonDisabled() || isSaving}>
          {isSaving
            ? (editingEvent ? "Saving..." : "Adding...")
            : (editingEvent ? "💾 Update Event" : "➕ Add Event")
          }
        </button>
        {editingEvent && (
          <button type="button" onClick={handleCancel} className="btn btn-secondary">
            ✕ Cancel
          </button>
        )}
      </div>
    </form>
    </>
  );
}

export default EventForm;