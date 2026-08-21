import React, { useState, useEffect } from "react";
import "./styles/components/recurrence-selector.css";

function RecurrenceSelector({ value, onChange, eventDate }) {
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState('daily');
  const [interval, setInterval] = useState(1);
  const [daysOfWeek, setDaysOfWeek] = useState([]);
  const [endType, setEndType] = useState('never');
  const [endDate, setEndDate] = useState('');
  const [occurrenceCount, setOccurrenceCount] = useState(5);

  // Initialize state from value prop
  useEffect(() => {
    if (value) {
      setIsRecurring(true);
      setFrequency(value.frequency || 'daily');
      setInterval(value.interval || 1);
      setDaysOfWeek(value.days_of_week || []);
      
      if (value.end_date) {
        setEndType('on_date');
        setEndDate(value.end_date);
      } else if (value.occurrence_count) {
        setEndType('after_count');
        setOccurrenceCount(value.occurrence_count);
      } else {
        setEndType('never');
      }
    } else {
      setIsRecurring(false);
    }
  }, [value]);

  // Notify parent of changes
  useEffect(() => {
    if (!isRecurring) {
      onChange(null);
      return;
    }

    const recurrencePattern = {
      frequency,
      interval: parseInt(interval, 10),
    };

    // Add days of week for weekly recurrence (only if days are selected)
    if (frequency === 'weekly' && daysOfWeek.length > 0) {
      recurrencePattern.days_of_week = daysOfWeek;
    }

    // Add end condition
    if (endType === 'on_date' && endDate) {
      recurrencePattern.end_date = endDate;
    } else if (endType === 'after_count' && occurrenceCount > 0) {
      recurrencePattern.occurrence_count = parseInt(occurrenceCount, 10);
    }

    onChange(recurrencePattern);
  }, [isRecurring, frequency, interval, daysOfWeek, endType, endDate, occurrenceCount, onChange]);

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
    if (!eventDate) return new Date().toISOString().split('T')[0];
    const minDate = new Date(eventDate);
    minDate.setDate(minDate.getDate() + 1);
    return minDate.toISOString().split('T')[0];
  };

  return (
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
  );
}

export default RecurrenceSelector;
