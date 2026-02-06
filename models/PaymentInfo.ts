import { ObjectId } from "mongodb";

export interface PaymentInfoDocument {
    _id?: ObjectId;
    userId: ObjectId;
    name: string;
    bankName: string;
    accountName: string;
    accountNumber: string;
    iban?: string;
    swiftCode?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface PaymentInfoInput {
    name: string;
    bankName: string;
    accountName: string;
    accountNumber: string;
    iban?: string;
    swiftCode?: string;
}

