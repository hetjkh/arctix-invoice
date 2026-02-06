import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { PaymentInfoDocument } from "@/models/PaymentInfo";
import { ObjectId } from "mongodb";

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser(req);

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id } = await params;
        const db = await getDb();
        const paymentInfoCollection = db.collection<PaymentInfoDocument>("paymentInfo");

        const result = await paymentInfoCollection.deleteOne({
            _id: new ObjectId(id),
            userId: new ObjectId(user.userId),
        });

        if (result.deletedCount === 0) {
            return NextResponse.json(
                { error: "Payment information not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { message: "Payment information deleted successfully" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Delete payment info error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

