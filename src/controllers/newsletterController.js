import { subscribeToNewsletter } from "../services/newsletterService.js";

export async function postSubscribe(req, res) {
  try {
    const { email, source } = req.body || {};
    const meta = {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    };
    const result = await subscribeToNewsletter(email, source, meta);
    if (result.alreadySubscribed) {
      return res.status(200).json({ message: "Already subscribed" });
    }
    return res.status(201).json({ message: "Subscribed" });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Invalid request" });
  }
}
