import { Router } from "express";
import { postSubscribe } from "../controllers/newsletterController.js";

const router = Router();

router.post("/subscribe", postSubscribe);

export default router;
