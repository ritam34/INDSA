import React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import {  Eye, EyeOff } from "lucide-react";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data) => {
    console.log(data);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-base-100">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="fieldset bg-base-200 border-base-300 rounded-box w-full max-w-xs border p-6 relative"
      >
        <legend className="fieldset-legend text-lg font-semibold mb-2">
          Login
        </legend>

        {/* Email */}
        <label className="label">
          <span className="label-text">Email</span>
        </label>
        <input
          type="email"
          {...register("email")}
          placeholder="williamcooper@gmail.com"
          className="input input-bordered w-full"
        />
        {errors.email && (
          <p className="text-error text-xs mt-1">{errors.email.message}</p>
        )}

        {/* Password */}
        <label className="label">
          <span className="label-text">Password</span>
        </label>

        <div className="relative w-full">
          <input
            type={showPassword ? "text" : "password"}
            {...register("password")}
            placeholder="********"
            className="input input-bordered w-full pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5 text-base-content/40" />
            ) : (
              <Eye className="w-5 h-5 text-base-content/40" />
            )}
          </button>
        </div>

        <label className="label">
          <span className="label-text-alt text-gray-500 whitespace-normal block text-xs leading-snug">
            Use 8+ characters with uppercase, lowercase, numbers, and symbols.
          </span>
        </label>
        {errors.password && (
          <p className="text-error text-xs mt-1">{errors.password.message}</p>
        )}

        {/* Submit Button */}
        <button type="submit" className="btn btn-neutral mt-4 w-full">
          Login
        </button>
      </form>

      <div className="text-sm mt-4">
        Don't have an account?{" "}
        <Link to="/signup" className="text-primary">
          Sign Up
        </Link>
      </div>
    </div>
    
  );
}

export default Login
