import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  return res
    .status(200)
    .json({ ok: true, service: "backend", time: new Date().toISOString() });
});

export default router;
