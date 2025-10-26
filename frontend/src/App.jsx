import { useEffect, useState } from "react";
import { Navigate, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import Home from "./page/Home";
import Login from "./page/Login";
import SignUp from "./page/SignUp";
import "./App.css";
import { useAuthStore } from "./store/useAuthStore.js";
import {Loader} from "lucide-react";

function App() {
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore();
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isCheckingAuth && !authUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          {/* <div className="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-16 w-16 mb-4 mx-auto"></div> */}
          <Loader className="animate-spin mx-auto mb-4" size={30} />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center min-h-screen">
        
          <Toaster className="alert alert-info" position="bottom-right" />
        <Routes>
          <Route
            path="/"
            element={authUser ? <Home /> : <Navigate to="/login" />}
          />
          <Route
            path="/login"
            element={authUser ? <Navigate to="/" /> : <Login />}
          />
          <Route
            path="/signup"
            element={authUser ? <Navigate to="/" /> : <SignUp />}
          />
        </Routes>
      </div>
    </>
  );
}

export default App;
