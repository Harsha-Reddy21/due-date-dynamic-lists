import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.33.1';

// Configuration - in a real app, store these in Edge Function secrets
const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "YOUR_GOOGLE_CLIENT_ID";
const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "YOUR_GOOGLE_CLIENT_SECRET";
// Default redirect URI - will be overridden by the one from the request
const DEFAULT_REDIRECT_URI = Deno.env.get("GOOGLE_REDIRECT_URI") || "http://localhost:3000/settings";
const SCOPES = "https://www.googleapis.com/auth/calendar.events";

// Create a structured error response
const createErrorResponse = (status: number, message: string) => {
  return new Response(
    JSON.stringify({
      error: message,
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    },
  );
};

// Validate the user's JWT token from Supabase
const validateAuth = async (req: Request) => {
  // Get JWT from request
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader) {
    return { authorized: false, error: 'Missing authorization header' };
  }
  
  const jwt = authHeader.replace('Bearer ', '');
  
  // Create a Supabase client to validate the JWT
  // In a real app, these would be environment variables
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321';
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Verify the JWT
  const { data, error } = await supabase.auth.getUser(jwt);
  
  if (error || !data.user) {
    return { authorized: false, error: 'Invalid token' };
  }
  
  return { authorized: true, user: data.user };
};

// Store tokens in the user_settings table
const storeTokensForUser = async (userId: string, accessToken: string, refreshToken?: string) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { error } = await supabase
    .from('google_tokens')
    .upsert([
      { 
        user_id: userId,
        access_token: accessToken,
        refresh_token: refreshToken || null,
        updated_at: new Date().toISOString()
      }
    ]);
  
  if (error) {
    console.error('Error storing tokens:', error);
    throw new Error('Failed to store tokens');
  }
};

// Get tokens for a user
const getTokensForUser = async (userId: string) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data, error } = await supabase
    .from('google_tokens')
    .select('access_token, refresh_token')
    .eq('user_id', userId)
    .single();
  
  if (error || !data) {
    console.error('Error retrieving tokens:', error);
    throw new Error('Failed to retrieve tokens');
  }
  
  return data;
};

// Refresh an access token
const refreshAccessToken = async (refreshToken: string) => {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${data.error}`);
  }
  
  return data.access_token;
};

// Main request handler
serve(async (req) => {
  try {
    const url = new URL(req.url);
    const path = url.pathname;
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }
    
    // Define CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    // Login endpoint - redirects to Google OAuth
    if (path === '/login' && req.method === 'GET') {
      const { authorized, user, error } = await validateAuth(req);
      
      if (!authorized) {
        return createErrorResponse(401, error || 'Unauthorized');
      }
      
      // Get the redirect URI from the query parameter or use the default
      const redirectUri = url.searchParams.get('redirect_uri') || DEFAULT_REDIRECT_URI;
      
      // Build auth URL
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', SCOPES);
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('state', user.id); // Store user_id in state
      
      return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Auth callback endpoint - exchanges code for tokens
    if (path === '/auth/callback' && req.method === 'GET') {
      const { authorized, user, error } = await validateAuth(req);
      
      if (!authorized) {
        return createErrorResponse(401, error || 'Unauthorized');
      }
      
      const code = url.searchParams.get('code');
      const redirectUri = url.searchParams.get('redirect_uri') || DEFAULT_REDIRECT_URI;
      const state = url.searchParams.get('state');
      
      if (!code) {
        return createErrorResponse(400, 'Missing authorization code');
      }
      
      // Exchange code for tokens
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Token exchange error:', data);
        return createErrorResponse(400, `Failed to exchange code: ${data.error}`);
      }
      
      // Store tokens in the user_settings table
      await storeTokensForUser(user.id, data.access_token, data.refresh_token);
      
      return new Response(
        JSON.stringify({ success: true }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
    
    // Add task endpoint - creates a calendar event
    if (path === '/add_task' && req.method === 'POST') {
      const { authorized, user, error } = await validateAuth(req);
      
      if (!authorized) {
        return createErrorResponse(401, error || 'Unauthorized');
      }
      
      // Parse request body
      let body;
      try {
        body = await req.json();
      } catch (e) {
        return createErrorResponse(400, 'Invalid request body');
      }
      
      const { title, description, start_time, end_time } = body;
      
      if (!title || !start_time || !end_time) {
        return createErrorResponse(400, 'Missing required fields');
      }
      
      // Get tokens for the user
      const tokens = await getTokensForUser(user.id);
      let accessToken = tokens.access_token;
      
      // Try to refresh the token if available and needed
      if (tokens.refresh_token) {
        try {
          accessToken = await refreshAccessToken(tokens.refresh_token);
          await storeTokensForUser(user.id, accessToken, tokens.refresh_token);
        } catch (e) {
          console.error('Failed to refresh token:', e);
        }
      }
      
      // Create calendar event
      const event = {
        summary: title,
        description,
        start: {
          dateTime: start_time,
          timeZone: 'UTC',
        },
        end: {
          dateTime: end_time,
          timeZone: 'UTC',
        },
      };
      
      const calendarResponse = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        },
      );
      
      const calendarData = await calendarResponse.json();
      
      if (!calendarResponse.ok) {
        console.error('Calendar API error:', calendarData);
        return createErrorResponse(400, `Failed to create event: ${calendarData.error?.message || 'Unknown error'}`);
      }
      
      return new Response(
        JSON.stringify(calendarData),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
    
    // List events endpoint
    if (path === '/list_events' && req.method === 'GET') {
      const { authorized, user, error } = await validateAuth(req);
      
      if (!authorized) {
        return createErrorResponse(401, error || 'Unauthorized');
      }
      
      // Get tokens for the user
      const tokens = await getTokensForUser(user.id);
      let accessToken = tokens.access_token;
      
      // Try to refresh the token if available and needed
      if (tokens.refresh_token) {
        try {
          accessToken = await refreshAccessToken(tokens.refresh_token);
          await storeTokensForUser(user.id, accessToken, tokens.refresh_token);
        } catch (e) {
          console.error('Failed to refresh token:', e);
        }
      }
      
      // Get events from calendar
      const timeMin = new Date().toISOString();
      const calendarResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&maxResults=10&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
      
      const calendarData = await calendarResponse.json();
      
      if (!calendarResponse.ok) {
        console.error('Calendar API error:', calendarData);
        return createErrorResponse(400, `Failed to list events: ${calendarData.error?.message || 'Unknown error'}`);
      }
      
      return new Response(
        JSON.stringify(calendarData),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
    
    // Revoke token endpoint
    if (path === '/revoke' && req.method === 'POST') {
      const { authorized, user, error } = await validateAuth(req);
      
      if (!authorized) {
        return createErrorResponse(401, error || 'Unauthorized');
      }
      
      // Get tokens for the user
      let tokens;
      try {
        tokens = await getTokensForUser(user.id);
      } catch (e) {
        // If no tokens, consider it already revoked
        return new Response(
          JSON.stringify({ success: true }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }
      
      // Revoke the access token
      if (tokens.access_token) {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${tokens.access_token}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });
      }
      
      // Delete the tokens from the database
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321';
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      await supabase
        .from('google_tokens')
        .delete()
        .eq('user_id', user.id);
      
      return new Response(
        JSON.stringify({ success: true }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
    
    // Handle 404 for all other routes
    return createErrorResponse(404, 'Not found');
  } catch (e) {
    console.error('Unhandled error:', e);
    return createErrorResponse(500, `Internal server error: ${e.message}`);
  }
});
