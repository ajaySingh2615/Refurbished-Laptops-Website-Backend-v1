import PDFDocument from "pdfkit";
import { db } from "../db/client.js";
import { orders, orderItems, addresses, products } from "../db/schema.js";
import { eq } from "drizzle-orm";

export class InvoiceService {
  static async generateInvoice(orderId) {
    // Fetch order details
    const orderRows = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (orderRows.length === 0) {
      throw new Error("Order not found");
    }

    const order = orderRows[0];

    // Fetch order items with product details
    const itemsRaw = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    const items = await Promise.all(
      itemsRaw.map(async (item) => {
        let title = item.title;
        if (!title && item.productId) {
          const prod = (
            await db
              .select()
              .from(products)
              .where(eq(products.id, item.productId))
              .limit(1)
          )[0];
          if (prod?.title) title = prod.title;
        }
        return { ...item, title };
      })
    );

    // Fetch addresses
    const billingAddress = order.billingAddressId
      ? (
          await db
            .select()
            .from(addresses)
            .where(eq(addresses.id, order.billingAddressId))
            .limit(1)
        )[0]
      : null;

    const shippingAddress = order.shippingAddressId
      ? (
          await db
            .select()
            .from(addresses)
            .where(eq(addresses.id, order.shippingAddressId))
            .limit(1)
        )[0]
      : null;

    // Create PDF
    return this.createPDF(order, items, billingAddress, shippingAddress);
  }

  static createPDF(order, items, billingAddress, shippingAddress) {
    const doc = new PDFDocument({ margin: 50, size: "A4" });

    // Local helpers
    const formatINR = (num) => {
      const val = Number.parseFloat(num || 0);
      const formatted = new Intl.NumberFormat("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(val);
      return `Rs ${formatted}`;
    };

    // Company Header
    doc.fontSize(26).font("Helvetica-Bold").text("REFURBISHED LAPTOPS", 50, 50);
    doc
      .fontSize(11)
      .font("Helvetica")
      .fillColor("#666666")
      .text("Tax Invoice", 50, 82);
    doc.fillColor("#000000");

    // Invoice Details (Right side)
    const invoiceDate = order.placedAt
      ? new Date(order.placedAt).toLocaleDateString("en-IN")
      : new Date(order.createdAt).toLocaleDateString("en-IN");

    let rightY = 50;
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#666666")
      .text("Invoice Number:", 380, rightY);
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text(order.orderNumber || `INV-${order.id}`, 380, rightY + 14);

    rightY += 38;
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#666666")
      .text("Invoice Date:", 380, rightY);
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text(invoiceDate, 380, rightY + 14);

    rightY += 38;
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#666666")
      .text("Order ID:", 380, rightY);
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text(`#${order.id}`, 380, rightY + 14);

    // Line separator
    doc
      .strokeColor("#cccccc")
      .lineWidth(1)
      .moveTo(50, 180)
      .lineTo(545, 180)
      .stroke();

    // Shipping Address (only showing shipping, as billing is usually same)
    let yPos = 210;
    if (shippingAddress) {
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor("#000000")
        .text("Shipping Address:", 50, yPos);
      yPos += 22;
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .text(shippingAddress.name, 50, yPos);
      yPos += 18;
      doc.fontSize(9).font("Helvetica").fillColor("#333333");
      doc.text(shippingAddress.line1, 50, yPos);
      if (shippingAddress.line2) {
        yPos += 16;
        doc.text(shippingAddress.line2, 50, yPos);
      }
      yPos += 16;
      doc.text(
        `${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postcode}`,
        50,
        yPos
      );
      yPos += 16;
      doc.text(`Phone: ${shippingAddress.phone}`, 50, yPos);
      doc.fillColor("#000000");
    }

    // Items Table
    yPos = 330;

    // Table Header with background
    doc.rect(50, yPos, 495, 28).fillAndStroke("#f5f5f5", "#dddddd");

    yPos += 10;
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#000000");
    doc.text("Item", 60, yPos);
    doc.text("Qty", 340, yPos, { width: 40, align: "center" });
    doc.text("Price", 395, yPos, { width: 60, align: "right" });
    doc.text("Tax", 465, yPos, { width: 40, align: "right" });
    doc.text("Total", 515, yPos, { width: 50, align: "right" });

    yPos += 22;

    // Table Rows
    doc.font("Helvetica").fontSize(9).fillColor("#333333");
    items.forEach((item, index) => {
      // Check if we need a new page
      if (yPos > 680) {
        doc.addPage();
        yPos = 50;
      }

      const itemTitle = item.title || `Product #${item.productId}`;

      // Alternate row background
      if (index % 2 === 0) {
        doc.rect(50, yPos - 5, 495, 30).fill("#fafafa");
      }

      doc.fillColor("#000000").font("Helvetica-Bold").fontSize(9.5);
      doc.text(itemTitle, 60, yPos, { width: 260 });

      doc.fillColor("#333333").font("Helvetica").fontSize(9);
      doc.text(item.quantity.toString(), 340, yPos, {
        width: 40,
        align: "center",
      });
      doc.text(formatINR(item.unitPrice), 395, yPos, {
        width: 60,
        align: "right",
      });
      doc.text(formatINR(item.lineTax), 465, yPos, {
        width: 40,
        align: "right",
      });
      doc.fillColor("#000000").font("Helvetica-Bold");
      doc.text(formatINR(item.lineTotal), 515, yPos, {
        width: 50,
        align: "right",
      });

      yPos += 30;

      // Separator line
      doc
        .strokeColor("#eeeeee")
        .lineWidth(0.5)
        .moveTo(50, yPos)
        .lineTo(545, yPos)
        .stroke();
    });

    // Totals Section
    yPos += 25;

    // Totals box
    const totalsStartY = yPos;
    doc.fontSize(10).font("Helvetica").fillColor("#333333");

    doc.text("Subtotal:", 350, yPos);
    doc
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text(formatINR(order.subtotal), 480, yPos, {
        width: 85,
        align: "right",
      });

    if (order.discountAmount > 0) {
      yPos += 22;
      doc.font("Helvetica").fillColor("#16a34a").text("Discount:", 350, yPos);
      doc
        .font("Helvetica-Bold")
        .text(`- ${formatINR(order.discountAmount)}`, 480, yPos, {
          width: 85,
          align: "right",
        });
      doc.fillColor("#000000");
    }

    yPos += 22;
    doc.font("Helvetica").fillColor("#333333").text("Tax (GST):", 350, yPos);
    doc
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text(formatINR(order.taxAmount), 480, yPos, {
        width: 85,
        align: "right",
      });

    if (order.shippingAmount > 0) {
      yPos += 22;
      doc.font("Helvetica").fillColor("#333333").text("Shipping:", 350, yPos);
      doc
        .font("Helvetica-Bold")
        .fillColor("#000000")
        .text(formatINR(order.shippingAmount), 480, yPos, {
          width: 85,
          align: "right",
        });
    }

    yPos += 25;
    doc
      .strokeColor("#333333")
      .lineWidth(1)
      .moveTo(350, yPos)
      .lineTo(565, yPos)
      .stroke();

    yPos += 18;
    doc.fontSize(13).font("Helvetica-Bold").fillColor("#000000");
    doc.text("Total Amount:", 350, yPos);
    doc.text(formatINR(order.totalAmount), 480, yPos, {
      width: 85,
      align: "right",
    });

    // Payment Info
    yPos += 50;
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text("Payment Information:", 50, yPos);

    yPos += 22;
    doc.fontSize(9.5).font("Helvetica").fillColor("#333333");
    doc.text("Payment Method:", 50, yPos);
    doc
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text(order.paymentMethod?.toUpperCase() || "N/A", 160, yPos);

    yPos += 18;
    doc
      .font("Helvetica")
      .fillColor("#333333")
      .text("Payment Status:", 50, yPos);
    doc
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text(order.paymentStatus?.toUpperCase() || "N/A", 160, yPos);

    if (order.transactionId) {
      yPos += 18;
      doc
        .font("Helvetica")
        .fillColor("#333333")
        .text("Transaction ID:", 50, yPos);
      doc
        .font("Helvetica-Bold")
        .fillColor("#000000")
        .text(order.transactionId, 160, yPos);
    }

    // Footer
    const bottomY = 750;
    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#999999")
      .text(
        "This is a computer-generated invoice and does not require a signature.",
        50,
        bottomY,
        { align: "center", width: 495 }
      );

    doc.end();
    return doc;
  }
}
