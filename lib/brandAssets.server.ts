import fs from "fs";
import path from "path";

import { InvoiceType } from "@/types";
import {
  resolveInvoiceLogo,
  resolveInvoiceSignature,
  withDefaultBrandAssets,
} from "@/lib/brandAssets";

export function readPublicAssetBuffer(relativePath: string): Buffer | null {
  try {
    return fs.readFileSync(getPublicAssetPath(relativePath));
  } catch {
    return null;
  }
}

function getPublicAssetPath(relativePath: string): string {
  const normalized = relativePath.replace(/^\//, "");
  const candidates = [
    path.join(process.cwd(), "public", normalized),
    path.join(process.cwd(), "..", "public", normalized),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

function readPublicAssetAsDataUrl(relativePath: string): string {
  const filePath = getPublicAssetPath(relativePath);
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mime =
    ext === "jpg" || ext === "jpeg"
      ? "image/jpeg"
      : ext === "gif"
        ? "image/gif"
        : ext === "webp"
          ? "image/webp"
          : "image/png";
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

function embedAssetPath(src: string): string {
  if (src.startsWith("data:")) return src;
  if (src.startsWith("/assets/") || src.startsWith("assets/")) {
    const relative = src.startsWith("/") ? src : `/${src}`;
    return readPublicAssetAsDataUrl(relative);
  }
  return src;
}

/**
 * Embeds local brand assets as data URLs for reliable Puppeteer PDF rendering.
 */
export function prepareInvoiceForPdf(invoice: InvoiceType): InvoiceType {
  const withDefaults = withDefaultBrandAssets(invoice);
  const logo = resolveInvoiceLogo(withDefaults.details.invoiceLogo);
  const signature = resolveInvoiceSignature(withDefaults.details.signature?.data);

  return {
    ...withDefaults,
    details: {
      ...withDefaults.details,
      invoiceLogo: embedAssetPath(logo),
      signature: {
        ...withDefaults.details.signature,
        data: embedAssetPath(signature),
      },
    },
  };
}
