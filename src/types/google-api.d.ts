
// Type definitions for Google API client
declare global {
  interface Window {
    gapi: {
      load: (api: string, callback: () => void) => void;
      client: {
        init: (config: {
          apiKey?: string;
          clientId?: string;
          scope?: string;
          discoveryDocs?: string[];
        }) => Promise<void>;
        getToken: () => { access_token: string; expires_in?: number } | null;
        setToken: (token: any) => void;
        calendar: {
          events: {
            list: (params: any) => Promise<any>;
            insert: (params: any) => Promise<any>;
            delete: (params: any) => Promise<any>;
            update: (params: any) => Promise<any>;
          };
        };
      };
      auth2?: {
        getAuthInstance: () => {
          isSignedIn: {
            get: () => boolean;
            listen: (callback: (isSignedIn: boolean) => void) => void;
          };
          signIn: () => Promise<any>;
          signOut: () => Promise<any>;
          currentUser: {
            get: () => {
              getBasicProfile: () => {
                getName: () => string;
                getEmail: () => string;
                getImageUrl: () => string;
              };
            };
          };
        };
      };
    };
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: any) => void;
          }) => any;
          revoke: (token: string, callback?: () => void) => void;
          TokenResponse: any;
        };
      };
    };
  }
}

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  colorId?: string;
  recurrence?: string[];
  attendees?: {
    email: string;
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  }[];
}

export {};
