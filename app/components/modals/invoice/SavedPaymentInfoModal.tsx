"use client";

import { useState, useEffect } from "react";

// ShadCn
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

// Components
import { SavedPaymentInfoList } from "@/app/components";

// Contexts
import { useAuth } from "@/contexts/AuthContext";

// Variables
import { LOCAL_STORAGE_SAVED_PAYMENT_INFO_KEY } from "@/lib/variables";

// Types
import { InvoiceType } from "@/types";

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

type SavedPaymentInfoModalProps = {
    children: React.ReactNode;
    onLoad: (paymentInfo: PaymentInfoType) => void;
};

const SavedPaymentInfoModal = ({
    children,
    onLoad,
}: SavedPaymentInfoModalProps) => {
    const [open, setOpen] = useState(false);
    const [savedPaymentInfo, setSavedPaymentInfo] = useState<PaymentInfoType[]>(
        []
    );

    const { user } = useAuth();

    useEffect(() => {
        const loadPaymentInfo = async () => {
            if (user) {
                // Load from MongoDB
                try {
                    const response = await fetch("/api/payment-info/list");
                    if (response.ok) {
                        const data = await response.json();
                        setSavedPaymentInfo(data.paymentInfo || []);
                    } else {
                        setSavedPaymentInfo([]);
                    }
                } catch (error) {
                    console.error("Error loading payment info:", error);
                    setSavedPaymentInfo([]);
                }
            } else {
                // Fallback to localStorage if not logged in
                if (typeof window !== "undefined") {
                    const saved = window.localStorage.getItem(
                        LOCAL_STORAGE_SAVED_PAYMENT_INFO_KEY
                    );
                    if (saved) {
                        try {
                            setSavedPaymentInfo(JSON.parse(saved));
                        } catch {
                            setSavedPaymentInfo([]);
                        }
                    }
                }
            }
        };

        if (open) {
            loadPaymentInfo();
        }
    }, [open, user]);

    const handleDelete = async (id: string) => {
        if (user) {
            // Delete from MongoDB
            try {
                const response = await fetch(`/api/payment-info/${id}`, {
                    method: "DELETE",
                });
                if (response.ok) {
                    const updated = savedPaymentInfo.filter((info) => info.id !== id);
                    setSavedPaymentInfo(updated);
                } else {
                    alert("Failed to delete payment information");
                }
            } catch (error) {
                console.error("Error deleting payment info:", error);
                alert("Failed to delete payment information");
            }
        } else {
            // Fallback to localStorage if not logged in
            const updated = savedPaymentInfo.filter((info) => info.id !== id);
            setSavedPaymentInfo(updated);
            if (typeof window !== "undefined") {
                window.localStorage.setItem(
                    LOCAL_STORAGE_SAVED_PAYMENT_INFO_KEY,
                    JSON.stringify(updated)
                );
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Saved Payment Information</DialogTitle>
                    <DialogDescription>
                        Select a saved payment information to load into the form
                    </DialogDescription>
                </DialogHeader>

                <SavedPaymentInfoList
                    savedPaymentInfo={savedPaymentInfo}
                    onLoad={onLoad}
                    onDelete={handleDelete}
                    setModalState={setOpen}
                />
            </DialogContent>
        </Dialog>
    );
};

export default SavedPaymentInfoModal;

