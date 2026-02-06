import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { PaymentInfoDocument } from "@/models/PaymentInfo";
import { ObjectId } from "mongodb";
import { SHORT_DATE_OPTIONS } from "@/lib/variables";

export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser(req);

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const db = await getDb();
        const paymentInfoCollection = db.collection<PaymentInfoDocument>("paymentInfo");

        const paymentInfoList = await paymentInfoCollection
            .find({ userId: new ObjectId(user.userId) })
            .sort({ createdAt: -1 })
            .toArray();

        // Format payment info for response
        const formattedPaymentInfo = paymentInfoList.map((info) => {
            const { _id, userId, createdAt, updatedAt, ...paymentInfoData } = info;
            return {
                id: _id!.toString(),
                name: paymentInfoData.name,
                bankName: paymentInfoData.bankName,
                accountName: paymentInfoData.accountName,
                accountNumber: paymentInfoData.accountNumber,
                iban: paymentInfoData.iban,
                swiftCode: paymentInfoData.swiftCode,
                savedAt: createdAt.toLocaleDateString("en-US", SHORT_DATE_OPTIONS),
            };
        });

        return NextResponse.json(
            { paymentInfo: formattedPaymentInfo },
            { status: 200 }
        );
    } catch (error) {
        console.error("Get payment info error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

