import React from "react";
import { InvoiceType } from "@/types";
import { formatNumberWithCommas, isImageUrl, isDataUrl, formatStatementDate } from "@/lib/helpers";
import { DATE_OPTIONS } from "@/lib/variables";

type BankDetail = {
    bankName: string;
    accountName: string;
    accountNumber: string;
    iban?: string;
    swiftCode?: string;
};

type StatementData = {
    invoices: InvoiceType[];
    title?: string;
    billedToName?: string;
    statementDateFrom?: string; // Custom "from" date to display in "Generated:" field
    statementDateTo?: string; // Custom "to" date to display in "Generated:" field
    bankDetails?: BankDetail[]; // Selected bank details to display
};

const StatementTemplate = (data: StatementData) => {
    const { invoices, title = "STATEMENT", billedToName, statementDateFrom, statementDateTo, bankDetails } = data;

    // Flatten invoices into passenger rows (one row per item/passenger)
    type PassengerRow = {
        invoice: InvoiceType;
        item: InvoiceType["details"]["items"][0];
        itemIndex: number;
    };

    // Sort invoices by date first
    const sortedInvoices = [...invoices].sort((a, b) => {
        const dateA = a.details.invoiceDate ? new Date(a.details.invoiceDate).getTime() : 0;
        const dateB = b.details.invoiceDate ? new Date(b.details.invoiceDate).getTime() : 0;
        return dateA - dateB;
    });

    // Create a row for each passenger (item) in each invoice
    const passengerRows: PassengerRow[] = [];
    sortedInvoices.forEach((invoice) => {
        invoice.details.items.forEach((item, itemIndex) => {
            passengerRows.push({ invoice, item, itemIndex });
        });
    });

    // Auto-adjust: Calculate total amount from all items (automatically recalculates)
    const totalAmount = passengerRows.reduce((sum, row) => {
        return sum + (Number(row.item.total) || 0);
    }, 0);

    // Get currency from first invoice (assuming all invoices use same currency)
    const currency = invoices[0]?.details.currency || "USD";

    // Get sender and details from first invoice (assuming all invoices have same sender)
    const firstInvoice = invoices[0];
    const sender = firstInvoice?.sender || { name: "", city: "", country: "", email: "", phone: "" };
    const details = firstInvoice?.details || {};
    const receiver = firstInvoice?.receiver || { name: "", city: "", country: "", email: "", phone: "" };

    // Get signature font if available
    const fontHref = details.signature?.fontFamily
        ? `https://fonts.googleapis.com/css2?family=${details.signature.fontFamily}&display=swap`
        : "";

    return (
        <>
            {/* Load signature font if needed */}
            {details.signature?.fontFamily && (
                <>
                    <link rel="preconnect" href="https://fonts.googleapis.com" />
                    <link
                        rel="preconnect"
                        href="https://fonts.gstatic.com"
                        crossOrigin="anonymous"
                    />
                    <link href={fontHref} rel="stylesheet" />
                </>
            )}
            <style>{`
                @page {
                    size: A4;
                    margin: 0.5cm;
                }
                @media print {
                    .statement-page {
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }
                    .statement-table-row {
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }
                    .statement-section {
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }
                    table {
                        page-break-inside: auto;
                    }
                    tr {
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }
                }
            `}</style>
            <div className="bg-white p-4" style={{ fontFamily: "Outfit, sans-serif" }}>
                <div className="max-w-5xl mx-auto statement-page">
                {/* Header with Logo and Company Details */}
                <div className="flex flex-wrap justify-between items-start gap-3 mb-3 border-b border-gray-300 pb-3 statement-section">
                    <div className="flex-1 min-w-[300px] space-y-3">
                        {details.invoiceLogo && (
                            <img
                                src={details.invoiceLogo}
                                width={140}
                                height={100}
                                alt={`Logo of ${sender.name}`}
                                className="mb-3"
                            />
                        )}
                        <h1 className="text-2xl font-semibold uppercase tracking-wide text-gray-800">
                            {sender.name || "Company Name"}
                        </h1>
                        <div className="text-sm text-gray-700 space-y-1">
                            {(sender.city || sender.country) && (
                                <p className="font-medium">
                                    {[sender.city, sender.country].filter(Boolean).join(", ")}
                                </p>
                            )}
                            {sender.email && (
                                <p>
                                    <span className="font-semibold">Email:</span> {sender.email}
                                </p>
                            )}
                            {sender.phone && (
                                <>
                                    {(Array.isArray(sender.phone) ? sender.phone : [sender.phone]).filter(phone => phone && phone.trim()).map((phone, index) => (
                                        <p key={index}>
                                            <span className="font-semibold">Phone{index > 0 ? ` ${index + 1}` : ''}:</span> {phone.trim()}
                                        </p>
                                    ))}
                                </>
                            )}
                            {sender.customInputs && sender.customInputs.length > 0 && (
                                <div className="mt-2 space-y-1">
                                    {sender.customInputs.map((input, idx) => (
                                        <p key={idx}>
                                            <span className="font-semibold">{input.key}:</span> {input.value}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="text-right space-y-3">
                        <h2 className="text-3xl font-bold text-gray-900 uppercase tracking-wide">
                            {title}
                        </h2>
                        <div className="text-xs text-gray-700 space-y-0.5">
                            <p>
                                <span className="font-semibold">Generated:</span>{" "}
                                {statementDateFrom && statementDateTo 
                                    ? `From ${statementDateFrom} - To ${statementDateTo}`
                                    : statementDateFrom 
                                    ? `From ${statementDateFrom}`
                                    : statementDateTo
                                    ? `To ${statementDateTo}`
                                    : new Date().toLocaleDateString("en-US", DATE_OPTIONS)}
                            </p>
                            <p>
                                <span className="font-semibold">Total Invoices:</span> {invoices.length}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Billed To Section */}
                <div className="mb-3 mt-2 statement-section">
                    <div className="text-left">
                        <p className="text-xs font-semibold text-gray-700 uppercase tracking-widest mb-1 border-b border-gray-300 pb-0.5 inline-block">
                            Billed To
                        </p>
                        <div className="mt-1 min-h-[60px] border border-gray-300 rounded p-2 bg-gray-50">
                            {billedToName ? (
                                <p className="text-base font-medium text-gray-900">{billedToName}</p>
                            ) : (
                                <p className="text-sm text-gray-400 italic">No name provided</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="border border-gray-300 rounded-lg overflow-hidden statement-section">
                    <table className="w-full border-collapse" style={{ pageBreakInside: 'auto' }}>
                        <thead>
                            <tr className="bg-gray-100 border-b-2 border-gray-300">
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase border-r border-gray-300">
                                    DATE
                                </th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase border-r border-gray-300">
                                    INVOICE NO
                                </th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase border-r border-gray-300">
                                    NAME
                                </th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase border-r border-gray-300">
                                    ROUTE
                                </th>
                                <th className="px-2 py-2 text-right text-xs font-semibold text-gray-700 uppercase">
                                    AMOUNT
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {passengerRows.map((row, index) => {
                                const invoice = row.invoice;
                                const item = row.item;
                                
                                // Use helper function to format date consistently and avoid timezone issues
                                const formattedDate = formatStatementDate(invoice.details.invoiceDate);

                                // Get route from this specific item's description, service type, or name
                                const route = item.description || item.serviceType || item.name || "-";

                                // Get passenger name from this specific item
                                const passengerName = item.passengerName || "-";

                                return (
                                    <tr
                                        key={`${invoice.details.invoiceNumber}-${row.itemIndex}`}
                                        className="border-b border-gray-200 hover:bg-gray-50 statement-table-row"
                                        style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                                    >
                                        <td className="px-2 py-2 text-xs text-gray-800 border-r border-gray-300">
                                            {formattedDate}
                                        </td>
                                        <td className="px-2 py-2 text-xs text-gray-800 border-r border-gray-300">
                                            {invoice.details.invoiceNumber || "-"}
                                        </td>
                                        <td className="px-2 py-2 text-xs text-gray-800 border-r border-gray-300">
                                            {passengerName}
                                        </td>
                                        <td className="px-2 py-2 text-xs text-gray-800 border-r border-gray-300">
                                            {route}
                                        </td>
                                        <td className="px-2 py-2 text-xs text-gray-800 text-right font-medium">
                                            {formatNumberWithCommas(Number(item.total) || 0)}
                                        </td>
                                    </tr>
                                );
                            })}
                            {/* Total Row */}
                            <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                                <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300"></td>
                                <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300"></td>
                                <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300"></td>
                                <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300">
                                    TOTAL
                                </td>
                                <td className="px-2 py-2 text-xs text-gray-900 text-right">
                                    {formatNumberWithCommas(totalAmount)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Bank Details Section */}
                {bankDetails && bankDetails.length > 0 && (
                    <div className="mt-3 border-t border-gray-300 pt-2 statement-section">
                        <p className="text-xs font-semibold text-gray-700 uppercase tracking-widest mb-2">
                            Payment Instructions
                        </p>
                        <div className="space-y-2">
                            {bankDetails.map((bankDetail, index) => (
                                <div 
                                    key={index}
                                    className="border border-gray-300 rounded p-2 bg-gray-50"
                                    style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                                >
                                    {bankDetails.length > 1 && (
                                        <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1">
                                            Payment Instructions {index + 1}
                                        </p>
                                    )}
                                    <div className="text-xs text-gray-700 space-y-0.5">
                                        <p>
                                            <span className="font-semibold">Bank:</span> {bankDetail.bankName}
                                        </p>
                                        <p>
                                            <span className="font-semibold">Account Name:</span> {bankDetail.accountName}
                                        </p>
                                        <p>
                                            <span className="font-semibold">Account Number:</span> {bankDetail.accountNumber}
                                        </p>
                                        {bankDetail.iban && (
                                            <p>
                                                <span className="font-semibold">IBAN No:</span> {bankDetail.iban}
                                            </p>
                                        )}
                                        {bankDetail.swiftCode && (
                                            <p>
                                                <span className="font-semibold">SWIFT Code:</span> {bankDetail.swiftCode}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer with Signature */}
                <div className="mt-3 border-t border-gray-300 pt-3 statement-section">
                    <div className="flex justify-between items-end">
                        {/* Billing Signature */}
                        <div className="text-left space-y-3">
                            {/* Receiver Name */}
                            <div>
                                <p className="text-xs font-semibold text-gray-700 uppercase tracking-widest mb-1">
                                    Receiver Name - 
                                </p>
                                <div className="min-w-[180px] min-h-[25px] border-b border-gray-300">
                                    {/* Empty receiver name field - can be filled manually */}
                                </div>
                            </div>

                            {/* Signature */}
                            <div>
                                <p className="text-xs font-semibold text-gray-700 uppercase tracking-widest mb-1">
                                    Signature - 
                                </p>
                                <div className="min-w-[180px] min-h-[50px] border-b border-gray-300">
                                    {/* Empty signature field - can be filled manually */}
                                </div>
                            </div>

                            {/* Date */}
                            <div>
                                <p className="text-xs font-semibold text-gray-700 uppercase tracking-widest mb-1">
                                    Date - 
                                </p>
                                <div className="min-w-[180px] min-h-[25px] border-b border-gray-300">
                                    {/* Empty date field - can be filled manually */}
                                </div>
                            </div>

                            {/* Receiver Stamp */}
                            <div>
                                <p className="text-xs font-semibold text-gray-700 uppercase tracking-widest mb-1">
                                    Receiver Stamp
                                </p>
                                <div className="min-w-[180px] min-h-[50px] border border-gray-300 rounded">
                                    {/* Empty receiver stamp field - can be filled manually */}
                                </div>
                            </div>
                        </div>

                        {/* Authorized Signature */}
                        {details.signature?.data && (
                            <div className="text-right">
                                <p className="text-xs font-semibold text-gray-700 uppercase tracking-widest mb-1">
                                    Authorized Signature 
                                </p>
                                {isImageUrl(details.signature.data) ? (
                                    <img
                                        src={details.signature.data}
                                        width={120}
                                        height={60}
                                        alt={`Signature of ${sender.name}`}
                                        className="border border-gray-300 rounded"
                                    />
                                ) : (
                                    <div className="border border-gray-300 rounded p-1.5 bg-white min-w-[120px]">
                                        <p
                                            style={{
                                                fontSize: 24,
                                                fontWeight: 400,
                                                fontFamily: `${details.signature.fontFamily || "Dancing Script"}, cursive`,
                                                margin: 0,
                                                textAlign: "center",
                                            }}
                                        >
                                            {details.signature.data}
                                        </p>
                                    </div>
                                )}
                                <p className="text-xs text-gray-600 mt-1 font-medium">{sender.name}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
        </>
    );
};

export default StatementTemplate;

