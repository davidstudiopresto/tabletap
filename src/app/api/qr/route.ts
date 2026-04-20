import { NextRequest } from "next/server";
import QRCode from "qrcode";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const tableNum = request.nextUrl.searchParams.get("table");

  if (!token) {
    return Response.json({ error: "Missing token" }, { status: 400 });
  }

  const origin = request.nextUrl.origin;
  const qrUrl = `${origin}/t/${token}`;

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
        "Content-Disposition": `attachment; filename="table-${tableNum || "qr"}.png"`,
      },
    });
  } catch {
    return Response.json({ error: "QR generation failed" }, { status: 500 });
  }
}
