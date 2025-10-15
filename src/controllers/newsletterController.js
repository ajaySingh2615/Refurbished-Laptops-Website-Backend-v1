import {
  subscribeToNewsletter,
  getNewsletterSubscriptions,
  getNewsletterStats,
  deleteNewsletterSubscription,
} from "../services/newsletterService.js";

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

// Admin controllers
export async function getAdminSubscriptions(req, res) {
  try {
    const { page = 1, limit = 20, search, source } = req.query;
    const result = await getNewsletterSubscriptions({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      source,
    });
    return res.json(result);
  } catch (err) {
    return res
      .status(500)
      .json({ message: err.message || "Internal server error" });
  }
}

export async function getAdminStats(req, res) {
  try {
    const stats = await getNewsletterStats();
    return res.json(stats);
  } catch (err) {
    return res
      .status(500)
      .json({ message: err.message || "Internal server error" });
  }
}

export async function deleteSubscription(req, res) {
  try {
    const { id } = req.params;
    const success = await deleteNewsletterSubscription(parseInt(id));

    if (success) {
      return res.json({ message: "Subscription deleted successfully" });
    }
    return res.status(404).json({ message: "Subscription not found" });
  } catch (err) {
    console.error("Error in deleteSubscription controller:", err);
    return res
      .status(500)
      .json({ message: err.message || "Internal server error" });
  }
}
