import React from "react";
import { useAuthStore } from "../store/useAuthStore";

const LogoutButton = ({ children }) => {
  const { logout } = useAuthStore();
  const onLogout =async () => {
    await logout();
  }  
  return (
    <div onClick={onLogout} role="button">
      {children}
    </div>
  );
};

export default LogoutButton;
