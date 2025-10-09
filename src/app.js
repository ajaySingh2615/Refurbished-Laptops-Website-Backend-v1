import express from "express";
import cors from "cors";
import productRoutes from "./routes/products.js";
import categoryRoutes from "./routes/categories.js";
import brandRoutes from "./routes/brands.js";
import healthRoutes from "./routes/health.js";
import authRouters from "./routes/auth.js";
import googleRoutes from "./routes/google.js";
import passport from "passport";
import { configureGoogleStrategy } from "../passport/googleStrategy.js";

const app = express();

app.use(cors());
app.use(express.json());
configureGoogleStrategy();
app.use(passport.initialize());

// health route
app.use("/health", healthRoutes);

// API routes
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/brands", brandRoutes);

// API auth
app.use("/api/auth", authRouters);
app.use("/api/auth/google", googleRoutes);

export default app;
