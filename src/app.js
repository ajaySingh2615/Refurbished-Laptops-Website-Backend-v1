import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import productRoutes from "./routes/products.js";
import categoryRoutes from "./routes/categories.js";
import brandRoutes from "./routes/brands.js";
import healthRoutes from "./routes/health.js";
import authRouters from "./routes/auth.js";
import googleRoutes from "./routes/google.js";
import imageRoutes from "./routes/images.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import cartRoutes from "./routes/cart.js";
import couponRoutes from "./routes/coupons.js";
import checkoutRoutes from "./routes/checkout.js";
import ordersRoutes from "./routes/orders.js";
import addressesRoutes from "./routes/addresses.js";
import invoiceRoutes from "./routes/invoices.js";
import profileRoutes from "./routes/profile.js";
import adminOrdersRoutes from "./routes/adminOrders.js";
import passport from "passport";
import { configureGoogleStrategy } from "./passport/googleStrategy.js";

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
configureGoogleStrategy();
app.use(passport.initialize());

// health route
app.use("/health", healthRoutes);

// API routes
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/images", imageRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/addresses", addressesRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/admin/orders", adminOrdersRoutes);

// API auth
app.use("/api/auth", authRouters);
app.use("/api/auth/google", googleRoutes);

export default app;
