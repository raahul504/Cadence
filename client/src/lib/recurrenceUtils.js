/**
 * Recurrence Utilities
 * Core algorithms for generating recurring event instances
 */

/**
 * Generate event instances for a recurring event within a date range
 * @param {Object} event - Base event object
 * @param {Object} recurrence - Recurrence pattern from event_recurrence table
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @param {Array} exceptions - Array of exception objects
 * @returns {Array} Array of event instances
 */
export function generateEventInstances(event, recurrence, startDate, endDate, exceptions = []) {
  const instances = [];
  const eventDate = new Date(event.date);
  let currentDate = new Date(Math.max(eventDate, startDate));
  
  // Determine recurrence end
  const recurrenceEnd = recurrence.end_date 
    ? new Date(recurrence.end_date) 
    : new Date(endDate);
  
  let occurrenceCount = 0;
  const maxOccurrences = recurrence.occurrence_count || Infinity;
  
  while (currentDate <= recurrenceEnd && 
         currentDate <= endDate && 
         occurrenceCount < maxOccurrences) {
    
    const dateStr = currentDate.toISOString().split('T')[0];
    
    // Check for exceptions
    const exception = exceptions.find(ex => ex.exception_date === dateStr);
    
    if (exception && exception.exception_type === 'deleted') {
      // Skip deleted instances
    } else if (exception && exception.exception_type === 'modified') {
      // Add modified instance
      instances.push({
        ...event,
        id: `${event.id}_${dateStr}`,
        date: dateStr,
        title: exception.modified_title || event.title,
        time: exception.modified_time || event.time,
        description: exception.modified_description || event.description,
        color: exception.modified_color || event.color,
        is_recurring: true,
        is_exception: true,
        series_id: event.id
      });
    } else {
      // Add normal instance
      instances.push({
        ...event,
        id: `${event.id}_${dateStr}`,
        date: dateStr,
        is_recurring: true,
        series_id: event.id
      });
    }
    
    // Calculate next occurrence
    currentDate = getNextOccurrence(currentDate, recurrence);
    occurrenceCount++;
  }
  
  return instances;
}

/**
 * Calculate next occurrence date based on recurrence pattern
 * @param {Date} currentDate - Current occurrence date
 * @param {Object} recurrence - Recurrence pattern
 * @returns {Date} Next occurrence date
 */
export function getNextOccurrence(currentDate, recurrence) {
  const next = new Date(currentDate);
  
  switch (recurrence.frequency) {
    case 'daily':
      next.setDate(next.getDate() + recurrence.interval);
      break;
      
    case 'weekly':
      // Find next matching day of week
      const currentDay = next.getDay();
      const daysOfWeek = recurrence.days_of_week || [currentDay];
      let daysToAdd = 1;
      
      for (let i = 1; i <= 7; i++) {
        const testDay = (currentDay + i) % 7;
        if (daysOfWeek.includes(testDay)) {
          daysToAdd = i;
          break;
        }
      }
      
      next.setDate(next.getDate() + daysToAdd);
      break;
      
    case 'monthly':
      next.setMonth(next.getMonth() + recurrence.interval);
      if (recurrence.day_of_month) {
        next.setDate(recurrence.day_of_month);
      }
      break;
      
    case 'yearly':
      next.setFullYear(next.getFullYear() + recurrence.interval);
      if (recurrence.month_of_year) {
        next.setMonth(recurrence.month_of_year - 1);
      }
      if (recurrence.day_of_month) {
        next.setDate(recurrence.day_of_month);
      }
      break;
      
    default:
      // Unknown frequency - default to daily
      next.setDate(next.getDate() + 1);
      break;
  }
  
  return next;
}

/**
 * Format recurrence pattern into human-readable description
 * @param {Object} recurrence - Recurrence pattern
 * @returns {string} Human-readable description
 */
export function formatRecurrencePattern(recurrence) {
  if (!recurrence) return '';
  
  const { frequency, interval, days_of_week, day_of_month, month_of_year, end_date, occurrence_count } = recurrence;
  
  let description = '';
  
  // Build frequency description
  switch (frequency) {
    case 'daily':
      description = interval === 1 ? 'Daily' : `Every ${interval} days`;
      break;
      
    case 'weekly':
      if (days_of_week && days_of_week.length > 0) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const selectedDays = days_of_week.map(d => dayNames[d]).join(', ');
        description = interval === 1 
          ? `Weekly on ${selectedDays}` 
          : `Every ${interval} weeks on ${selectedDays}`;
      } else {
        description = interval === 1 ? 'Weekly' : `Every ${interval} weeks`;
      }
      break;
      
    case 'monthly':
      if (day_of_month) {
        description = interval === 1 
          ? `Monthly on day ${day_of_month}` 
          : `Every ${interval} months on day ${day_of_month}`;
      } else {
        description = interval === 1 ? 'Monthly' : `Every ${interval} months`;
      }
      break;
      
    case 'yearly':
      if (month_of_year && day_of_month) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        description = interval === 1 
          ? `Yearly on ${monthNames[month_of_year - 1]} ${day_of_month}` 
          : `Every ${interval} years on ${monthNames[month_of_year - 1]} ${day_of_month}`;
      } else {
        description = interval === 1 ? 'Yearly' : `Every ${interval} years`;
      }
      break;
      
    default:
      description = 'Custom recurrence';
  }
  
  // Add end condition
  if (end_date) {
    const endDateObj = new Date(end_date);
    description += ` until ${endDateObj.toLocaleDateString()}`;
  } else if (occurrence_count) {
    description += ` for ${occurrence_count} occurrences`;
  }
  
  return description;
}

/**
 * Validate recurrence pattern
 * @param {Object} recurrence - Recurrence pattern to validate
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateRecurrencePattern(recurrence) {
  const errors = [];
  
  if (!recurrence) {
    return { valid: false, errors: ['Recurrence pattern is required'] };
  }
  
  // Validate frequency
  const validFrequencies = ['daily', 'weekly', 'monthly', 'yearly', 'custom'];
  if (!recurrence.frequency || !validFrequencies.includes(recurrence.frequency)) {
    errors.push('Invalid frequency. Must be one of: daily, weekly, monthly, yearly, custom');
  }
  
  // Validate interval
  if (!recurrence.interval || recurrence.interval < 1) {
    errors.push('Interval must be a positive number');
  }
  
  // Validate days_of_week for weekly frequency
  if (recurrence.frequency === 'weekly' && recurrence.days_of_week) {
    if (!Array.isArray(recurrence.days_of_week)) {
      errors.push('days_of_week must be an array');
    } else if (recurrence.days_of_week.some(d => d < 0 || d > 6)) {
      errors.push('days_of_week must contain values between 0 (Sunday) and 6 (Saturday)');
    }
  }
  
  // Validate day_of_month
  if (recurrence.day_of_month !== undefined && recurrence.day_of_month !== null) {
    if (recurrence.day_of_month < 1 || recurrence.day_of_month > 31) {
      errors.push('day_of_month must be between 1 and 31');
    }
  }
  
  // Validate month_of_year
  if (recurrence.month_of_year !== undefined && recurrence.month_of_year !== null) {
    if (recurrence.month_of_year < 1 || recurrence.month_of_year > 12) {
      errors.push('month_of_year must be between 1 and 12');
    }
  }
  
  // Validate end conditions
  if (recurrence.end_date && recurrence.occurrence_count) {
    errors.push('Cannot specify both end_date and occurrence_count');
  }
  
  if (recurrence.occurrence_count !== undefined && recurrence.occurrence_count !== null) {
    if (recurrence.occurrence_count < 1) {
      errors.push('occurrence_count must be a positive number');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
