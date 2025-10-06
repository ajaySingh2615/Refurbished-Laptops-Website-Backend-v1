import express from "express";
import cors from "cors";
import productRoutes from "./routes/products.js";
import brandRoutes from "./routes/brands.js";

const app = express();

app.use(cors());
app.use(express.json());

// health route
app.get("/health", (req, res) => {
  return res
    .status(200)
    .json({ ok: true, service: "backend", time: new Date().toISOString() });
});

// API routes
app.use("/api/products", productRoutes);
app.use("/api/brands", brandRoutes);

export default app;
