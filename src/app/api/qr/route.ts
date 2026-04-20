import { NextRequest } from "next/server";
import QRCode from "qrcode";

export async function GET(request: NextRequest) {
  const publicId = request.nextUrl.searchParams.get("publicId");
  const label = request.nextUrl.searchParams.get("label");

  // Legacy support
  const token = request.nextUrl.searchParams.get("token");
  const tableNum = request.nextUrl.searchParams.get("table");

  if (!publicId && !token) {
    return Response.json({ error: "Missing publicId or token" }, { status: 400 });
  }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).trim();

  // New sticker URL or legacy table URL
  const qrUrl = publicId
    ? `${baseUrl}/q/${publicId}`
    : `${baseUrl}/t/${token}`;

  const filename = publicId
    ? `sticker-${label || publicId}.png`
    : `table-${tableNum || "qr"}.png`;

  try {
    const buffer = await QRCode.toBuffer(qrUrl, {
      type: "png",
      width: 512,
      margin: 2,
      color: {
        dark: "#0A0A0A",
        light: "#FFFFFF",
      },
    });

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return Response.json({ error: "QR generation failed" }, { status: 500 });
  }
}
