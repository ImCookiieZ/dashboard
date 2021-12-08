import * as React from "react";

const authContext = React.createContext(undefined);

function useAuth() {
  const [user, setUser] = React.useState(null)

  return {
    user,
    login(data) {
      return new Promise((res) => {
        setUser(data)
        res();
      });
    },
    logout() {
      return new Promise((res) => {
        setUser(null)
        res();
      });
    }
  };
}

export function AuthProvider({ children }) {
  const auth = useAuth();

  return (
      <authContext.Provider value={auth}>
        {children}
      </authContext.Provider>
  );
}

export default function AuthConsumer() {
  return React.useContext(authContext);
}
