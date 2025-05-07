
interface Window {
  gapi: {
    load: (api: string, callback: () => void) => void;
    client: {
      init: (config: {
        apiKey: string;
        clientId?: string;
        scope?: string;
        discoveryDocs?: string[];
      }) => Promise<void>;
      getToken: () => { access_token: string } | null;
      setToken: (token: string | null) => void;
      calendar: {
        events: {
          list: (params: any) => Promise<any>;
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
        revoke: (token: string) => void;
      };
    };
  };
}
