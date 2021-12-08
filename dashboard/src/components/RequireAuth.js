import {Navigate} from "react-router-dom";
import * as React from "react";
import useAuth from "../Auth"

export function RequireAuth({ children }) {
  const { user } = useAuth();

  return user !== null
      ? children
      : <Navigate to="/login" replace />;
}