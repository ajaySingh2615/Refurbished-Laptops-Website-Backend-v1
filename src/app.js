import express from "express";
import cors from "cors";
import { db } from "./db/client";

const app = express();

app.use(cors());
app.use(express.json());

// health route
app.get("/health", (req, res) => {
  return res
    .status(200)
    .json({ ok: true, service: "backend", time: new Date().toISOString() });
});

export default app;
