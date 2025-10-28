import React from "react";
import { useAuthStore } from "../store/useAuthStore.js";
import { Link } from "react-router-dom";
import { User, Code, LogOut } from "lucide-react";
import LogoutButton from "./LogoutButton.jsx";

const Navbar = () => {
  const {logout } = useAuthStore();
   const authUser=true;
  return (
    <nav className="fixed top-0 left-0 right-0 w-full bg-base-100 shadow-sm z-50">
      <div className="navbar bg-base-100 shadow-md fixed top-0 left-0 w-full z-50">
        <div className="navbar-start">
          <div className="dropdown">
            <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h8m-8 6h16"
                />
              </svg>
            </div>
            <ul
              tabIndex={0}
              className="menu menu-sm dropdown-content bg-base-100 rounded-box z-[999] mt-3 w-52 p-2 shadow"
            >
              <li>
                <a>Item 1</a>
              </li>
              <li>
                <a>Parent</a>
                <ul className="p-2">
                  <li>
                    <a>Submenu 1</a>
                  </li>
                  <li>
                    <a>Submenu 2</a>
                  </li>
                </ul>
              </li>
              <li>
                <a>Item 3</a>
              </li>
            </ul>
          </div>
          <Link to="/" className="text-2xl font-semibold ml-2 lg:pl-6">
            InDSA
          </Link>
        </div>

        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal px-1">
            <li>
              <details>
                <summary>Courses</summary>
                <ul className="p-2">
                  <li>
                    <a>Submenu 1</a>
                  </li>
                  <li>
                    <a>Submenu 2</a>
                  </li>
                </ul>
              </details>
            </li>
            <li>
              <a>Practice</a>
            </li>
            <li>
              <a>Compete</a>
            </li>
            <li>
              <a>Compiler</a>
            </li>
          </ul>
        </div>

        <div className="navbar-end pr-4">
          {authUser ? (
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
                <div className="w-10 rounded-full">
                  <img
                    src={
                      authUser.avatar ||
                        "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png"
                    }
                    alt="user avatar"
                  />
                </div>
              </label>
              <ul
                tabIndex={0}
                className="menu menu-sm dropdown-content mt-3 p-2 shadow bg-base-100 rounded-box w-52"
              >
                <li>
                  <a className="justify-between">
                    Profile
                  </a>
                </li>
                <li>
                  <a>Settings</a>
                </li>
                <li>
                  <LogoutButton>
                    Logout
                  </LogoutButton>
                </li>
              </ul>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/signup" className="btn btn-neutral rounded-2xl">
                Sign Up
              </Link>
              <Link to="/login" className="btn btn-ghost rounded-2xl">
                Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
