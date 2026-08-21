// Supabase Client Configuration

import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// =====================================================
// AUTH HELPER FUNCTIONS
// =====================================================

export const authHelpers = {
  // Sign up with email and password
  signUp: async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    });
    return { data, error };
  },

  // Sign in with email and password
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // Get current user
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  // Get current session
  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    return { session, error };
  },

  // Reset password
  resetPassword: async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { data, error };
  },

  // Update user password
  updatePassword: async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });
    return { data, error };
  }
};

// =====================================================
// USER PROFILE FUNCTIONS
// =====================================================

export const profileHelpers = {
  // Get user profile
  getProfile: async (userId) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return { data, error };
  },

  // Update user profile
  updateProfile: async (userId, updates) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    return { data, error };
  },

  // Update user preference (single preference at a time)
  updatePreference: async (userId, preferenceName, value) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ [preferenceName]: value })
      .eq('id', userId)
      .select()
      .single();
    return { data, error };
  },

  // Update multiple preferences at once
  updatePreferences: async (userId, preferences) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(preferences)
      .eq('id', userId)
      .select()
      .single();
    return { data, error };
  }
};

// =====================================================
// EVENT FUNCTIONS (with user context)
// =====================================================

export const eventHelpers = {
  // Get all events for current user
  getEvents: async (userId) => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true })
      .order('time', { ascending: true });
    return { data, error };
  },

  // Create event
  createEvent: async (userId, event) => {
    const { data, error } = await supabase
      .from('events')
      .insert([{ ...event, user_id: userId }])
      .select()
      .single();
    return { data, error };
  },

  // Update event
  updateEvent: async (eventId, updates) => {
    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', eventId)
      .select()
      .single();
    return { data, error };
  },

  // Delete event
  deleteEvent: async (eventId) => {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);
    return { error };
  }
};

// =====================================================
// CONVERSATION FUNCTIONS (for Phase 3 - AI chat)
// =====================================================

export const conversationHelpers = {
  // Get all conversations for user
  getConversations: async (userId) => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    return { data, error };
  },

  // Create conversation
  createConversation: async (userId, title = 'New Conversation') => {
    const { data, error } = await supabase
      .from('conversations')
      .insert([{ user_id: userId, title }])
      .select()
      .single();
    return { data, error };
  },

  // Get messages for conversation
  getMessages: async (conversationId) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    return { data, error };
  },

  // Add message to conversation
  addMessage: async (conversationId, role, content) => {
    const { data, error } = await supabase
      .from('messages')
      .insert([{ conversation_id: conversationId, role, content }])
      .select()
      .single();
    return { data, error };
  },

  // Delete conversation and all messages
  deleteConversation: async (conversationId) => {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);
    return { error };
  }
};

// =====================================================
// RECURRENCE FUNCTIONS
// =====================================================

export const recurrenceHelpers = {
  // Get recurrence pattern for an event
  getRecurrence: async (eventId) => {
    const { data, error } = await supabase
      .from('event_recurrence')
      .select('*')
      .eq('event_id', eventId)
      .single();
    return { data, error };
  },

  // Create recurrence pattern
  createRecurrence: async (eventId, pattern) => {
    const { data, error } = await supabase
      .from('event_recurrence')
      .insert([{ event_id: eventId, ...pattern }])
      .select()
      .single();
    return { data, error };
  },

  // Update recurrence pattern
  updateRecurrence: async (eventId, pattern) => {
    const { data, error } = await supabase
      .from('event_recurrence')
      .update(pattern)
      .eq('event_id', eventId)
      .select()
      .single();
    return { data, error };
  },

  // Delete recurrence pattern
  deleteRecurrence: async (eventId) => {
    const { error } = await supabase
      .from('event_recurrence')
      .delete()
      .eq('event_id', eventId);
    return { error };
  },

  // Get exceptions for an event
  getExceptions: async (eventId) => {
    const { data, error } = await supabase
      .from('event_exceptions')
      .select('*')
      .eq('event_id', eventId);
    return { data, error };
  },

  // Create exception
  createException: async (eventId, exceptionData) => {
    const { data, error } = await supabase
      .from('event_exceptions')
      .insert([{ event_id: eventId, ...exceptionData }])
      .select()
      .single();
    return { data, error };
  },

  // Update exception
  updateException: async (exceptionId, updates) => {
    const { data, error } = await supabase
      .from('event_exceptions')
      .update(updates)
      .eq('id', exceptionId)
      .select()
      .single();
    return { data, error };
  },

  // Delete exception
  deleteException: async (exceptionId) => {
    const { error } = await supabase
      .from('event_exceptions')
      .delete()
      .eq('id', exceptionId);
    return { error };
  },

  // Get all recurring events with their patterns
  getRecurringEvents: async (userId) => {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        event_recurrence (*),
        event_exceptions (*)
      `)
      .eq('user_id', userId)
      .eq('is_recurring', true);
    return { data, error };
  }
};

// =====================================================
// WALLPAPER FUNCTIONS
// =====================================================

export const wallpaperHelpers = {
  // Upload custom wallpaper image
  uploadWallpaper: async (userId, file) => {
    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      
      // Upload to Supabase storage
      const { error } = await supabase.storage
        .from('wallpapers')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) throw error;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('wallpapers')
        .getPublicUrl(fileName);
      
      return { url: urlData.publicUrl, error: null };
    } catch (error) {
      console.error('Error uploading wallpaper:', error);
      return { url: null, error };
    }
  },

  // Delete wallpaper from storage
  deleteWallpaper: async (url) => {
    try {
      // Extract path from URL
      const path = url.split('/wallpapers/')[1];
      
      const { error } = await supabase.storage
        .from('wallpapers')
        .remove([path]);
      
      return { error };
    } catch (error) {
      console.error('Error deleting wallpaper:', error);
      return { error };
    }
  },

  // Update user's wallpaper settings
  updateWallpaperSettings: async (userId, settings) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        wallpaper_type: settings.type,
        wallpaper_value: settings.value,
        wallpaper_blur: settings.blur,
        wallpaper_brightness: settings.brightness
      })
      .eq('id', userId)
      .select()
      .single();
    
    return { data, error };
  },

  // Get user's wallpaper settings
  getWallpaperSettings: async (userId) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('wallpaper_type, wallpaper_value, wallpaper_blur, wallpaper_brightness')
      .eq('id', userId)
      .single();
    
    return { data, error };
  }
};