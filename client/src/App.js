import React, { useState, useEffect } from "react";
import { useAuth } from "./contexts/AuthContext";
import { eventHelpers, recurrenceHelpers, profileHelpers } from "./lib/supabase";
import { generateEventInstances } from "./lib/recurrenceUtils";
import Clock from "./clock";
import EventForm from "./EventForm";
import EventList from "./EventList";
import EventDetailView from "./EventDetailView";
import CalendarView from "./CalendarView";
import ChatInterface from "./ChatInterface"; 
import AuthPage from "./pages/AuthPage";
import WallpaperPicker from './styles/components/WallpaperPicker';
import { getWallpaperCSS } from './lib/wallpaperPresets';
import "./styles/index.css";

function App() {
  const { user, profile, loading: authLoading, signOut, updateProfile } = useAuth();
  
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [editingEvent, setEditingEvent] = useState(null);
  const [editingRecurrencePattern, setEditingRecurrencePattern] = useState(null);
  const [isEventListExpanded, setIsEventListExpanded] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [deleteScope, setDeleteScope] = useState(null); // 'instance' | 'series'
  const [showDeleteScopeModal, setShowDeleteScopeModal] = useState(false);
  const [viewMode, setViewMode] = useState("selected");
  const [isChatSidebarExpanded, setIsChatSidebarExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  // Event detail view state (Task 11.1)
  const [detailViewMode, setDetailViewMode] = useState("list"); // 'list' | 'detail'
  const [selectedEvent, setSelectedEvent] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [recurrencePatterns, setRecurrencePatterns] = useState({});
  // eslint-disable-next-line no-unused-vars
  const [exceptions, setExceptions] = useState({});

  // Local state for settings
  const [timeFormat, setTimeFormat] = useState("12h");
  const [timeZone, setTimeZone] = useState("Asia/Calcutta");

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsWidth, setSettingsWidth] = useState(0);
  const [showClearChatModal, setShowClearChatModal] = useState(false);

  // Sidebar header dropdown state
  const [sidebarDropdownOpen, setSidebarDropdownOpen] = useState(false);
  const [sidebarViewMode, setSidebarViewMode] = useState("list"); // 'list' or 'grid'
  const [sidebarSortOption, setSidebarSortOption] = useState("date-desc"); // 'date-asc', 'date-desc', 'color'

  // Wallpaper settings state
  const [showWallpaperPicker, setShowWallpaperPicker] = useState(false);
  const [wallpaperSettings, setWallpaperSettings] = useState({
    type: 'gradient',
    value: 'sunset',
    blur: 0,
    brightness: 100
  });

  // Load settings from profile
  useEffect(() => {
    if (profile) {
      setTimeFormat(profile.time_format || "12h");
      setTimeZone(profile.timezone || "Asia/Calcutta");
    }
  }, [profile]);

  // Load wallpaper settings from profile
  useEffect(() => {
    if (profile) {
      setWallpaperSettings({
        type: profile.wallpaper_type || 'gradient',
        value: profile.wallpaper_value || 'sunset',
        blur: profile.wallpaper_blur || 0,
        brightness: profile.wallpaper_brightness || 100
      });
    }
  }, [profile]);

  // Load event list preferences from profile
  useEffect(() => {
    if (profile) {
      setSidebarViewMode(profile.event_list_view_mode || "list");
      setSidebarSortOption(profile.event_list_sort_option || "date-desc");
    }
  }, [profile]);

  // Save event list view mode preference to Supabase
  const handleViewModeChange = async (newMode) => {
    setSidebarViewMode(newMode);
    if (user) {
      await profileHelpers.updatePreference(user.id, 'event_list_view_mode', newMode);
    }
  };

  // Save event list sort option preference to Supabase
  const handleSortOptionChange = async (newOption) => {
    setSidebarSortOption(newOption);
    if (user) {
      await profileHelpers.updatePreference(user.id, 'event_list_sort_option', newOption);
    }
  };
  
  useEffect(() => {
    window.openChatClearModal = () => {
      setShowClearChatModal(true);
    };
  }, []);

  // Filter events for selected date
  const eventsForSelectedDate = events.filter(e => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const selectedYYYYMMDD = `${year}-${month}-${day}`;
    return e.date === selectedYYYYMMDD;
  });

  // Fetch events when user is authenticated
  useEffect(() => {
    if (user) {
      loadEvents();
    } else {
      setEvents([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadEvents = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await eventHelpers.getEvents(user.id);
      if (error) throw error;
      
      const formattedEvents = data.map(event => ({
        ...event,
        date: event.date instanceof Date 
          ? `${event.date.getFullYear()}-${String(event.date.getMonth() + 1).padStart(2, '0')}-${String(event.date.getDate()).padStart(2, '0')}`
          : event.date
      }));
      
      // Load recurrence data and generate instances for recurring events
      const allEvents = [];
      const today = new Date();
      const twoYearsFromNow = new Date();
      twoYearsFromNow.setFullYear(today.getFullYear() + 2);
      
      for (const event of formattedEvents) {
        if (event.is_recurring) {
          // Load recurrence pattern and exceptions
          const recurrenceData = await loadRecurrenceData(event.id);
          const exceptionsData = await loadExceptions(event.id);
          
          if (recurrenceData) {
            // Generate instances for the next 2 years
            const instances = generateEventInstances(
              event,
              recurrenceData,
              today,
              twoYearsFromNow,
              exceptionsData
            );
            allEvents.push(...instances);
          } else {
            // If no recurrence pattern found, treat as regular event
            allEvents.push(event);
          }
        } else {
          // Non-recurring event
          allEvents.push(event);
        }
      }
      
      setEvents(allEvents);
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  };

  // Task 11.3: Load recurrence data for an event
  const loadRecurrenceData = async (eventId) => {
    try {
      const { data, error } = await recurrenceHelpers.getRecurrence(eventId);
      if (error) {
        // No recurrence pattern found (not an error for non-recurring events)
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }
      
      // Store in state for later use
      setRecurrencePatterns(prev => ({
        ...prev,
        [eventId]: data
      }));
      
      return data;
    } catch (error) {
      console.error(`Error loading recurrence data for event ${eventId}:`, error);
      return null;
    }
  };

  // Task 11.3: Load exceptions for an event
  const loadExceptions = async (eventId) => {
    try {
      const { data, error } = await recurrenceHelpers.getExceptions(eventId);
      if (error) throw error;
      
      // Store in state for later use
      setExceptions(prev => ({
        ...prev,
        [eventId]: data || []
      }));
      
      return data || [];
    } catch (error) {
      console.error(`Error loading exceptions for event ${eventId}:`, error);
      return [];
    }
  };

  // Handle editing an event - fetch recurrence pattern if needed
  const handleEditEvent = async (event) => {
    setEditingEvent(event);
    
    // If it's a recurring event, fetch the recurrence pattern
    if (event.is_recurring) {
      try {
        // Extract base event ID if this is an instance
        const baseEventId = String(event.id).includes('_')
          ? parseInt(String(event.id).split('_')[0], 10)
          : event.id;
        
        const { data, error } = await recurrenceHelpers.getRecurrence(baseEventId);
        if (error) {
          console.error('Error fetching recurrence pattern:', error);
          setEditingRecurrencePattern(null);
        } else {
          setEditingRecurrencePattern(data);
        }
      } catch (error) {
        console.error('Error fetching recurrence pattern:', error);
        setEditingRecurrencePattern(null);
      }
    } else {
      setEditingRecurrencePattern(null);
    }
    
    setShowEventForm(true);
  };

  const saveEvent = async (event) => {
    try {
      // Extract recurrence data and non-database fields
      const { recurrence, scope, instanceDate, series_id, ...restData } = event;
      
      // Only include fields that exist in the events table
      const eventData = {
        title: restData.title,
        date: restData.date,
        time: restData.time,
        description: restData.description,
        color: restData.color,
        is_recurring: restData.is_recurring
      };
      
      if (event.id) {
        // Editing existing event
        
        // Check if this is a recurring event instance (ID contains underscore)
        const isInstance = String(event.id).includes('_');
        // Extract the base event ID from instance ID (e.g., "123_2024-05-15" -> "123")
        const seriesId = isInstance ? parseInt(String(event.id).split('_')[0], 10) : event.id;
        
        if (event.is_recurring && scope === 'instance' && instanceDate) {
          // Editing single instance - create exception
          const exceptionData = {
            exception_date: instanceDate,
            exception_type: 'modified',
            modified_title: eventData.title,
            modified_time: eventData.time,
            modified_description: eventData.description,
            modified_color: eventData.color
          };
          
          const { error } = await recurrenceHelpers.createException(seriesId, exceptionData);
          if (error) throw error;
          
          // Reload events to show updated instance
          await loadEvents();
        } else if (event.is_recurring && scope === 'series') {
          // Editing entire series
          
          // Update base event
          // eslint-disable-next-line no-unused-vars
          const { data: updatedEvent, error: eventError } = await eventHelpers.updateEvent(seriesId, eventData);
          if (eventError) throw eventError;
          
          // Update recurrence pattern if provided
          if (recurrence) {
            const { error: recurrenceError } = await recurrenceHelpers.updateRecurrence(seriesId, recurrence);
            if (recurrenceError) throw recurrenceError;
          }
          
          // Reload events to regenerate all instances
          await loadEvents();
        } else {
          // Non-recurring event or regular update
          const { data, error } = await eventHelpers.updateEvent(event.id, eventData);
          if (error) throw error;
          setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, ...data } : e)));
        }
      } else {
        // Creating new event
        const { data, error } = await eventHelpers.createEvent(user.id, eventData);
        if (error) throw error;
        
        // If recurring, create recurrence pattern
        if (eventData.is_recurring && recurrence) {
          const { error: recurrenceError } = await recurrenceHelpers.createRecurrence(data.id, recurrence);
          if (recurrenceError) throw recurrenceError;
          
          // Reload events to generate instances
          await loadEvents();
        } else {
          // Non-recurring event - just add to list
          const formattedEvent = {
            ...data,
            date: data.date instanceof Date 
              ? `${data.date.getFullYear()}-${String(data.date.getMonth() + 1).padStart(2, '0')}-${String(data.date.getDate()).padStart(2, '0')}`
              : data.date
          };
          setEvents((prev) => [...prev, formattedEvent]);
        }
      }
      
      setEditingEvent(null);
      setShowEventForm(false);
    } catch (error) {
      console.error("Error saving event:", error);
      alert("Failed to save event. Please try again.");
    }
  };

  const deleteEvent = async (id) => {
    try {
      const { error } = await eventHelpers.deleteEvent(id);
      if (error) throw error;
      setEvents(events.filter(e => e.id !== id));
      setEventToDelete(null);
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Failed to delete event. Please try again.");
    }
  };

  // Handle delete button click - check if recurring
  const handleDeleteClick = (event) => {
    if (event.is_recurring) {
      // Show scope selection modal for recurring events
      setEventToDelete(event);
      setShowDeleteScopeModal(true);
    } else {
      // Show regular delete confirmation for non-recurring events
      setEventToDelete(event);
      setShowDeleteScopeModal(false);
    }
  };

  // Execute delete based on scope
  const executeDelete = async () => {
    if (!eventToDelete) return;
    
    try {
      if (eventToDelete.is_recurring && deleteScope === 'instance') {
        // Delete single instance - create exception
        // Extract base event ID from instance ID if it contains underscore
        const seriesId = String(eventToDelete.id).includes('_') 
          ? parseInt(String(eventToDelete.id).split('_')[0], 10)
          : eventToDelete.id;
        const instanceDate = eventToDelete.date;
        
        const exceptionData = {
          exception_date: instanceDate,
          exception_type: 'deleted'
        };
        
        const { error } = await recurrenceHelpers.createException(seriesId, exceptionData);
        if (error) throw error;
        
        // Reload events to hide deleted instance
        await loadEvents();
      } else if (eventToDelete.is_recurring && deleteScope === 'series') {
        // Delete entire series
        // Extract base event ID from instance ID if it contains underscore
        const seriesId = String(eventToDelete.id).includes('_')
          ? parseInt(String(eventToDelete.id).split('_')[0], 10)
          : eventToDelete.id;
        
        // Delete recurrence pattern (cascade will handle exceptions)
        const { error: recurrenceError } = await recurrenceHelpers.deleteRecurrence(seriesId);
        if (recurrenceError) throw recurrenceError;
        
        // Delete base event
        const { error: eventError } = await eventHelpers.deleteEvent(seriesId);
        if (eventError) throw eventError;
        
        // Reload events to remove all instances
        await loadEvents();
      } else {
        // Non-recurring event - regular delete
        await deleteEvent(eventToDelete.id);
      }
      
      // Reset state
      setEventToDelete(null);
      setDeleteScope(null);
      setShowDeleteScopeModal(false);
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Failed to delete event. Please try again.");
    }
  };

  // NEW - Handle AI event commands
  const handleEventCommand = async (commandData) => {
    console.log('=== handleEventCommand called ===');
    console.log('Raw commandData:', commandData);
    console.log('Type:', typeof commandData);
    
    try {
      // Handle different input formats
      let commands = [];
      
      if (Array.isArray(commandData)) {
        commands = commandData;
        console.log('Format: Array');
      } else if (commandData?.commands) {
        commands = commandData.commands;
        console.log('Format: Has commands property');
      } else if (commandData?.command) {
        commands = [commandData.command];
        console.log('Format: Has command property');
      } else if (commandData?.action) {
        commands = [commandData];
        console.log('Format: Single command object');
      } else {
        console.log('Invalid command data:', commandData);
        return;
      }
      
      console.log('Commands to execute:', commands);
      
      for (const command of commands) {
        console.log('Executing command:', command);
        
        switch (command.action) {
          case 'create_event':
            if (command.data) {
              console.log('Creating event:', command.data);
              
              // Handle recurring event creation
              if (command.data.is_recurring && command.data.recurrence) {
                console.log('Creating recurring event with pattern:', command.data.recurrence);
                // Pass recurrence data to saveEvent
                await saveEvent({
                  ...command.data,
                  recurrence: command.data.recurrence
                });
              } else {
                // Non-recurring event
                await saveEvent(command.data);
              }
            }
            break;
            
          case 'update_event':
            if (command.data && command.data.id) {
              console.log('Updating event:', command.data);
              
              // Handle recurring event updates with scope
              if (command.data.scope) {
                console.log('Update scope:', command.data.scope);
                
                if (command.data.scope === 'instance' && command.data.date) {
                  // Update single instance - pass scope and instanceDate
                  await saveEvent({
                    ...command.data,
                    scope: 'instance',
                    instanceDate: command.data.date,
                    is_recurring: true
                  });
                } else if (command.data.scope === 'series') {
                  // Update entire series - pass scope
                  await saveEvent({
                    ...command.data,
                    scope: 'series',
                    is_recurring: true
                  });
                }
              } else {
                // Non-recurring event or no scope specified
                await saveEvent(command.data);
              }
            }
            break;
            
          case 'delete_event':
            if (command.data && command.data.id) {
              console.log('Deleting event:', command.data.id);
              
              // Handle recurring event deletion with scope
              if (command.data.scope) {
                console.log('Delete scope:', command.data.scope);
                
                // Find the event to determine if it's recurring
                const eventToDelete = events.find(e => 
                  e.id === command.data.id || 
                  String(e.id).startsWith(command.data.id + '_')
                );
                
                if (eventToDelete && command.data.scope === 'instance' && command.data.date) {
                  // Delete single instance - create exception
                  const seriesId = String(eventToDelete.id).includes('_')
                    ? parseInt(String(eventToDelete.id).split('_')[0], 10)
                    : command.data.id;
                  const exceptionData = {
                    exception_date: command.data.date,
                    exception_type: 'deleted'
                  };
                  
                  const { error } = await recurrenceHelpers.createException(seriesId, exceptionData);
                  if (error) throw error;
                  
                  console.log('Created deletion exception for instance:', command.data.date);
                } else if (eventToDelete && command.data.scope === 'series') {
                  // Delete entire series
                  const seriesId = String(eventToDelete.id).includes('_')
                    ? parseInt(String(eventToDelete.id).split('_')[0], 10)
                    : command.data.id;
                  
                  // Delete recurrence pattern (cascade will handle exceptions)
                  const { error: recurrenceError } = await recurrenceHelpers.deleteRecurrence(seriesId);
                  if (recurrenceError) throw recurrenceError;
                  
                  // Delete base event
                  const { error: eventError } = await eventHelpers.deleteEvent(seriesId);
                  if (eventError) throw eventError;
                  
                  console.log('Deleted entire series:', seriesId);
                }
              } else {
                // Non-recurring event or no scope specified - regular delete
                await deleteEvent(command.data.id);
              }
            }
            break;
            
          default:
            console.log('Unknown command:', command.action);
        }
      }
      
      await loadEvents();
      console.log('Events reloaded');
      
    } catch (error) {
      console.error('Error executing AI command:', error);
      throw error;
    }
  };

  const formatDateLong = (date) => {
    if (!date) return "";
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const selectedDateFormatted = selectedDate ? formatDateLong(new Date(selectedDate)) : "";
  const handleShowAllEvents = () => setViewMode("all");

  // Event detail navigation functions (Task 11.2)
  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setDetailViewMode("detail");
  };

  const handleBackToList = () => {
    setSelectedEvent(null);
    setDetailViewMode("list");
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      // Peek drawer when cursor touches left 5px
      if (!settingsOpen && e.clientX <= 5) {
        setSettingsWidth(30);
      } else if (!settingsOpen) {
        setSettingsWidth(0);
      }
    };

    const handleMouseDown = (e) => {
      // Click-to-open when clicking within the left 15px zone
      if (!settingsOpen && e.clientX <= 15) {
        setSettingsOpen(true);
        setSettingsWidth(320);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, [settingsOpen]);

  // Click outside handler for sidebar dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarDropdownOpen && !event.target.closest('.sidebar-header-dropdown')) {
        setSidebarDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sidebarDropdownOpen]);

  if (authLoading) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  // Wallpaper save handler
  const handleWallpaperSave = (newSettings) => {
    setWallpaperSettings(newSettings);
  };

  return (
    <div className="app-container">
      <div className="app-background" style={getWallpaperCSS(wallpaperSettings.type, wallpaperSettings.value, wallpaperSettings.blur, wallpaperSettings.brightness)}/>
      <header className="app-header">
        <div className="header-left">
         
          <span className="header-date">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric"
            })}
          </span>
        </div>

        <div className="clock-container">
          <Clock timeFormat={timeFormat} timeZone={timeZone}/>
        </div>
      </header>
      <div className="calendar-layout">
        <div className={`event-sidebar ${isEventListExpanded ? 'expanded' : ''} ${detailViewMode === 'detail' && selectedEvent ? 'detail-mode' : ''}`}
          onClick={() => { if (!isEventListExpanded) setIsEventListExpanded(true); }}>
          
          {/* Show normal header only when NOT in detail view */}
          {!(detailViewMode === 'detail' && selectedEvent) && (
            <div className="event-sidebar-header">
              {!isEventListExpanded && (
                <div className="sidebar-vertical-label left">Events</div>
              )}

              {isEventListExpanded && (
                <>
                  <button className="btn-toggle-sidebar" onClick={(e) => { e.stopPropagation(); setIsEventListExpanded(false); }}>
                    <span className="material-icons icon-large">chevron_left</span>
                    <span>Events</span>
                  </button>
                  <button className="btn btn-add-event" onClick={() => setShowEventForm(true)}>➕</button>
                </>
              )}
            </div>
          )}

          {isEventListExpanded && !(detailViewMode === 'detail' && selectedEvent) && (
            <div className="event-list-header">
              <div className="event-list-title">
                {viewMode === "all" ? "All Events" : `Events for ${selectedDateFormatted}`}
              </div>
              {viewMode !== "all" && <button className="all-events-btn" onClick={handleShowAllEvents}>All Events</button>}
            </div>
          )} 

          {isEventListExpanded && (
            loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading events...</div>
            ) : detailViewMode === 'detail' && selectedEvent ? (
              <EventDetailView
                event={selectedEvent}
                onBack={handleBackToList}
                onEdit={(event) => { 
                  handleEditEvent(event);
                }}
                onDelete={handleDeleteClick}
                timeFormat={timeFormat}
                timeZone={timeZone}
              />
            ) : (
              <EventList 
                events={viewMode === "all" ? events : eventsForSelectedDate} 
                onDelete={handleDeleteClick}
                onEdit={handleEditEvent}
                onEventClick={handleEventClick}
                timeFormat={timeFormat} 
                timeZone={timeZone}
                viewMode={sidebarViewMode}
                sortOption={sidebarSortOption}
                onViewModeChange={handleViewModeChange}
                onSortOptionChange={handleSortOptionChange}
              />
            )
          )}
        </div>

        <div className={`calendar-main ${isEventListExpanded ? 'shrink' : ''}`}>
          <div className="card">
            <div className="calendar-summary">
              <strong>{selectedDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</strong>
              <span style={{ marginLeft: "1rem" }}>
                {eventsForSelectedDate.length > 0 ? `${eventsForSelectedDate.length} event${eventsForSelectedDate.length > 1 ? 's' : ''} scheduled` : "No events scheduled"}
              </span>
            </div>
            <CalendarView events={events} onChangeViewMode={setViewMode} selectedDate={selectedDate} onSelectDate={(date) => {
              setSelectedDate(date);
              // Format clicked date to YYYY-MM-DD
              const y = date.getFullYear();
              const m = String(date.getMonth() + 1).padStart(2, "0");
              const d = String(date.getDate()).padStart(2, "0");
              const formatted = `${y}-${m}-${d}`;

              // Check how many events match this date
              const hasEvents = events.some(e => e.date === formatted);

              if (hasEvents) {
                setIsEventListExpanded(true);   // <-- OPEN SIDEBAR
                setViewMode("selected");        // <-- Show events for that date
              }
              }}/>
          </div>
        </div>
        
        <div className={`chat-sidebar ${isChatSidebarExpanded ? "expanded" : ""}`}
          onClick={() => { if (!isChatSidebarExpanded) setIsChatSidebarExpanded(true); }}>
          <div className="chat-sidebar-header">
            {!isChatSidebarExpanded && (
              <div className="sidebar-vertical-label right">Ask Cadence</div>
            )}

          {isChatSidebarExpanded && (
            <>
              <button
                className="btn-clear-chat"
                onClick={(e) => {
                  e.stopPropagation();
                  window.openChatClearModal();   // Call ChatInterface method
                }}
                title="Clear conversation"
              >
                <span className="material-icons icon-medium">delete_outline</span>
              </button>

              <button className="btn-toggle-sidebar" 
                style={{ width: "60%", padding: "5px 5px 5px 20px" }}
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setIsChatSidebarExpanded(false); 
                }}>
                <span>Ask Cadence</span>
                <span className="material-icons icon-large">chevron_right</span>
              </button>
            </>
          )}

          </div>
          {isChatSidebarExpanded && <ChatInterface 
              userId={user.id}
              userEvents={events}
              onEventCommand={handleEventCommand}
              onClearChatRef={(handler) => {window.confirmClearChat = handler;}}/>
          }
        </div>
      </div>

      {showEventForm && (
        <div className="modal-overlay" onClick={() => { setShowEventForm(false); setEditingEvent(null); setEditingRecurrencePattern(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingEvent ? "✏️ Edit Event" : "➕ Create Event"}</h2>
              <button className="btn-close-modal" onClick={() => { setShowEventForm(false); setEditingEvent(null); setEditingRecurrencePattern(null); }}>✕</button>
            </div>
            <EventForm onSave={saveEvent} editingEvent={editingEvent} onCancel={() => { setShowEventForm(false); setEditingEvent(null); setEditingRecurrencePattern(null); }} recurrencePattern={editingRecurrencePattern} />
          </div>
        </div>
      )}

      {eventToDelete && !showDeleteScopeModal && (
        <div className="modal-overlay" onClick={() => setEventToDelete(null)}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">⚠️ Delete Event</h2>
              <button className="btn-close-modal" onClick={() => setEventToDelete(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="delete-warning-text">Are you sure you want to delete <strong>"{eventToDelete.title}"</strong>?</p>
              <p className="delete-warning-subtext">This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setEventToDelete(null)}>Cancel</button>
              <button className="btn btn-delete-confirm" onClick={() => executeDelete()}>Delete Event</button>
            </div>
          </div>
        </div>
      )}

      {eventToDelete && showDeleteScopeModal && (
        <div className="modal-overlay" onClick={() => { setEventToDelete(null); setShowDeleteScopeModal(false); }}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">🔁 Delete Recurring Event</h2>
              <button className="btn-close-modal" onClick={() => { setEventToDelete(null); setShowDeleteScopeModal(false); }}>✕</button>
            </div>
            <div className="modal-body">
              <p className="delete-warning-text">This is a recurring event. What would you like to delete?</p>
              <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button 
                  className={`btn ${deleteScope === 'instance' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setDeleteScope('instance')}
                  style={{ width: '100%', textAlign: 'left', padding: '0.75rem 1rem' }}
                >
                  <div style={{ fontWeight: 'bold' }}>This event</div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>Delete only this occurrence on {eventToDelete.date}</div>
                </button>
                <button 
                  className={`btn ${deleteScope === 'series' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setDeleteScope('series')}
                  style={{ width: '100%', textAlign: 'left', padding: '0.75rem 1rem' }}
                >
                  <div style={{ fontWeight: 'bold' }}>All events in series</div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>Delete all occurrences of this recurring event</div>
                </button>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => { setEventToDelete(null); setShowDeleteScopeModal(false); setDeleteScope(null); }}>Cancel</button>
              <button 
                className="btn btn-delete-confirm" 
                onClick={() => executeDelete()}
                disabled={!deleteScope}
              >
                Delete {deleteScope === 'instance' ? 'This Event' : deleteScope === 'series' ? 'All Events' : 'Event'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearChatModal && (
        <div className="modal-overlay" onClick={() => setShowClearChatModal(false)}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">🧹 Clear Chat</h2>
              <button className="btn-close-modal" onClick={() => setShowClearChatModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <p className="delete-warning-text">
                Are you sure you want to clear this conversation?
              </p>
              <p className="delete-warning-subtext">This action cannot be undone.</p>
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowClearChatModal(false)}
              >
                Cancel
              </button>

              <button
                className="btn btn-delete-confirm"
                onClick={async () => {
                  if (typeof window.confirmClearChat === "function") {
                    await window.confirmClearChat();
                  }
                  setShowClearChatModal(false);
                }}
              >
                Clear Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Drawer */}
      <div
        className="settings-drawer"
        style={{
          width: `${settingsWidth}px`,
        }}
      >
        <div className="settings-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">⚙️ Settings</h2>
            <button
              className="btn-close-modal"
              onClick={() => {
                setSettingsOpen(false);
                setSettingsWidth(0);
              }}
            >
              ✕
            </button>
          </div>

          <div className="modal-body">
            <div className="settings-group">
              <label className="settings-label">Signed in as</label>
              <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                {profile?.full_name || user?.email}
              </p>
            </div>
            <div className="settings-group">
              <label className="settings-label">Time Format</label>
              <select
                className="settings-select"
                value={timeFormat}
                onChange={async (e) => {
                  const newFormat = e.target.value;
                  setTimeFormat(newFormat);
                  // auto-save to Supabase
                  await updateProfile({ time_format: newFormat });
                }}
              >
                <option value="12h">12-hour (7:30 PM)</option>
                <option value="24h">24-hour (19:30)</option>
              </select>
            </div>
            <div className="settings-group">
              <label className="settings-label">Time Zone</label>
              <select
                className="settings-select"
                value={timeZone}
                onChange={async (e) => {
                  const newZone = e.target.value;
                  setTimeZone(newZone);

                  // auto-save to Supabase
                  await updateProfile({ timezone: newZone });
                }}
              >
                {Intl.supportedValuesOf("timeZone").map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
            <div className="settings-group">
              <button 
                className="btn btn-wallpaper"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowWallpaperPicker(true);
                  // Auto-close settings drawer
                  setSettingsOpen(false);
                  setSettingsWidth(0);
                }}
              >
                🎨 Change Wallpaper
              </button>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.5rem" }}>
            </div>
            <button className="btn sign-out-btn" onClick={signOut}>
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {showWallpaperPicker && (
        <div 
          className="wallpaper-modal-centered"
          onClick={(e) => {
            // Close if clicking outside the modal content
            if (e.target === e.currentTarget) {
              setShowWallpaperPicker(false);
            }
          }}
        >
          <div className="wallpaper-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">🎨 Choose Wallpaper</h2>
              <button
                className="btn-close-modal"
                onClick={() => setShowWallpaperPicker(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <WallpaperPicker
                userId={user.id}
                currentSettings={wallpaperSettings}
                onSave={handleWallpaperSave}
                onClose={() => setShowWallpaperPicker(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Overlay - dims background when either drawer is open
      {(settingsOpen || showWallpaperPicker) && (
        <div
          className="dual-drawer-overlay"
          onClick={() => {
            setSettingsOpen(false);
            setSettingsWidth(0);
            setShowWallpaperPicker(false);
            setWallpaperPickerWidth(0);
          }}
        />
      )} */}

      {/* Background Overlay */}
      {settingsOpen && (
        <div
          className="settings-overlay"
          onClick={() => {
            setSettingsOpen(false);
            setSettingsWidth(0);
          }}
        ></div>
      )}

      {/*<footer className="app-footer">
        <p>Welcome, {profile?.full_name || user?.email} • Made with ❤️</p>
      </footer>*/}
    </div>
  );
}

export default App;