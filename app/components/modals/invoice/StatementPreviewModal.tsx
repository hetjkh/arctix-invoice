"use client";

import { useState, useEffect } from "react";
import { InvoiceType } from "@/types";
import { formatNumberWithCommas, formatStatementDate } from "@/lib/helpers";
import { DATE_OPTIONS, LOCAL_STORAGE_SAVED_PAYMENT_INFO_KEY } from "@/lib/variables";
import { useAuth } from "@/contexts/AuthContext";

// ShadCn
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Save } from "lucide-react";
import { BaseButton } from "@/app/components";

interface Client {
    id: string;
    name: string;
    email: string;
}

type StatementPreviewModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    invoices: InvoiceType[];
    clientId?: string;
    clientEmail?: string;
    onSaveSuccess?: () => void;
};

const StatementPreviewModal = ({
    open,
    onOpenChange,
    invoices,
    clientId: initialClientId,
    clientEmail: initialClientEmail,
    onSaveSuccess,
}: StatementPreviewModalProps) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId || "");
    const [selectedClientEmail, setSelectedClientEmail] = useState<string>(initialClientEmail || "");
    const [loadingClients, setLoadingClients] = useState(true);
    const [billedToName, setBilledToName] = useState<string>("");
    const [statementDateFrom, setStatementDateFrom] = useState<string>(
        new Date().toLocaleDateString("en-US", DATE_OPTIONS)
    );
    const [statementDateTo, setStatementDateTo] = useState<string>(
        new Date().toLocaleDateString("en-US", DATE_OPTIONS)
    );
    const [selectedBankDetails, setSelectedBankDetails] = useState<string[]>([]);
    const [savedPaymentInfo, setSavedPaymentInfo] = useState<PaymentInfoType[]>([]);
    const { user } = useAuth();

    // Type for saved payment info
    type PaymentInfoType = {
        id: string;
        name: string;
        bankName: string;
        accountName: string;
        accountNumber: string;
        iban?: string;
        swiftCode?: string;
        savedAt: string;
    };

    // Load saved payment info from MongoDB or localStorage
    useEffect(() => {
        const loadPaymentInfo = async () => {
            if (open) {
                if (user) {
                    // Load from MongoDB
                    try {
                        const response = await fetch("/api/payment-info/list");
                        if (response.ok) {
                            const data = await response.json();
                            const paymentInfo = data.paymentInfo || [];
                            setSavedPaymentInfo(paymentInfo);
                            // Select all saved payment info by default
                            if (paymentInfo.length > 0) {
                                setSelectedBankDetails(paymentInfo.map((info: PaymentInfoType) => info.id));
                            } else {
                                setSelectedBankDetails([]);
                            }
                        } else {
                            setSavedPaymentInfo([]);
                            setSelectedBankDetails([]);
                        }
                    } catch (error) {
                        console.error("Error loading payment info:", error);
                        setSavedPaymentInfo([]);
                        setSelectedBankDetails([]);
                    }
                } else {
                    // Fallback to localStorage if not logged in
                    if (typeof window !== "undefined") {
                        try {
                            const saved = window.localStorage.getItem(LOCAL_STORAGE_SAVED_PAYMENT_INFO_KEY);
                            if (saved) {
                                const parsed = JSON.parse(saved) as PaymentInfoType[];
                                setSavedPaymentInfo(parsed || []);
                                if (parsed && parsed.length > 0) {
                                    setSelectedBankDetails(parsed.map(info => info.id));
                                } else {
                                    setSelectedBankDetails([]);
                                }
                            } else {
                                setSavedPaymentInfo([]);
                                setSelectedBankDetails([]);
                            }
                        } catch (error) {
                            console.error("Error loading saved payment info:", error);
                            setSavedPaymentInfo([]);
                            setSelectedBankDetails([]);
                        }
                    }
                }
            } else {
                setSavedPaymentInfo([]);
                setSelectedBankDetails([]);
            }
        };

        loadPaymentInfo();
    }, [open, user]);

    // Flatten invoices into passenger rows (one row per item/passenger)
    type PassengerRow = {
        invoice: InvoiceType;
        item: InvoiceType["details"]["items"][0];
        itemIndex: number;
    };

    const [passengerRows, setPassengerRows] = useState<PassengerRow[]>([]);
    const [totalAmount, setTotalAmount] = useState<number>(0);
    const [currency, setCurrency] = useState<string>("USD");
    
    // Auto-adjust: Recalculate totals when invoices change
    useEffect(() => {
    // Sort invoices by date first
    const sortedInvoices = [...invoices].sort((a, b) => {
        const dateA = a.details.invoiceDate ? new Date(a.details.invoiceDate).getTime() : 0;
        const dateB = b.details.invoiceDate ? new Date(b.details.invoiceDate).getTime() : 0;
        return dateA - dateB;
    });

    // Create a row for each passenger (item) in each invoice
        const rows: PassengerRow[] = [];
    sortedInvoices.forEach((invoice) => {
        invoice.details.items.forEach((item, itemIndex) => {
                rows.push({ invoice, item, itemIndex });
            });
        });

        setPassengerRows(rows);

        // Calculate total amount from all items (auto-adjust)
        const calculatedTotal = rows.reduce((sum, row) => {
        return sum + (Number(row.item.total) || 0);
    }, 0);

        setTotalAmount(calculatedTotal);

    // Get currency from first invoice (assuming all invoices use same currency)
        setCurrency(invoices[0]?.details.currency || "USD");
    }, [invoices]);

    // Load clients when modal opens
    useEffect(() => {
        if (open) {
            fetchClients();
            // Set initial client if provided
            if (initialClientId) {
                setSelectedClientId(initialClientId);
            }
            if (initialClientEmail) {
                setSelectedClientEmail(initialClientEmail);
            }
        }
    }, [open, initialClientId, initialClientEmail]);

    const fetchClients = async () => {
        try {
            setLoadingClients(true);
            const response = await fetch("/api/client/list");
            if (response.ok) {
                const data = await response.json();
                setClients(data.clients || []);
            }
        } catch (error) {
            console.error("Error fetching clients:", error);
        } finally {
            setLoadingClients(false);
        }
    };

    const handleClientChange = (clientId: string) => {
        setSelectedClientId(clientId);
        const client = clients.find((c) => c.id === clientId);
        if (client) {
            setSelectedClientEmail(client.email);
        } else {
            setSelectedClientEmail("");
        }
    };

    // Format date like "21-Dec-22" - using helper function for consistency
    const formatDate = (dateValue: Date | string | undefined | null) => {
        return formatStatementDate(dateValue);
    };

    const handleDownload = async () => {
        setIsGenerating(true);
        try {
            // Get selected bank details from saved payment info
            const selectedBankDetailsData = savedPaymentInfo.filter(info => 
                selectedBankDetails.includes(info.id)
            ).map(info => ({
                bankName: info.bankName,
                accountName: info.accountName,
                accountNumber: info.accountNumber,
                iban: info.iban,
                swiftCode: info.swiftCode,
            }));

            const response = await fetch("/api/invoice/statement", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ 
                    invoices,
                    billedToName: billedToName.trim() || undefined,
                    statementDateFrom: statementDateFrom.trim() || undefined,
                    statementDateTo: statementDateTo.trim() || undefined,
                    bankDetails: selectedBankDetailsData.length > 0 ? selectedBankDetailsData : undefined,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to generate statement");
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `statement-${new Date().toISOString().split("T")[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Error generating statement:", error);
            alert("Failed to generate statement. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
        if (!selectedClientId) {
            alert("Please select a client to save the statement");
            return;
        }

        if (!billedToName.trim()) {
            alert("Please enter a 'Billed To' name");
            return;
        }

        setIsSaving(true);
        try {
            // Get selected bank details from saved payment info
            const selectedBankDetailsData = savedPaymentInfo.filter(info => 
                selectedBankDetails.includes(info.id)
            ).map(info => ({
                bankName: info.bankName,
                accountName: info.accountName,
                accountNumber: info.accountNumber,
                iban: info.iban,
                swiftCode: info.swiftCode,
            }));

            const response = await fetch("/api/statement/save", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    invoices,
                    title: "STATEMENT",
                    clientId: selectedClientId,
                    clientEmail: selectedClientEmail,
                    billedToName: billedToName.trim(),
                    statementDateFrom: statementDateFrom.trim() || undefined,
                    statementDateTo: statementDateTo.trim() || undefined,
                    bankDetails: selectedBankDetailsData.length > 0 ? selectedBankDetailsData : undefined,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to save statement");
            }

            const data = await response.json();
            alert("Statement saved successfully!");
            
            if (onSaveSuccess) {
                onSaveSuccess();
            }
            
            // Close modal after successful save
            onOpenChange(false);
        } catch (error) {
            console.error("Error saving statement:", error);
            alert("Failed to save statement. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto w-[95vw]">
                <DialogHeader className="pb-2 border-b">
                    <div className="flex justify-between items-center">
                        <div>
                            <DialogTitle className="text-2xl uppercase">Statement Preview</DialogTitle>
                            <DialogDescription className="mt-2">
                                Preview of {invoices.length} selected invoice{invoices.length !== 1 ? 's' : ''}
                            </DialogDescription>
                        </div>
                        <div className="flex gap-2">
                            <BaseButton
                                onClick={handleSave}
                                disabled={isSaving || !selectedClientId}
                                variant="outline"
                                size="sm"
                            >
                                <Save className="h-4 w-4 mr-2" />
                                {isSaving ? "Saving..." : "Save Statement"}
                            </BaseButton>
                            <BaseButton
                                onClick={handleDownload}
                                disabled={isGenerating}
                                variant="default"
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                {isGenerating ? "Generating..." : "Download PDF"}
                            </BaseButton>
                        </div>
                    </div>
                </DialogHeader>

                <div className="mt-4 space-y-4">
                    {/* Client Selector */}
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="client-select" className="text-sm font-semibold">
                            Select Client to Save Statement
                        </Label>
                        <Select
                            value={selectedClientId}
                            onValueChange={handleClientChange}
                            disabled={loadingClients}
                        >
                            <SelectTrigger id="client-select" className="w-full">
                                <SelectValue placeholder={loadingClients ? "Loading clients..." : "Select a client"} />
                            </SelectTrigger>
                            <SelectContent>
                                {clients.map((client) => (
                                    <SelectItem key={client.id} value={client.id}>
                                        {client.name} ({client.email})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Billed To Name Input */}
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="billed-to-name" className="text-sm font-semibold">
                            Billed To Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="billed-to-name"
                            type="text"
                            placeholder="Enter the name to display in 'Billed To' section"
                            value={billedToName}
                            onChange={(e) => setBilledToName(e.target.value)}
                            className="w-full"
                        />
                    </div>

                    {/* Statement Date Range Input */}
                    <div className="flex flex-col gap-2">
                        <Label className="text-sm font-semibold">
                            Statement Date Range (Generated Date)
                        </Label>
                        <div className="flex gap-2 items-center">
                            <div className="flex-1 flex flex-col gap-1">
                                <Label htmlFor="statement-date-from" className="text-xs text-gray-600">
                                    From Date
                                </Label>
                                <Input
                                    id="statement-date-from"
                                    type="text"
                                    placeholder="e.g., January 1, 2024"
                                    value={statementDateFrom}
                                    onChange={(e) => setStatementDateFrom(e.target.value)}
                                    className="w-full"
                                />
                            </div>
                            <div className="pt-6 text-gray-500">-</div>
                            <div className="flex-1 flex flex-col gap-1">
                                <Label htmlFor="statement-date-to" className="text-xs text-gray-600">
                                    To Date
                                </Label>
                                <Input
                                    id="statement-date-to"
                                    type="text"
                                    placeholder="e.g., January 31, 2024"
                                    value={statementDateTo}
                                    onChange={(e) => setStatementDateTo(e.target.value)}
                                    className="w-full"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500">
                            These dates will appear in the "Generated:" field in the PDF as "From [date] - To [date]". You can edit them manually.
                        </p>
                    </div>

                    {/* Bank Details Selection */}
                    {savedPaymentInfo.length > 0 ? (
                        <div className="flex flex-col gap-2">
                            <Label className="text-sm font-semibold">
                                Bank Details (Select which saved bank details to include)
                            </Label>
                            <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-3 space-y-3 max-h-60 overflow-y-auto">
                                {savedPaymentInfo.map((paymentInfo) => (
                                    <div 
                                        key={paymentInfo.id}
                                        className="flex items-start gap-3 p-2 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                                    >
                                        <Checkbox
                                            id={`bank-${paymentInfo.id}`}
                                            checked={selectedBankDetails.includes(paymentInfo.id)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setSelectedBankDetails([...selectedBankDetails, paymentInfo.id]);
                                                } else {
                                                    setSelectedBankDetails(selectedBankDetails.filter(id => id !== paymentInfo.id));
                                                }
                                            }}
                                            className="mt-1"
                                        />
                                        <Label 
                                            htmlFor={`bank-${paymentInfo.id}`}
                                            className="flex-1 cursor-pointer"
                                        >
                                            <div className="text-sm">
                                                <p className="font-semibold">{paymentInfo.name || paymentInfo.bankName}</p>
                                                <p className="text-gray-500 text-xs mb-1">Saved: {paymentInfo.savedAt}</p>
                                                <p className="font-medium text-gray-700 dark:text-gray-300">{paymentInfo.bankName}</p>
                                                <p className="text-gray-600 dark:text-gray-400">
                                                    Account: {paymentInfo.accountName}
                                                </p>
                                                <p className="text-gray-600 dark:text-gray-400">
                                                    Account #: {paymentInfo.accountNumber}
                                                </p>
                                                {paymentInfo.iban && (
                                                    <p className="text-gray-600 dark:text-gray-400">
                                                        IBAN: {paymentInfo.iban}
                                                    </p>
                                                )}
                                                {paymentInfo.swiftCode && (
                                                    <p className="text-gray-600 dark:text-gray-400">
                                                        SWIFT: {paymentInfo.swiftCode}
                                                    </p>
                                                )}
                                            </div>
                                        </Label>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500">
                                Select which saved bank details to include in the statement PDF. Only saved payment information is shown here.
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            <Label className="text-sm font-semibold">
                                Bank Details
                            </Label>
                            <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 text-center">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    No saved payment information found. Please save payment information in the invoice form first.
                                </p>
                            </div>
                        </div>
                    )}
                    {/* Table */}
                    <div className="border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-gray-200 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-700">
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase border-r border-gray-300 dark:border-gray-700 whitespace-nowrap">
                                            DATE
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase border-r border-gray-300 dark:border-gray-700 whitespace-nowrap">
                                            INVOICE NO
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase border-r border-gray-300 dark:border-gray-700 whitespace-nowrap">
                                            NAME
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase border-r border-gray-300 dark:border-gray-700 whitespace-nowrap">
                                            ROUTE
                                        </th>
                                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase whitespace-nowrap">
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
                                                className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800/50 bg-white dark:bg-gray-900"
                                            >
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 border-r border-gray-300 dark:border-gray-700 whitespace-nowrap">
                                                    {formattedDate}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 border-r border-gray-300 dark:border-gray-700 whitespace-nowrap">
                                                    {invoice.details.invoiceNumber || "-"}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 border-r border-gray-300 dark:border-gray-700">
                                                    {passengerName}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 border-r border-gray-300 dark:border-gray-700">
                                                    {route}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right font-medium whitespace-nowrap">
                                                    {formatNumberWithCommas(Number(item.total) || 0)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {/* Total Row */}
                                    <tr className="bg-gray-200 dark:bg-gray-800 border-t-2 border-gray-300 dark:border-gray-700 font-bold">
                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 border-r border-gray-300 dark:border-gray-700" colSpan={3}></td>
                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 border-r border-gray-300 dark:border-gray-700">
                                            TOTAL
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right whitespace-nowrap">
                                            {formatNumberWithCommas(totalAmount)} {currency}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
                        <p>Total Invoices: {invoices.length} | Total Amount: {formatNumberWithCommas(totalAmount)} {currency}</p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default StatementPreviewModal;

