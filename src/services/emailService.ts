import dotenv from "dotenv";

dotenv.config();

const BREVO_API_KEY = process.env.BREVO_API_KEY || "";
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "no-reply@ajmaya.com";
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || "Ajmaya E-Commerce";

export interface SendEmailPayload {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
}

export async function sendEmail({ to, subject, htmlContent }: SendEmailPayload): Promise<boolean> {
  if (!BREVO_API_KEY) {
    console.warn("[EmailService] Warning: BREVO_API_KEY is not defined in environment variables. Email send skipped.");
    return false;
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: BREVO_SENDER_NAME,
          email: BREVO_SENDER_EMAIL,
        },
        to,
        subject,
        htmlContent,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[EmailService] Failed to send email via Brevo. Status: ${response.status}. Error: ${errorText}`);
      return false;
    }

    const result = await response.json();
    console.log(`[EmailService] Email sent successfully to ${to.map((t) => t.email).join(", ")}. Message ID: ${result.messageId}`);
    return true;
  } catch (error) {
    console.error("[EmailService] Error occurred while sending email:", error);
    return false;
  }
}

export function generateOrderConfirmationTemplate(order: any, user: any): string {
  const logoUrl = "https://res.cloudinary.com/diecfwnp9/image/upload/v1782038971/ChatGPT_Image_Jun_21_2026_04_19_18_PM_beehb7.png";
  
  // Format items table rows
  let itemsHtml = "";
  let subtotal = 0;
  
  const items = order.items || [
    {
      product: order.product,
      quantity: order.quantity || 1,
      price: order.product?.price || order.totalAmount || 0,
    }
  ];
  
  items.forEach((item: any) => {
    const itemPrice = item.price || 0;
    const itemQty = item.quantity || 1;
    const itemTotal = itemPrice * itemQty;
    subtotal += itemTotal;
    
    itemsHtml += `
      <tr style="border-bottom: 1px solid #edf2f7;">
        <td style="padding: 12px 0; text-align: left; font-size: 14px; color: #2d3748;">
          <div style="font-weight: bold; color: #1a202c;">${item.product?.name || "Product Item"}</div>
        </td>
        <td style="padding: 12px 0; text-align: center; font-size: 14px; color: #4a5568;">${itemQty}</td>
        <td style="padding: 12px 0; text-align: right; font-size: 14px; color: #4a5568;">₹${itemPrice.toLocaleString()}</td>
        <td style="padding: 12px 0; text-align: right; font-size: 14px; font-weight: bold; color: #2d3748;">₹${itemTotal.toLocaleString()}</td>
      </tr>
    `;
  });

  const shipping = order.shippingCharge || 0;
  const total = order.totalAmount || (subtotal + shipping);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Order Confirmation</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7fafc; margin: 0; padding: 0;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f7fafc; padding: 40px 0;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              
              <!-- Header Section -->
              <tr>
                <td align="center" style="background-color: #f8fafc; padding: 30px; border-bottom: 1px solid #edf2f7; text-align: center;">
                  <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                    <tr>
                      <td align="center" style="vertical-align: middle;">
                        <img src="${logoUrl}" alt="Ajmaya Logo" width="36" height="36" style="display: block; outline: none; border: none;" />
                      </td>
                      <td align="center" style="vertical-align: middle; padding-left: 10px; font-size: 20px; font-weight: 800; color: #1a202c; letter-spacing: -0.5px;">
                        Ajmaya
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Greeting & Hero Card -->
              <tr>
                <td style="padding: 40px 40px 20px 40px;">
                  <h1 style="font-size: 24px; font-weight: 800; color: #1a202c; margin: 0 0 10px 0; letter-spacing: -0.5px;">Thank you for your order!</h1>
                  <p style="font-size: 15px; color: #4a5568; line-height: 1.6; margin: 0;">
                    Hello ${user?.name || "Customer"}, we've received your purchase request. Our warehouse is preparing your shipment. Below are your invoice and order summary.
                  </p>
                </td>
              </tr>

              <!-- Order Info Card -->
              <tr>
                <td style="padding: 0 40px 20px 40px;">
                  <div style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #edf2f7; padding: 20px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="font-size: 13px; color: #718096; padding-bottom: 8px;">Order Reference ID:</td>
                        <td style="font-size: 13px; font-weight: bold; color: #1a202c; text-align: right; padding-bottom: 8px;">${order.id || order._id}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #718096; padding-bottom: 8px;">Purchase Date:</td>
                        <td style="font-size: 13px; font-weight: bold; color: #1a202c; text-align: right; padding-bottom: 8px;">${new Date(order.createdAt || Date.now()).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #718096;">Payment Method:</td>
                        <td style="font-size: 13px; font-weight: bold; color: #1a202c; text-align: right;">${order.paymentMethod || "Online Wallet"}</td>
                      </tr>
                    </table>
                  </div>
                </td>
              </tr>

              <!-- Items Table -->
              <tr>
                <td style="padding: 10px 40px 20px 40px;">
                  <h3 style="font-size: 16px; font-weight: 700; color: #1a202c; margin: 0 0 12px 0;">Purchased Items</h3>
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                    <thead>
                      <tr style="border-bottom: 2px solid #edf2f7;">
                        <th style="padding: 10px 0; text-align: left; font-size: 12px; text-transform: uppercase; color: #a0aec0; letter-spacing: 0.5px;">Product</th>
                        <th style="padding: 10px 0; text-align: center; font-size: 12px; text-transform: uppercase; color: #a0aec0; letter-spacing: 0.5px; width: 60px;">Qty</th>
                        <th style="padding: 10px 0; text-align: right; font-size: 12px; text-transform: uppercase; color: #a0aec0; letter-spacing: 0.5px; width: 90px;">Price</th>
                        <th style="padding: 10px 0; text-align: right; font-size: 12px; text-transform: uppercase; color: #a0aec0; letter-spacing: 0.5px; width: 100px;">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsHtml}
                    </tbody>
                  </table>
                </td>
              </tr>

              <!-- Totals Breakdown -->
              <tr>
                <td align="right" style="padding: 0 40px 40px 40px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="280">
                    <tr>
                      <td style="padding: 6px 0; font-size: 14px; color: #718096; text-align: left;">Subtotal:</td>
                      <td style="padding: 6px 0; font-size: 14px; font-weight: bold; color: #1a202c; text-align: right;">₹${subtotal.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; font-size: 14px; color: #718096; text-align: left;">Shipping:</td>
                      <td style="padding: 6px 0; font-size: 14px; font-weight: bold; color: #1a202c; text-align: right;">₹${shipping.toLocaleString()}</td>
                    </tr>
                    <tr style="border-top: 1px dashed #edf2f7;">
                      <td style="padding: 12px 0 0 0; font-size: 16px; font-weight: 800; color: #1a202c; text-align: left;">Grand Total:</td>
                      <td style="padding: 12px 0 0 0; font-size: 18px; font-weight: 900; color: #7c5dfa; text-align: right;">₹${total.toLocaleString()}</td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Support & Footer -->
              <tr>
                <td align="center" style="background-color: #f8fafc; padding: 30px; border-top: 1px solid #edf2f7; text-align: center;">
                  <p style="font-size: 12px; color: #a0aec0; line-height: 1.5; margin: 0 0 10px 0;">
                    If you have any questions or did not authorize this purchase, please reach out to our Customer Success support team.
                  </p>
                  <p style="font-size: 11px; color: #cbd5e0; margin: 0;">
                    &copy; ${new Date().getFullYear()} Ajmaya E-Commerce Inc. All Rights Reserved.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export function generateFranchiseWelcomeTemplate(franchise: any, password: string): string {
  const logoUrl = "https://res.cloudinary.com/diecfwnp9/image/upload/v1782038971/ChatGPT_Image_Jun_21_2026_04_19_18_PM_beehb7.png";
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Welcome to Ajmaya Franchise</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7fafc; margin: 0; padding: 0;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f7fafc; padding: 40px 0;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              
              <!-- Header Section -->
              <tr>
                <td align="center" style="background-color: #f8fafc; padding: 30px; border-bottom: 1px solid #edf2f7; text-align: center;">
                  <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                    <tr>
                      <td align="center" style="vertical-align: middle;">
                        <img src="${logoUrl}" alt="Ajmaya Logo" width="36" height="36" style="display: block; outline: none; border: none;" />
                      </td>
                      <td align="center" style="vertical-align: middle; padding-left: 10px; font-size: 20px; font-weight: 800; color: #1a202c; letter-spacing: -0.5px;">
                        Ajmaya
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Greeting & Hero Card -->
              <tr>
                <td style="padding: 40px 40px 20px 40px;">
                  <h1 style="font-size: 24px; font-weight: 800; color: #1a202c; margin: 0 0 10px 0; letter-spacing: -0.5px;">Welcome to Ajmaya, ${franchise.franchiseName}!</h1>
                  <p style="font-size: 15px; color: #4a5568; line-height: 1.6; margin: 0;">
                    We are thrilled to inform you that your franchise registration has been approved. Below are your operator login credentials and registered location details.
                  </p>
                </td>
              </tr>

              <!-- Credentials Card -->
              <tr>
                <td style="padding: 0 40px 20px 40px;">
                  <div style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #edf2f7; padding: 20px;">
                    <h3 style="font-size: 16px; font-weight: 700; color: #1a202c; margin: 0 0 15px 0;">Your Account Credentials</h3>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="font-size: 13px; color: #718096; padding-bottom: 8px;">Login Email:</td>
                        <td style="font-size: 13px; font-weight: bold; color: #1a202c; text-align: right; padding-bottom: 8px;">${franchise.email}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #718096; padding-bottom: 8px;">Password:</td>
                        <td style="font-size: 13px; font-weight: bold; color: #0B6C6D; text-align: right; padding-bottom: 8px;">${password}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #718096;">Account Role:</td>
                        <td style="font-size: 13px; font-weight: bold; color: #1a202c; text-align: right;">${franchise.franchiseType.replace("_", " ")}</td>
                      </tr>
                    </table>
                  </div>
                </td>
              </tr>

              <!-- Location & Details Card -->
              <tr>
                <td style="padding: 0 40px 20px 40px;">
                  <div style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #edf2f7; padding: 20px;">
                    <h3 style="font-size: 16px; font-weight: 700; color: #1a202c; margin: 0 0 15px 0;">Franchise & Location Details</h3>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="font-size: 13px; color: #718096; padding-bottom: 8px;">Brand Name:</td>
                        <td style="font-size: 13px; font-weight: bold; color: #1a202c; text-align: right; padding-bottom: 8px;">${franchise.brandName}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #718096; padding-bottom: 8px;">Mobile No:</td>
                        <td style="font-size: 13px; font-weight: bold; color: #1a202c; text-align: right; padding-bottom: 8px;">${franchise.mobileNo}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #718096; padding-bottom: 8px;">Jurisdiction State:</td>
                        <td style="font-size: 13px; font-weight: bold; color: #1a202c; text-align: right; padding-bottom: 8px;">${franchise.state}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #718096; padding-bottom: 8px;">District:</td>
                        <td style="font-size: 13px; font-weight: bold; color: #1a202c; text-align: right; padding-bottom: 8px;">${franchise.district}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #718096; padding-bottom: 8px;">Tehsil / City / Village:</td>
                        <td style="font-size: 13px; font-weight: bold; color: #1a202c; text-align: right; padding-bottom: 8px;">${franchise.tehsil} / ${franchise.cityVillage}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #718096;">Pincode:</td>
                        <td style="font-size: 13px; font-weight: bold; color: #1a202c; text-align: right;">${franchise.pincode}</td>
                      </tr>
                    </table>
                  </div>
                </td>
              </tr>

              <!-- Footer Section -->
              <tr>
                <td align="center" style="background-color: #f8fafc; padding: 30px; border-top: 1px solid #edf2f7; text-align: center;">
                  <p style="font-size: 12px; color: #a0aec0; line-height: 1.5; margin: 0 0 10px 0;">
                    Please change your password immediately after your first login for security reasons.
                  </p>
                  <p style="font-size: 11px; color: #cbd5e0; margin: 0;">
                    &copy; ${new Date().getFullYear()} Ajmaya E-Commerce Inc. All Rights Reserved.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
