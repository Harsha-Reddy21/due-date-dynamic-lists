
interface Window {
  gapi: {
    load: (api: string, callback: () => void) => void;
    client: {
      init: (config: {
        apiKey: string;
        clientId: string;
        scope: string;
        discoveryDocs?: string[];
      }) => Promise<void>;
      calendar: {
        events: {
          list: (params: any) => Promise<any>;
        };
      };
    };
    auth2: {
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
}
