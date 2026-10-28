
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ref, getBlob } from "firebase/storage";
import { storage, auth } from "./firebase";

const formatMoney = (amount, currency = "JMD") =>
  new Intl.NumberFormat("en-JM", {
    style: "currency",
    currency,
  }).format(Number(amount || 0));

const formatDate = (value) => {
  if (!value) return new Date().toLocaleDateString();

  const date = value?.toDate
    ? value.toDate()
    : new Date(value);

  return Number.isNaN(date.getTime())
    ? new Date().toLocaleDateString()
    : date.toLocaleDateString();
};




// async function loadLogo(storagePath) {
//   if (!storagePath) return null;

//   try {
//     // storagePath should be something like:
//     // supplierLogos/USER_ID/company-logo.png
//     const blob = await getBlob(ref(storage, storagePath));

//     return await new Promise((resolve, reject) => {
//       const reader = new FileReader();

//       reader.onload = () => {
//         const image = new Image();

//         image.onload = () => {
//           const canvas = document.createElement("canvas");
//           canvas.width = image.naturalWidth;
//           canvas.height = image.naturalHeight;

//           const context = canvas.getContext("2d");
//           if (!context) {
//             reject(new Error("Unable to process the logo."));
//             return;
//           }

//           context.drawImage(image, 0, 0);
//           resolve(canvas.toDataURL("image/png"));
//         };

//         image.onerror = () => reject(
//           new Error("Unable to decode the logo.")
//         );

//         image.src = reader.result;
//       };

//       reader.onerror = () => reject(
//         new Error("Unable to read the logo file.")
//       );

//       reader.readAsDataURL(blob);
//     });
//   } catch (error) {
//     console.error("Firebase logo download failed:", error);
//     return null;
//   }
// }



const PARTS_API_URL =
  "https://partsapi-rhcb5fqzqq-uc.a.run.app";


async function loadLogo(supplierId) {
  if (!supplierId) {
    console.warn("No supplier ID was provided for the logo.");
    return null;
  }

  try {
    // auth is already the Firebase Auth instance.
    const user = auth.currentUser;

    if (!user) {
      throw new Error("Please sign in to generate this document.");
    }

    const token = await user.getIdToken();

    const response = await fetch(
      `${PARTS_API_URL}/v1/suppliers/${encodeURIComponent(supplierId)}/logo`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Logo API returned ${response.status}: ${errorText}`
      );
    }

    const blob = await response.blob();

    if (!blob.type.startsWith("image/")) {
      throw new Error(`Logo response is not an image: ${blob.type}`);
    }

    // Convert the image to PNG so jsPDF receives a consistent format.
    return await new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(blob);
      const image = new Image();

      image.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;

          const context = canvas.getContext("2d");

          if (!context) {
            throw new Error("Unable to create image canvas.");
          }

          context.drawImage(image, 0, 0);

          resolve(canvas.toDataURL("image/png"));
        } catch (error) {
          reject(error);
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Unable to decode the supplier logo."));
      };

      image.src = objectUrl;
    });
  } catch (error) {
    console.error("Company logo loading failed:", error);
    return null;
  }
}




export async function generateSupplierDocument({
  request,
  profile = {},
  type = "po",
}) {
  if (!request) {
    throw new Error("A parts request is required.");
  }

  const isReceipt = type === "receipt";
  const pdf = new jsPDF();

  const currency = request.currency || "JMD";
  const orderNumber =
    request.orderNumber || request.id || "N/A";

  const companyName =
    profile.businessName ||
    profile.companyName ||
    request.supplierName ||
    "Supplier";

  const items = Array.isArray(request.items)
    ? request.items
    : [];

  const supplierId =  profile.uid

  const logo = await loadLogo(supplierId);


  // Company branding
  if (logo) {
    try {
      pdf.addImage(logo, "PNG", 14, 12, 27, 27);
    } catch (error) {
      console.warn("Logo could not be added to PDF:", error);
    }
  }

  const textStart = logo ? 48 : 14;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text(companyName, textStart, 18);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);

  const companyLines = [
    profile.address,
    [profile.city, profile.parish, profile.country]
      .filter(Boolean)
      .join(", "),
    profile.phone ? `Tel: ${profile.phone}` : "",
    profile.email || "",
    profile.website || "",
  ].filter(Boolean);

  companyLines.slice(0, 4).forEach((line, index) => {
    pdf.text(String(line), textStart, 25 + index * 5);
  });

  pdf.setDrawColor(210, 220, 230);
  pdf.line(14, 43, 196, 43);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(17);
  pdf.text(
    isReceipt ? "SALES / ORDER RECEIPT" : "PURCHASE ORDER",
    14,
    54
  );

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);

  pdf.text(`Reference: ${orderNumber}`, 14, 64);
  pdf.text(`Date: ${formatDate(request.createdAt || request.timestamp)}`, 14, 70);
  pdf.text(`Status: ${String(request.status || "Pending")}`, 14, 76);

  pdf.setFont("helvetica", "bold");
  pdf.text("Order Details", 14, 88);

  pdf.setFont("helvetica", "normal");
  pdf.text(
    `Requested by: ${request.mechanicName || request.requestedBy || request.mechanicId || "N/A"}`,
    14,
    95
  );

  const vehicle = request.vehicle;

  const vehicleText =
    typeof vehicle === "string"
      ? vehicle
      : [
          vehicle?.year,
          vehicle?.make,
          vehicle?.model,
        ]
          .filter(Boolean)
          .join(" ") || "Not specified";

  pdf.text(`Vehicle: ${vehicleText}`, 14, 102);

  const rows = items.length
    ? items.map((item) => {
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unitPrice || 0);

        return [
          item.partName || item.name || item.partId || "Part",
        //   String(item.partId || "—"),
          String(quantity),
          formatMoney(unitPrice, currency),
          formatMoney(
            item.lineTotal ?? quantity * unitPrice,
            currency
          ),
        ];
      })
    : [["No item details supplied", "—", "0", formatMoney(0, currency), formatMoney(0, currency)]];

  autoTable(pdf, {
    startY: 112,
    head: [[
      "Description",
    //   "Part ID",
      "Qty",
      "Unit Price",
      "Line Total",
    ]],
    body: rows,
    theme: "grid",
    styles: {
      fontSize: 8,
      cellPadding: 3,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: 255,
      fontStyle: "bold",
    },
    columnStyles: {
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
    },
  });

  const finalY = pdf.lastAutoTable.finalY + 10;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);

  pdf.text(
    `TOTAL: ${formatMoney(request.total, currency)}`,
    196,
    finalY,
    { align: "right" }
  );

  let footerY = finalY + 12;

  if (request.notes) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text("Notes", 14, footerY);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);

    const noteLines = pdf.splitTextToSize(
      String(request.notes),
      180
    );

    pdf.text(noteLines, 14, footerY + 6);
    footerY += 10 + noteLines.length * 4;
  }

  if (isReceipt) {
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "italic");

    pdf.text(
      "This document records the parts request/order details. It is not proof of payment unless payment has been verified.",
      14,
      Math.min(footerY + 8, 275),
      { maxWidth: 180 }
    );
  } else {
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");

    pdf.text(
      "Please reference this PO number when fulfilling the order.",
      14,
      Math.min(footerY + 8, 275)
    );
  }

  const safeName = String(orderNumber).replace(
    /[^a-zA-Z0-9_-]/g,
    "_"
  );

  pdf.save(
    `${isReceipt ? "Receipt" : "PO"}_${safeName}.pdf`
  );
}
