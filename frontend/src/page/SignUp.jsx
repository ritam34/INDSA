import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { z } from "zod";
import { useAuthStore } from "../store/useAuthStore.js";

const signUpSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  name: z.string().min(3, "Name is required"),
});

const SignUp = () => {
  const [showPassword, setShowPassword] = useState(false);
  const {signup,isSignedUp}=useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit =async (data) => {
    try {
      await signup(data);
      console.log("SignUp Data:",data);
    } catch (error) {
      console.log("SignUp failed:",error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-base-100">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="fieldset bg-base-200 border-base-300 rounded-box w-full max-w-xs border p-6 relative"
      >
        <legend className="fieldset-legend text-lg font-semibold mb-2">
          Sign Up
        </legend>

        {/* Full Name */}
        <label className="label">
          <span className="label-text">Full Name</span>
        </label>
        <input
          type="text"
          {...register("name")}
          placeholder="William Cooper"
          className="input input-bordered w-full"
        />
        {errors.name && (
          <p className="text-error text-xs mt-1">{errors.name.message}</p>
        )}

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
        <button type="submit" className="btn btn-neutral mt-4 w-full"
        disabled={isSignedUp}
        >
          {isSignedUp ? (
            <Loader2 className="animate-spin mx-auto" size={20} />
          ): "Sign Up"}
        </button>
      </form>

      <div className="text-center mt-4">
        <p className="text-sm">
          Already have an account?{" "}
          <Link to="/login" className="link link-primary">
            Sign in
          </Link>
        </p>
      </div>
    </div>
    
  );
};

export default SignUp;
