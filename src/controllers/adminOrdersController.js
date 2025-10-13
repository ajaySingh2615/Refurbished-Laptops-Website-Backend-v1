import { db } from "../db/client.js";
import {
  orders,
  orderItems,
  addresses,
  productImages,
  products,
  users,
  payments,
} from "../db/schema.js";
import {
  eq,
  desc,
  asc,
  like,
  or,
  and,
  gte,
  lte,
  sql,
  count,
  sum,
} from "drizzle-orm";

export class AdminOrdersController {
  // Get all orders with pagination, filtering, and search
  static async listAll(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search = "",
        status = "",
        paymentStatus = "",
        paymentMethod = "",
        sortBy = "createdAt",
        sortOrder = "desc",
        startDate = "",
        endDate = "",
      } = req.query;

      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const offset = (pageNum - 1) * limitNum;

      // Build where conditions
      const conditions = [];

      // Search by order number, user email, or customer name
      if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        conditions.push(
          or(
            like(orders.orderNumber, searchTerm),
            like(orders.notes, searchTerm)
          )
        );
      }

      // Filter by status
      if (status && status !== "all") {
        conditions.push(eq(orders.status, status));
      }

      // Filter by payment status
      if (paymentStatus && paymentStatus !== "all") {
        conditions.push(eq(orders.paymentStatus, paymentStatus));
      }

      // Filter by payment method
      if (paymentMethod && paymentMethod !== "all") {
        conditions.push(eq(orders.paymentMethod, paymentMethod));
      }

      // Filter by date range
      if (startDate) {
        conditions.push(gte(orders.createdAt, new Date(startDate)));
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        conditions.push(lte(orders.createdAt, endDateTime));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const countResult = await db
        .select({ count: count() })
        .from(orders)
        .where(whereClause);
      const totalCount = countResult[0]?.count || 0;

      // Build order by clause
      const orderByColumn =
        {
          createdAt: orders.createdAt,
          updatedAt: orders.updatedAt,
          totalAmount: orders.totalAmount,
          orderNumber: orders.orderNumber,
          status: orders.status,
        }[sortBy] || orders.createdAt;

      const orderByClause =
        sortOrder === "asc" ? asc(orderByColumn) : desc(orderByColumn);

      // Get orders with pagination
      const ordersList = await db
        .select()
        .from(orders)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limitNum)
        .offset(offset);

      // Enrich orders with additional data
      const enrichedOrders = await Promise.all(
        ordersList.map(async (order) => {
          // Get user info
          let customer = null;
          if (order.userId) {
            const [user] = await db
              .select({
                id: users.id,
                name: users.name,
                email: users.email,
                phone: users.phone,
              })
              .from(users)
              .where(eq(users.id, order.userId))
              .limit(1);
            customer = user || null;
          }

          // Get order items count
          const itemsCount = await db
            .select({ count: count() })
            .from(orderItems)
            .where(eq(orderItems.orderId, order.id));

          // Get first item for preview
          const [firstItem] = await db
            .select()
            .from(orderItems)
            .where(eq(orderItems.orderId, order.id))
            .limit(1);

          let previewTitle = null;
          let previewImageUrl = null;

          if (firstItem) {
            previewTitle = firstItem.title;

            // Get product title if missing
            if (!previewTitle && firstItem.productId) {
              const [prod] = await db
                .select()
                .from(products)
                .where(eq(products.id, firstItem.productId))
                .limit(1);
              if (prod) previewTitle = prod.title;
            }

            // Get product image
            if (firstItem.productId) {
              const [img] = await db
                .select()
                .from(productImages)
                .where(eq(productImages.productId, firstItem.productId))
                .orderBy(
                  desc(productImages.isPrimary),
                  asc(productImages.sortOrder)
                )
                .limit(1);
              if (img) previewImageUrl = img.cloudinaryUrl;
            }
          }

          // Get addresses
          const shipping = order.shippingAddressId
            ? (
                await db
                  .select()
                  .from(addresses)
                  .where(eq(addresses.id, order.shippingAddressId))
                  .limit(1)
              )[0]
            : null;

          const billing = order.billingAddressId
            ? (
                await db
                  .select()
                  .from(addresses)
                  .where(eq(addresses.id, order.billingAddressId))
                  .limit(1)
              )[0]
            : null;

          return {
            ...order,
            customer,
            itemCount: itemsCount[0]?.count || 0,
            previewTitle,
            previewImageUrl,
            shippingAddress: shipping,
            billingAddress: billing,
          };
        })
      );

      return res.json({
        success: true,
        data: {
          orders: enrichedOrders,
          pagination: {
            page: pageNum,
            limit: limitNum,
            totalCount,
            totalPages: Math.ceil(totalCount / limitNum),
          },
        },
      });
    } catch (error) {
      console.error("Admin list orders error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch orders",
      });
    }
  }

  // Get order details by ID
  static async getOrderDetails(req, res) {
    try {
      const { id } = req.params;

      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, Number(id)))
        .limit(1);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // Get customer info
      let customer = null;
      if (order.userId) {
        const [user] = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            phone: users.phone,
            role: users.role,
            createdAt: users.createdAt,
          })
          .from(users)
          .where(eq(users.id, order.userId))
          .limit(1);
        customer = user || null;
      }

      // Get all order items with product details
      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));

      const enrichedItems = await Promise.all(
        items.map(async (item) => {
          let title = item.title;
          let imageUrl = null;
          let productDetails = null;

          if (item.productId) {
            const [prod] = await db
              .select()
              .from(products)
              .where(eq(products.id, item.productId))
              .limit(1);

            if (prod) {
              productDetails = prod;
              if (!title) title = prod.title;

              // Get product image
              const [img] = await db
                .select()
                .from(productImages)
                .where(eq(productImages.productId, item.productId))
                .orderBy(
                  desc(productImages.isPrimary),
                  asc(productImages.sortOrder)
                )
                .limit(1);
              if (img) imageUrl = img.cloudinaryUrl;
            }
          }

          return {
            ...item,
            title,
            imageUrl,
            productDetails,
          };
        })
      );

      // Get addresses
      const shippingAddress = order.shippingAddressId
        ? (
            await db
              .select()
              .from(addresses)
              .where(eq(addresses.id, order.shippingAddressId))
              .limit(1)
          )[0]
        : null;

      const billingAddress = order.billingAddressId
        ? (
            await db
              .select()
              .from(addresses)
              .where(eq(addresses.id, order.billingAddressId))
              .limit(1)
          )[0]
        : null;

      // Get payment records
      const paymentRecords = await db
        .select()
        .from(payments)
        .where(eq(payments.orderId, order.id))
        .orderBy(desc(payments.createdAt));

      return res.json({
        success: true,
        data: {
          ...order,
          customer,
          items: enrichedItems,
          shippingAddress,
          billingAddress,
          paymentRecords,
        },
      });
    } catch (error) {
      console.error("Get order details error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch order details",
      });
    }
  }

  // Update order status
  static async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, orderStatus, notes } = req.body;

      if (!status && !orderStatus && !notes) {
        return res.status(400).json({
          success: false,
          message:
            "At least one field (status, orderStatus, or notes) is required",
        });
      }

      // Validate status values
      const validStatuses = [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "failed",
      ];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        });
      }

      const updateData = {};
      if (status) {
        updateData.status = status;
        // Keep orderStatus in sync with status for consistent frontend display
        updateData.orderStatus = status;
      }
      if (orderStatus) updateData.orderStatus = orderStatus;
      if (notes !== undefined) updateData.notes = notes;

      // If status is being set to confirmed and placedAt is null, set it
      if (status === "confirmed") {
        const [currentOrder] = await db
          .select()
          .from(orders)
          .where(eq(orders.id, Number(id)))
          .limit(1);

        if (currentOrder && !currentOrder.placedAt) {
          updateData.placedAt = new Date();
        }
      }

      await db
        .update(orders)
        .set(updateData)
        .where(eq(orders.id, Number(id)));

      // Fetch updated order
      const [updatedOrder] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, Number(id)))
        .limit(1);

      return res.json({
        success: true,
        message: "Order status updated successfully",
        data: updatedOrder,
      });
    } catch (error) {
      console.error("Update order status error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update order status",
      });
    }
  }

  // Update payment status
  static async updatePaymentStatus(req, res) {
    try {
      const { id } = req.params;
      const { paymentStatus, codCollected, transactionId } = req.body;

      if (!paymentStatus && codCollected === undefined && !transactionId) {
        return res.status(400).json({
          success: false,
          message: "At least one payment field is required",
        });
      }

      // Validate payment status
      const validPaymentStatuses = ["unpaid", "paid", "failed", "refunded"];
      if (paymentStatus && !validPaymentStatuses.includes(paymentStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid payment status. Must be one of: ${validPaymentStatuses.join(", ")}`,
        });
      }

      const updateData = {};
      if (paymentStatus) updateData.paymentStatus = paymentStatus;
      if (codCollected !== undefined) updateData.codCollected = codCollected;
      if (transactionId) updateData.transactionId = transactionId;

      await db
        .update(orders)
        .set(updateData)
        .where(eq(orders.id, Number(id)));

      // Fetch updated order
      const [updatedOrder] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, Number(id)))
        .limit(1);

      return res.json({
        success: true,
        message: "Payment status updated successfully",
        data: updatedOrder,
      });
    } catch (error) {
      console.error("Update payment status error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update payment status",
      });
    }
  }

  // Get order statistics
  static async getStatistics(req, res) {
    try {
      const { period = "all" } = req.query;

      let dateFilter;
      const now = new Date();

      switch (period) {
        case "today":
          const startOfDay = new Date(now.setHours(0, 0, 0, 0));
          dateFilter = gte(orders.createdAt, startOfDay);
          break;
        case "week":
          const weekAgo = new Date(now.setDate(now.getDate() - 7));
          dateFilter = gte(orders.createdAt, weekAgo);
          break;
        case "month":
          const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
          dateFilter = gte(orders.createdAt, monthAgo);
          break;
        case "year":
          const yearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
          dateFilter = gte(orders.createdAt, yearAgo);
          break;
        default:
          dateFilter = undefined;
      }

      // Total orders
      const totalOrdersResult = await db
        .select({ count: count() })
        .from(orders)
        .where(dateFilter);
      const totalOrders = totalOrdersResult[0]?.count || 0;

      // Orders by status
      const ordersByStatus = await db
        .select({
          status: orders.status,
          count: count(),
        })
        .from(orders)
        .where(dateFilter)
        .groupBy(orders.status);

      // Orders by payment status
      const ordersByPaymentStatus = await db
        .select({
          paymentStatus: orders.paymentStatus,
          count: count(),
        })
        .from(orders)
        .where(dateFilter)
        .groupBy(orders.paymentStatus);

      // Revenue calculation
      const revenueResult = await db
        .select({
          totalRevenue: sum(orders.totalAmount),
          paidRevenue: sql`SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END)`,
        })
        .from(orders)
        .where(dateFilter);

      const totalRevenue = parseFloat(revenueResult[0]?.totalRevenue || 0);
      const paidRevenue = parseFloat(revenueResult[0]?.paidRevenue || 0);

      // Average order value
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Payment methods breakdown
      const paymentMethodsBreakdown = await db
        .select({
          paymentMethod: orders.paymentMethod,
          count: count(),
          total: sum(orders.totalAmount),
        })
        .from(orders)
        .where(dateFilter)
        .groupBy(orders.paymentMethod);

      // Recent orders (last 5)
      const recentOrders = await db
        .select()
        .from(orders)
        .orderBy(desc(orders.createdAt))
        .limit(5);

      return res.json({
        success: true,
        data: {
          totalOrders,
          totalRevenue: totalRevenue.toFixed(2),
          paidRevenue: paidRevenue.toFixed(2),
          avgOrderValue: avgOrderValue.toFixed(2),
          ordersByStatus: ordersByStatus.reduce((acc, { status, count }) => {
            acc[status] = count;
            return acc;
          }, {}),
          ordersByPaymentStatus: ordersByPaymentStatus.reduce(
            (acc, { paymentStatus, count }) => {
              acc[paymentStatus] = count;
              return acc;
            },
            {}
          ),
          paymentMethodsBreakdown: paymentMethodsBreakdown.map((item) => ({
            method: item.paymentMethod || "Unknown",
            count: item.count,
            total: parseFloat(item.total || 0).toFixed(2),
          })),
          recentOrders,
        },
      });
    } catch (error) {
      console.error("Get order statistics error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch order statistics",
      });
    }
  }

  // Delete order (soft delete by changing status)
  static async deleteOrder(req, res) {
    try {
      const { id } = req.params;

      // Check if order exists
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, Number(id)))
        .limit(1);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // Only allow deletion of pending/failed orders
      if (!["pending", "failed", "cancelled"].includes(order.status)) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete confirmed orders. Please cancel them first.",
        });
      }

      // Update to cancelled status instead of hard delete
      await db
        .update(orders)
        .set({ status: "cancelled" })
        .where(eq(orders.id, Number(id)));

      return res.json({
        success: true,
        message: "Order cancelled successfully",
      });
    } catch (error) {
      console.error("Delete order error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete order",
      });
    }
  }
}
