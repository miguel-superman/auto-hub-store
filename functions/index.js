
const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getStorage } = require("firebase-admin/storage");
const {
  getFirestore,
  FieldValue,
} = require("firebase-admin/firestore");

// Autostore is the default project for this function.
const autoApp =
  getApps().find((app) => app.name === "[DEFAULT]") ||
  initializeApp();

const autoDb = getFirestore(autoApp);

const autoStorage = getStorage(autoApp).bucket(
  "auto-hub-store.firebasestorage.app"
);

const autoAuth = getAuth(autoApp);

// Verify tokens against MechAssistApp's project.
// const mechProjectId = process.env.MECHASSIST_PROJECT_ID;
const mechProjectId =
  process.env.MECHASSIST_PROJECT_ID || "mech-assist-6a6b9";

if (!mechProjectId) {
  throw new Error("MECHASSIST_PROJECT_ID is required");
}


async function authenticateSupplier(req, supplierId) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer (.+)$/i);

  if (!match) {
    const error = new Error("Authentication required");
    error.status = 401;
    throw error;
  }

  const decoded = await autoAuth.verifyIdToken(match[1]);

  // Suppliers can only retrieve their own logo.
  if (decoded.uid !== supplierId) {
    const error = new Error("Not authorized to access this logo");
    error.status = 403;
    throw error;
  }

  const supplier = await autoDb
    .collection("Suppliers")
    .doc(supplierId)
    .get();

  if (
    !supplier.exists ||
    String(supplier.get("status") || "").toLowerCase() !== "approved"
  ) {
    const error = new Error("Approved supplier not found");
    error.status = 404;
    throw error;
  }

  return supplier.data();
}

const mechAuthApp =
  getApps().find((app) => app.name === "mechassist-auth") ||
  initializeApp(
    { projectId: mechProjectId },
    "mechassist-auth"
  );

const mechAuth = getAuth(mechAuthApp);

// This database access requires read permission in the
// MechAssistApp project for the function runtime identity.
const mechDb = getFirestore(mechAuthApp);

const USERS_COLLECTION =
  process.env.MECHASSIST_USERS_COLLECTION || "Mechanics";

const ALLOWED_ROLES = ["mechanic", "workshop"];

function sendError(res, status, message) {
  return res.status(status).json({
    success: false,
    message,
  });
}

async function authenticateMechanic(req) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer (.+)$/i);

  if (!match) {
    const error = new Error("Authentication required");
    error.status = 401;
    throw error;
  }

  // true also checks whether the token has been revoked.
  // const decoded = await mechAuth.verifyIdToken(
  //   match[1],
  //   true
  // );


  const decoded = await mechAuth.verifyIdToken(match[1]);

  console.log(
    "Mechanic token verified successfully. UID:",
    decoded.uid
  );

  


  const userSnap = await mechDb
    .collection(USERS_COLLECTION)
    .doc(decoded.uid)
    .get();

  if (!userSnap.exists) {
    const error = new Error("Mechanic profile not found");
    error.status = 403;
    throw error;
  }

  const user = userSnap.data();
  // const role = String(
  //   user.role || user.accountType || ""
  // ).toLowerCase();

  // if (!ALLOWED_ROLES.includes(role)) {
  //   const error = new Error("Not authorized to order parts");
  //   error.status = 403;
  //   throw error;
  // }

  return {
    uid: decoded.uid,
    name: user.name || user.fullName || "Mechanic",
  };
}

async function getApprovedSupplier(supplierId) {
  const ref = autoDb.collection("Suppliers").doc(supplierId);
  const snap = await ref.get();

  if (!snap.exists || snap.get("status") !== "approved") {
    const error = new Error("Supplier is not approved");
    error.status = 404;
    throw error;
  }

  return { ref, data: snap.data() };
}

function isPartAvailable(part) {
  if (
    part.active === false
  ) {
    return false;
  }

  if (
    typeof part.availability === "string" &&
    ["unavailable", "out of stock", "false"].includes(
      part.availability.toLowerCase()
    )
  ) {
    return false;
  }

  return true;
}

exports.partsApi = onRequest(
  {
    region: "us-central1",
    maxInstances: 10,
    cors: [
      "http://localhost:3000",
      "https://auto-hub-store.web.app",
      "https://auto-hub-store.firebaseapp.com",
    ],
  },
  async (req, res) => {
    try {
      if (req.method === "OPTIONS") {
        return res.status(204).send("");
      }
      

      const path = req.path.replace(/\/+$/, "") || "/";

      // GET /v1/suppliers/:supplierId/logo
      // This route uses Autostore Firebase Authentication.
      const logoMatch = path.match(
        /^\/v1\/suppliers\/([^/]+)\/logo$/
      );

      if (req.method === "GET" && logoMatch) {
        const supplierId = decodeURIComponent(logoMatch[1]);

        try {
          // Verify against Autostore, NOT MechAssist.
          const supplierData = await authenticateSupplier(req, supplierId);

          const logoUrl =
            supplierData.logoUrl || supplierData.imageUrl || "";

          if (!logoUrl) {
            return sendError(res, 404, "No supplier logo is configured");
          }

          const parsedUrl = new URL(logoUrl);

          if (
            parsedUrl.hostname !== "firebasestorage.googleapis.com" ||
            !parsedUrl.pathname.includes(
              "/v0/b/auto-hub-store.firebasestorage.app/o/"
            )
          ) {
            return sendError(res, 400, "Unsupported supplier logo URL");
          }

          const encodedObjectPath = parsedUrl.pathname.split("/o/")[1];

          if (!encodedObjectPath) {
            return sendError(res, 400, "Invalid supplier logo URL");
          }

          const objectPath = decodeURIComponent(encodedObjectPath);

          if (!objectPath.startsWith(`supplierLogos/${supplierId}/`)) {
            return sendError(res, 403, "Logo path does not match supplier");
          }

          const file = autoStorage.file(objectPath);
          const [exists] = await file.exists();

          if (!exists) {
            return sendError(res, 404, "Supplier logo file not found");
          }

          const [metadata] = await file.getMetadata();
          const contentType = metadata.contentType || "";

          if (!["image/png", "image/jpeg", "image/webp"].includes(contentType)) {
            return sendError(res, 415, "Unsupported logo image format");
          }

          const [contents] = await file.download();

          res.set("Content-Type", contentType);
          res.set("Cache-Control", "private, max-age=300");
          res.set("X-Content-Type-Options", "nosniff");

          return res.status(200).send(contents);
        } catch (error) {
          console.error("Supplier logo endpoint failed:", {
            message: error.message,
            code: error.code,
            status: error.status,
            stack: error.stack,
          });

          return sendError(
            res,
            error.status || 500,
            error.status ? error.message : "Unable to retrieve supplier logo"
          );
        }
      }

      

      if (!["GET", "POST"].includes(req.method)) {
        res.set("Allow", "GET, POST, OPTIONS");
        return sendError(res, 405, "Method not allowed");
      }

      const mechanic = await authenticateMechanic(req);
      // const path = req.path.replace(/\/+$/, "") || "/";

      // GET /v1/suppliers
      if (req.method === "GET" && path === "/v1/suppliers") {
        const snapshot = await autoDb
          .collection("Suppliers")
          .where("status", "==", "approved")
          .get();

        // const suppliers = snapshot.docs.map((doc) => {
        //   const data = doc.data();

        //   return {
        //     id: doc.id,
        //     businessName: data.businessName || data.name || "",
        //   };
        // });


        const suppliers = snapshot.docs.map((doc) => {
          const data = doc.data();

          // Return only public supplier information.
          return {
            id: doc.id,
            businessName:
              data.businessName || data.name || "Auto Parts Supplier",
            supplierType: data.supplierType || "",
            description: data.description || "",
            logoUrl: data.logoUrl || data.imageUrl || "",
            address: data.address || "",
            city: data.city || "",
            parish: data.parish || "",
            country: data.country || "Jamaica",
            phone: data.phone || "",
            email: data.publicEmail || "",
            status: data.status,
          };
        });

        return res.json({
          success: true,
          suppliers,
        });

        // return res.json({ success: true, suppliers });
      }

      // async function authenticateSupplier(req, supplierId) {
      //   const header = req.headers.authorization || "";
      //   const match = header.match(/^Bearer (.+)$/i);

      //   if (!match) {
      //     const error = new Error("Authentication required");
      //     error.status = 401;
      //     throw error;
      //   }

      //   const decoded = await autoAuth.verifyIdToken(match[1]);

      //   // Suppliers can only retrieve their own logo.
      //   if (decoded.uid !== supplierId) {
      //     const error = new Error("Not authorized to access this logo");
      //     error.status = 403;
      //     throw error;
      //   }

      //   const supplier = await autoDb
      //     .collection("Suppliers")
      //     .doc(supplierId)
      //     .get();

      //   if (
      //     !supplier.exists ||
      //     String(supplier.get("status") || "").toLowerCase() !== "approved"
      //   ) {
      //     const error = new Error("Approved supplier not found");
      //     error.status = 404;
      //     throw error;
      //   }

      //   return supplier.data();
      // }

    // GET /v1/orders/mine
    // Returns only orders belonging to the authenticated mechanic.
    if (req.method === "GET" && path === "/v1/orders/mine") {
      const snapshot = await autoDb
        .collection("PartsOrders")
        .where("mechanicId", "==", mechanic.uid)
        .get();

      const orders = snapshot.docs.map((doc) => {
        const data = doc.data();

        const toIsoString = (value) => {
          if (!value) return null;

          if (typeof value.toDate === "function") {
            return value.toDate().toISOString();
          }

          return null;
        };

        return {
          orderId: doc.id,
          orderNumber: data.orderNumber || doc.id,
          mechanicId: data.mechanicId,
          mechanicName: data.mechanicName || "",
          supplierId: data.supplierId || "",
          supplierName: data.supplierName || "",
          items: data.items || [],
          vehicle: data.vehicle || null,
          notes: data.notes || "",
          total: data.total ?? 0,
          currency: data.currency || "JMD",
          status: data.status || "Pending",
          createdAt: toIsoString(data.createdAt),
          updatedAt: toIsoString(data.updatedAt),
        };
      });

      // Sort newest first without requiring a composite index.
      orders.sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      );

      return res.json({
        success: true,
        orders,
      });
    }


      // GET /v1/suppliers/:supplierId/parts
      const partsMatch = path.match(
        /^\/v1\/suppliers\/([^/]+)\/parts$/
      );

      if (req.method === "GET" && partsMatch) {
        const supplierId = partsMatch[1];
        const supplier = await getApprovedSupplier(supplierId);

        const snapshot = await supplier.ref
          .collection("Parts")
          .get();

        const parts = snapshot.docs
          .map((doc) => {
            const data = doc.data();

            return {
              id: doc.id,
              name: data.name || data.partName || "",
              vehicleMakes: data.vehicleMakes || [],
              vehicleModels: data.vehicleModels || [],
              category: data.category || "",
              vehicleYears: data.vehicleYears || [],
              partNumber: data.partNumber || "",
              oemNumber: data.oemNumber || "",
              brand: data.brand || "",
              price: data.price ?? data.unitPrice ?? null,
              available: isPartAvailable(data),
            };
          })
          .filter((part) => part.available);

        return res.json({ success: true, parts });
      }

      // POST /v1/orders
      if (req.method === "POST" && path === "/v1/orders") {
        const { supplierId, items, vehicle,chassisNumber,engineNumber, notes } = req.body || {};

        if (
          typeof supplierId !== "string" ||
          !supplierId.trim() ||
          !Array.isArray(items) ||
          items.length === 0 ||
          items.length > 50
        ) {
          return sendError(res, 400, "Invalid order details");
        }

        const supplier = await getApprovedSupplier(supplierId);

        // Read and validate all parts before writing.
        const validatedItems = [];

        for (const item of items) {
          if (
            typeof item.partId !== "string" ||
            !Number.isSafeInteger(item.quantity) ||
            item.quantity < 1 ||
            item.quantity > 10000
          ) {
            return sendError(res, 400, "Invalid order item");
          }

          const partSnap = await supplier.ref
            .collection("Parts")
            .doc(item.partId)
            .get();

          if (!partSnap.exists) {
            return sendError(res, 400, "Part not found");
          }

          const part = partSnap.data();

          if (!isPartAvailable(part)) {
            return sendError(res, 409, "Part is unavailable");
          }

          const price = Number(part.price ?? part.unitPrice);

          if (!Number.isFinite(price) || price < 0) {
            return sendError(
              res,
              409,
              "Supplier part has no valid price"
            );
          }

          const stock = part.stockQuantity ?? part.quantity;

          if (
            Number.isFinite(stock) &&
            item.quantity > stock
          ) {
            return sendError(
              res,
              409,
              "Requested quantity exceeds available stock"
            );
          }

          validatedItems.push({
            partId: partSnap.id,
            partName: part.name || part.partName || "",
            quantity: item.quantity,
            unitPrice: price,
            lineTotal: price * item.quantity,
          });
        }

        const total = validatedItems.reduce(
          (sum, item) => sum + item.lineTotal,
          0
        );

        const orderRef = autoDb
          .collection("PartsOrders")
          .doc();

        // Preserve the supplier portal's existing request path.
        const requestRef = supplier.ref
          .collection("parts_requests")
          .doc(orderRef.id);

        const order = {
          orderId: orderRef.id,
          orderNumber: `MA-${orderRef.id.slice(0, 8).toUpperCase()}`,
          source: "MechAssistApp",
          mechanicId: mechanic.uid,
          mechanicName: mechanic.name,
          supplierId,
          supplierName:
            supplier.data.businessName ||
            supplier.data.name ||
            "",
          items: validatedItems,
          vehicle: vehicle || null,
          chassisNumber: chassisNumber || null,
          engineNumber: engineNumber || null,
          notes: typeof notes === "string" ? notes.slice(0, 1000) : "",
          total,
          currency: "JMD",
          status: "Pending",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };

        const batch = autoDb.batch();

        batch.set(orderRef, order);

        batch.set(requestRef, {
          ...order,
          requesterId: mechanic.uid,
          requesterName: mechanic.name,
          quantity: validatedItems.reduce(
            (sum, item) => sum + item.quantity,
            0
          ),
        });

        await batch.commit();

        return res.status(201).json({
          success: true,
          orderId: orderRef.id,
          orderNumber: order.orderNumber,
          status: order.status,
          total,
          currency: order.currency,
        });
      }


    // POST /v1/custom-part-requests
    // Creates a request for a part that is not listed in the supplier catalog.
    if (
      req.method === "POST" &&
      path === "/v1/custom-part-requests"
    ) {
      const {
        supplierId,
        vehicle,
        chassisNumber,
        engineNumber,
        partNumber,
        description,
        quantity,
        notes,
      } = req.body || {};

      // Validate required fields.
      if (
        typeof supplierId !== "string" ||
        !supplierId.trim()
      ) {
        return sendError(res, 400, "Supplier is required");
      }

      if (
        (typeof partNumber !== "string" || !partNumber.trim()) &&
        (typeof description !== "string" || !description.trim())
      ) {
        return sendError(
          res,
          400,
          "Enter a part number or describe the requested part"
        );
      }

      if (
        !Number.isSafeInteger(quantity) ||
        quantity < 1 ||
        quantity > 10000
      ) {
        return sendError(res, 400, "Invalid requested quantity");
      }

      if (
        vehicle !== null &&
        vehicle !== undefined &&
        (
          typeof vehicle !== "object" ||
          Array.isArray(vehicle)
        )
      ) {
        return sendError(res, 400, "Invalid vehicle details");
      }

      // Confirm that the selected supplier is approved.
      const supplier = await getApprovedSupplier(supplierId.trim());

      const orderRef = autoDb.collection("PartsOrders").doc();

      const orderNumber =
        `MA-${orderRef.id.slice(0, 8).toUpperCase()}`;

      const safeNotes =
        typeof notes === "string" ? notes.trim().slice(0, 1000) : "";

      // Custom requests do not have a catalog price yet.
      const customItem = {
        partId: null,
        partName:
          typeof description === "string"
            ? description.trim().slice(0, 300)
            : "",
        partNumber:
          typeof partNumber === "string"
            ? partNumber.trim().slice(0, 100)
            : "",
        quantity,
        unitPrice: null,
        lineTotal: null,
        isCustomRequest: true,
      };

      const order = {
        orderId: orderRef.id,
        orderNumber,
        source: "MechAssistApp",
        requestType: "Custom Part Request",
        isCustomRequest: true,

        mechanicId: mechanic.uid,
        mechanicName: mechanic.name,

        supplierId: supplierId.trim(),
        supplierName:
          supplier.data.businessName ||
          supplier.data.name ||
          "",

        items: [customItem],
        vehicle: vehicle || null,
        chassisNumber:
          typeof chassisNumber === "string"
            ? chassisNumber.trim().slice(0, 100)
            : null,
        engineNumber:
          typeof engineNumber === "string"
            ? engineNumber.trim().slice(0, 100)
            : null,

        notes: safeNotes,
        total: null,
        currency: "JMD",
        status: "Pending",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      // Keep the same collection structure used by regular orders.
      const requestRef = supplier.ref
        .collection("parts_requests")
        .doc(orderRef.id);

      const batch = autoDb.batch();

      batch.set(orderRef, order);

      batch.set(requestRef, {
        ...order,
        requesterId: mechanic.uid,
        requesterName: mechanic.name,
        quantity,
      });

      await batch.commit();

      console.log("Custom parts request created", {
        orderId: orderRef.id,
        supplierId: supplierId.trim(),
        mechanicId: mechanic.uid,
      });

      return res.status(201).json({
        success: true,
        orderId: orderRef.id,
        orderNumber,
        status: "Pending",
        requestType: "Custom Part Request",
        message: "Custom parts request submitted successfully",
      });
    }


      return sendError(res, 404, "Endpoint not found");
    } catch (error) {
      console.error("Parts API error:", error);

      if (error.status) {
        return sendError(res, error.status, error.message);
      }

      return sendError(res, 500, "Unable to process request");
    }
  }
);
