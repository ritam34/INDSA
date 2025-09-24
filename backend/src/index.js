import express, { urlencoded } from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors());
app.use(urlencoded());

const port = process.env.PORT || 8000;

app.get("/", (req, res) => {
  res.send("Server running fine😍");
});

app.use("/api/v1/auth", authRoutes);

app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});
