import { ObjectId } from "mongodb";
import { InvoiceType } from "@/types";

type BankDetail = {
    bankName: string;
    accountName: string;
    accountNumber: string;
    iban?: string;
    swiftCode?: string;
};

export interface StatementDocument {
    _id?: ObjectId;
    userId: ObjectId;
    clientId?: ObjectId; // Reference to client
    clientEmail: string; // Client email for filtering
    title?: string;
    billedToName?: string; // Name to display in "Billed To" section
    statementDateFrom?: string; // Custom "from" date to display in "Generated:" field
    statementDateTo?: string; // Custom "to" date to display in "Generated:" field
    bankDetails?: BankDetail[]; // Selected bank details to display
    invoices: InvoiceType[];
    createdAt: Date;
    updatedAt: Date;
}

