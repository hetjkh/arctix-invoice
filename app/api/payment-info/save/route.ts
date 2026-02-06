import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { PaymentInfoDocument, PaymentInfoInput } from "@/models/PaymentInfo";
import { ObjectId } from "mongodb";

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser(req);

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const paymentInfoData: PaymentInfoInput = await req.json();

        // Validate required fields
        if (!paymentInfoData.bankName || !paymentInfoData.accountName || !paymentInfoData.accountNumber) {
            return NextResponse.json(
                { error: "Bank name, account name, and account number are required" },
                { status: 400 }
            );
        }

        const db = await getDb();
        const paymentInfoCollection = db.collection<PaymentInfoDocument>("paymentInfo");

        const now = new Date();

        // Create new payment info
        const newPaymentInfo: PaymentInfoDocument = {
            userId: new ObjectId(user.userId),
            name: paymentInfoData.name || `${paymentInfoData.bankName} - ${paymentInfoData.accountName}`,
            bankName: paymentInfoData.bankName,
            accountName: paymentInfoData.accountName,
            accountNumber: paymentInfoData.accountNumber,
            iban: paymentInfoData.iban,
            swiftCode: paymentInfoData.swiftCode,
            createdAt: now,
            updatedAt: now,
        };

        const result = await paymentInfoCollection.insertOne(newPaymentInfo);

        return NextResponse.json(
            {
                message: "Payment information saved successfully",
                paymentInfoId: result.insertedId.toString(),
                paymentInfo: {
                    id: result.insertedId.toString(),
                    name: newPaymentInfo.name,
                    bankName: newPaymentInfo.bankName,
                    accountName: newPaymentInfo.accountName,
                    accountNumber: newPaymentInfo.accountNumber,
                    iban: newPaymentInfo.iban,
                    swiftCode: newPaymentInfo.swiftCode,
                    savedAt: newPaymentInfo.createdAt.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                    }),
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Save payment info error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

