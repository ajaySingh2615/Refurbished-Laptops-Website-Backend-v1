import { db } from "../db/client.js";
import { addresses } from "../db/schema.js";
import { and, eq, desc } from "drizzle-orm";

export class AddressController {
  static async list(req, res) {
    try {
      const userId = req.user?.userId || req.user?.sub;
      if (!userId)
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      const rows = await db
        .select()
        .from(addresses)
        .where(eq(addresses.userId, Number(userId)));
      return res.json({ success: true, data: rows });
    } catch (e) {
      console.error("List addresses error:", e);
      return res
        .status(500)
        .json({ success: false, message: "Failed to list addresses" });
    }
  }

  static async create(req, res) {
    try {
      const userId = req.user?.userId || req.user?.sub;
      if (!userId)
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      const raw = req.body;
      const body =
        typeof raw === "string"
          ? (() => {
              try {
                return JSON.parse(raw);
              } catch {
                return {};
              }
            })()
          : raw || {};
      const name = (body.name ?? body.fullName ?? "").toString().trim();
      const phone = (body.phone ?? body.mobile ?? "").toString().trim();
      const line1 = (body.line1 ?? body.addressLine1 ?? "").toString().trim();
      const line2 = (body.line2 ?? body.addressLine2 ?? "").toString().trim();
      const city = (body.city ?? "").toString().trim();
      const state = (body.state ?? "").toString().trim();
      const postcode = (body.postcode ?? body.zip ?? "").toString().trim();
      const email = (body.email ?? "").toString().trim();
      const country = (body.country ?? "IN").toString().trim();
      const type = (body.type ?? "shipping").toString().trim();
      // Debug logs
      try {
        console.log("[AddressCreate] typeof raw:", typeof raw);
        console.log("[AddressCreate] body keys:", Object.keys(body));
        console.log("[AddressCreate] name:", name);
      } catch {}
      const required = [
        { k: "name", v: name },
        { k: "phone", v: phone },
        { k: "line1", v: line1 },
        { k: "city", v: city },
        { k: "state", v: state },
        { k: "postcode", v: postcode },
      ];
      for (const r of required) {
        if (!r.v)
          return res.status(400).json({
            success: false,
            message: `Missing required field: ${r.k}`,
          });
      }
      const payload = {
        userId: Number(userId),
        type,
        name,
        phone,
        email: email || null,
        line1,
        line2: line2 || null,
        city,
        state,
        postcode,
        country,
        isDefault: !!body.isDefault,
      };
      await db.insert(addresses).values(payload);
      // Fetch the newly created id reliably (insertId may not be present in some setups)
      const created = await db
        .select()
        .from(addresses)
        .where(eq(addresses.userId, Number(userId)))
        .orderBy(desc(addresses.id))
        .limit(1);
      const newId = created?.[0]?.id;
      return res
        .status(201)
        .json({ success: true, data: { id: newId, ...payload } });
    } catch (e) {
      console.error("Create address error:", e);
      return res
        .status(500)
        .json({ success: false, message: "Failed to create address" });
    }
  }

  static async update(req, res) {
    try {
      const userId = req.user?.userId || req.user?.sub;
      if (!userId)
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      const { id } = req.params;
      const body = req.body || {};
      await db
        .update(addresses)
        .set({
          type: body.type,
          name: body.name,
          phone: body.phone,
          email: body.email,
          line1: body.line1,
          line2: body.line2,
          city: body.city,
          state: body.state,
          postcode: body.postcode,
          country: body.country,
          isDefault: body.isDefault,
        })
        .where(
          and(
            eq(addresses.id, Number(id)),
            eq(addresses.userId, Number(userId))
          )
        );
      return res.json({ success: true });
    } catch (e) {
      console.error("Update address error:", e);
      return res
        .status(500)
        .json({ success: false, message: "Failed to update address" });
    }
  }

  static async remove(req, res) {
    try {
      const userId = req.user?.userId || req.user?.sub;
      if (!userId)
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      const { id } = req.params;
      await db
        .delete(addresses)
        .where(
          and(
            eq(addresses.id, Number(id)),
            eq(addresses.userId, Number(userId))
          )
        );
      return res.json({ success: true });
    } catch (e) {
      console.error("Delete address error:", e);
      return res
        .status(500)
        .json({ success: false, message: "Failed to delete address" });
    }
  }
}
