import { NextRequest, NextResponse } from "next/server";

// Chromium
import chromium from "@sparticuz/chromium";

// Helpers
import { getInvoiceTemplate } from "@/lib/helpers";

// Variables
import { ENV, TAILWIND_CDN } from "@/lib/variables";

// Types
import { InvoiceType } from "@/types";

/**
 * Generate a PDF document of an invoice based on the provided data.
 *
 * @async
 * @param {NextRequest} req - The Next.js request object.
 * @throws {Error} If there is an error during the PDF generation process.
 * @returns {Promise<NextResponse>} A promise that resolves to a NextResponse object containing the generated PDF.
 */
export async function generatePdfService(req: NextRequest) {
    const body: InvoiceType = await req.json();
    let browser;
    let page;

    try {
        const ReactDOMServer = (await import("react-dom/server")).default;
        const templateId = body.details.pdfTemplate;
        const InvoiceTemplate = await getInvoiceTemplate(templateId);
        const htmlTemplate = ReactDOMServer.renderToStaticMarkup(
            InvoiceTemplate(body)
        );

		if (ENV === "production") {
			const puppeteer = (await import("puppeteer-core")).default;
			browser = await puppeteer.launch({
				args: [...chromium.args, "--disable-dev-shm-usage", "--ignore-certificate-errors"],
				executablePath: await chromium.executablePath(),
				headless: true,
			});
		} else {
			const puppeteer = (await import("puppeteer")).default;
			browser = await puppeteer.launch({
				args: ["--no-sandbox", "--disable-setuid-sandbox"],
				headless: true,
			});
		}

        if (!browser) {
            throw new Error("Failed to launch browser");
        }

        page = await browser.newPage();
        await page.setContent(await htmlTemplate, {
            waitUntil: ["networkidle0", "load", "domcontentloaded"],
            timeout: 30000,
        });

        await page.addStyleTag({
            url: TAILWIND_CDN,
        });

        // Auto-adjust logic: Detect and fix orphaned content on second page
        await page.evaluate(() => {
            // Function to check if content is orphaned on second page
            const checkAndFixOrphans = () => {
                const footerSections = document.querySelectorAll('.invoice-footer-section, .invoice-totals-section, .invoice-payment-section');
                
                // Get viewport height (A4: 210mm x 297mm = 794px x 1123px at 96dpi)
                // But we need to account for actual rendered height
                const viewportHeight = window.innerHeight;
                const pageHeight = 1123; // A4 height in pixels at 96dpi
                const orphanThreshold = 120; // If less than 120px on second page, consider it orphaned (about 4 lines)
                
                // Check if we need to adjust spacing
                let needsAdjustment = false;
                let elementToAdjust: Element | null = null;
                let heightOnPage2 = 0;
                
                // Find elements that might be split across pages
                footerSections.forEach((section) => {
                    const rect = section.getBoundingClientRect();
                    const top = rect.top + window.scrollY;
                    const bottom = rect.bottom + window.scrollY;
                    const elementHeight = rect.height;
                    
                    // Check if section crosses the page boundary
                    if (top < pageHeight && bottom > pageHeight) {
                        const overflow = bottom - pageHeight;
                        if (overflow > 0 && overflow < orphanThreshold) {
                            needsAdjustment = true;
                            elementToAdjust = section;
                            heightOnPage2 = overflow;
                        }
                    }
                });
                
                if (needsAdjustment && elementToAdjust) {
                    const element = elementToAdjust as HTMLElement;
                    const adjustmentNeeded = heightOnPage2 + 20; // Add small buffer
                    
                    // Try multiple strategies to reduce spacing
                    let adjusted = 0;
                    
                    // Strategy 1: Reduce margins on the element itself
                    const currentMarginTop = parseFloat(window.getComputedStyle(element).marginTop) || 0;
                    if (currentMarginTop > 0 && adjusted < adjustmentNeeded) {
                        const reduceBy = Math.min(currentMarginTop, adjustmentNeeded - adjusted);
                        element.style.marginTop = `${Math.max(0, currentMarginTop - reduceBy)}px`;
                        adjusted += reduceBy;
                    }
                    
                    // Strategy 2: Reduce padding
                    const currentPaddingTop = parseFloat(window.getComputedStyle(element).paddingTop) || 0;
                    if (currentPaddingTop > 0 && adjusted < adjustmentNeeded) {
                        const reduceBy = Math.min(currentPaddingTop * 0.8, adjustmentNeeded - adjusted);
                        element.style.paddingTop = `${Math.max(0, currentPaddingTop - reduceBy)}px`;
                        adjusted += reduceBy;
                    }
                    
                    // Strategy 3: Reduce spacing in parent containers
                    let parent = element.parentElement;
                    let depth = 0;
                    while (parent && parent !== document.body && adjusted < adjustmentNeeded && depth < 3) {
                        const parentMarginTop = parseFloat(window.getComputedStyle(parent).marginTop) || 0;
                        const parentPaddingTop = parseFloat(window.getComputedStyle(parent).paddingTop) || 0;
                        
                        if (parentMarginTop > 5 && adjusted < adjustmentNeeded) {
                            const reduceBy = Math.min(parentMarginTop * 0.5, adjustmentNeeded - adjusted);
                            parent.style.marginTop = `${Math.max(0, parentMarginTop - reduceBy)}px`;
                            adjusted += reduceBy;
                        }
                        
                        if (parentPaddingTop > 5 && adjusted < adjustmentNeeded) {
                            const reduceBy = Math.min(parentPaddingTop * 0.5, adjustmentNeeded - adjusted);
                            parent.style.paddingTop = `${Math.max(0, parentPaddingTop - reduceBy)}px`;
                            adjusted += reduceBy;
                        }
                        
                        // Reduce gap in grid/flex containers
                        const gap = parseFloat(window.getComputedStyle(parent).gap) || 0;
                        if (gap > 4 && adjusted < adjustmentNeeded) {
                            const reduceBy = Math.min(gap * 0.3, adjustmentNeeded - adjusted);
                            parent.style.gap = `${Math.max(2, gap - reduceBy)}px`;
                            adjusted += reduceBy;
                        }
                        
                        parent = parent.parentElement;
                        depth++;
                    }
                    
                    // Strategy 4: Reduce line-height in text elements if still needed
                    if (adjusted < adjustmentNeeded) {
                        const textElements = element.querySelectorAll('p, div, span');
                        textElements.forEach((textEl) => {
                            if (adjusted >= adjustmentNeeded) return;
                            const el = textEl as HTMLElement;
                            const lineHeight = parseFloat(window.getComputedStyle(el).lineHeight) || 1.5;
                            if (lineHeight > 1.2) {
                                el.style.lineHeight = `${Math.max(1.1, lineHeight - 0.1)}`;
                                adjusted += 2; // Approximate reduction
                            }
                        });
                    }
                }
            };
            
            // Run adjustment after layout is complete
            // Use requestAnimationFrame to ensure DOM is fully rendered
            requestAnimationFrame(() => {
                setTimeout(checkAndFixOrphans, 300);
            });
        });

        // Wait for adjustments to take effect
        await new Promise(resolve => setTimeout(resolve, 500));

		const pdf: Uint8Array = await page.pdf({
			format: "a4",
			printBackground: true,
			preferCSSPageSize: true,
		});

		return new NextResponse(new Blob([pdf], { type: "application/pdf" }), {
			headers: {
				"Content-Type": "application/pdf",
				"Content-Disposition": "attachment; filename=invoice.pdf",
				"Cache-Control": "no-cache",
				Pragma: "no-cache",
			},
			status: 200,
		});
	} catch (error: any) {
		console.error("PDF Generation Error:", error);
		return new NextResponse(
			JSON.stringify({ error: "Failed to generate PDF" }),
			{
				status: 500,
				headers: {
					"Content-Type": "application/json",
				},
			}
		);
	} finally {
		if (page) {
			try {
				await page.close();
			} catch (e) {
				console.error("Error closing page:", e);
			}
		}
		if (browser) {
			try {
				const pages = await browser.pages();
				await Promise.all(pages.map((p) => p.close()));
				await browser.close();
			} catch (e) {
				console.error("Error closing browser:", e);
			}
		}
	}
}
