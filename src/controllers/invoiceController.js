import { InvoiceService } from "../services/invoiceService.js";

export async function downloadInvoice(req, res) {
  try {
    const { orderId } = req.params;
    const userId = req.user?.id || req.user?.sub;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Verify order belongs to user
    const { db } = await import("../db/client.js");
    const { orders } = await import("../db/schema.js");
    const { eq, and } = await import("drizzle-orm");

    const orderRows = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
      .limit(1);

    if (orderRows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const order = orderRows[0];

    // Generate PDF
    const pdfDoc = await InvoiceService.generateInvoice(orderId);

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${order.orderNumber || orderId}.pdf`
    );

    // Pipe PDF to response
    pdfDoc.pipe(res);
  } catch (error) {
    console.error("Invoice generation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate invoice",
    });
  }
}
