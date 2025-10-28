import { useEffect, useState } from "react";
import { Navigate, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import Home from "./page/Home";
import Login from "./page/Login";
import SignUp from "./page/SignUp";
import "./App.css";
import { useAuthStore } from "./store/useAuthStore.js";
import { Loader } from "lucide-react";
import Layout from "./layout/Layout.jsx";

function App() {
  const {checkAuth, isCheckingAuth } = useAuthStore();
  const authUser=true
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
        <Toaster position="bottom-right" />
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
          </Route>

          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
        </Routes>
      </div>
    </>
  );
}

export default App;
