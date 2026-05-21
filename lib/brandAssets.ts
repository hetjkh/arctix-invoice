import { InvoiceType } from "@/types";

export const DEFAULT_INVOICE_LOGO = "/assets/logo.png";
export const DEFAULT_INVOICE_SIGNATURE = "/assets/SIGN.png";

/**
 * Returns the company logo. Passes through embedded data URLs (PDF export).
 * Otherwise always uses the default asset path (preview / saved invoices).
 */
export function resolveInvoiceLogo(logo?: string | null): string {
  if (logo?.startsWith("data:")) return logo;
  return DEFAULT_INVOICE_LOGO;
}

/**
 * Returns the authorized signature. Passes through embedded data URLs (PDF export).
 * Otherwise always uses the default asset path.
 */
export function resolveInvoiceSignature(signature?: string | null): string {
  if (signature?.startsWith("data:")) return signature;
  return DEFAULT_INVOICE_SIGNATURE;
}

/**
 * Forces default logo and signature on invoice data (save, load, export).
 */
export function withDefaultBrandAssets(invoice: InvoiceType): InvoiceType {
  return {
    ...invoice,
    details: {
      ...invoice.details,
      invoiceLogo: DEFAULT_INVOICE_LOGO,
      signature: {
        ...invoice.details?.signature,
        data: DEFAULT_INVOICE_SIGNATURE,
      },
    },
  };
}

export function withDefaultBrandAssetsList(invoices: InvoiceType[]): InvoiceType[] {
  return invoices.map(withDefaultBrandAssets);
}
