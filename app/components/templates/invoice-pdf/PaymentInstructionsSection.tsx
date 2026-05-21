import React from "react";
import { InvoiceType } from "@/types";
import { isImageUrl } from "@/lib/helpers";
import { resolveInvoiceSignature } from "@/lib/brandAssets";
import ReceiverSignatureSection from "./ReceiverSignatureSection";

type PaymentInstructionsSectionProps = {
    data: InvoiceType;
};

const PaymentInstructionsSection = ({ data }: PaymentInstructionsSectionProps) => {
    const { sender, details } = data;
    const paymentInfo = details.paymentInformation;
    const showReceiverSection = details.showReceiverSignatureSection ?? false;

    // Handle both single object and array formats
    const paymentInfoArray = Array.isArray(paymentInfo) ? paymentInfo : paymentInfo ? [paymentInfo] : [];
    const hasPaymentInfo = paymentInfoArray.length > 0;
    const signatureSrc = resolveInvoiceSignature(details.signature?.data);
    const hasSignature = !!signatureSrc;

    const renderSignature = () => (
        <div className="flex-shrink-0 ml-auto">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-0.5">
                Authorized Signature
            </p>
            {isImageUrl(signatureSrc) ? (
                <img
                    src={signatureSrc}
                    width={100}
                    height={50}
                    alt={`Signature of ${sender.name}`}
                />
            ) : (
                <p
                    style={{
                        fontSize: 20,
                        fontWeight: 400,
                        fontFamily: `${details.signature?.fontFamily || "Dancing Script"}, cursive`,
                        margin: 0,
                    }}
                >
                    {signatureSrc}
                </p>
            )}
            <p className="text-xs text-gray-600 mt-0.5">{sender.name}</p>
        </div>
    );

    return (
        <div className="mt-3">
            {/* Payment Instructions (if exists) */}
            {hasPaymentInfo && (
                <div className="flex justify-between items-start gap-3 mb-3">
                    <div className="flex flex-col" style={{ maxWidth: '400px' }}>
                        <div className="rounded border border-gray-300 overflow-hidden">
                            {paymentInfoArray.map((info, index, array) => (
                                <div key={index} className={index < array.length - 1 ? "border-b border-gray-300" : ""}>
                                    <div className="p-1.5 text-xs text-gray-700">
                                        <p className="uppercase text-[10px] font-semibold tracking-wider text-gray-500 mb-0.5">
                                            Payment Instructions{array.length > 1 ? ` ${index + 1}` : ''}
                                        </p>
                                        <p className="mb-0 leading-tight">Bank: {info.bankName}</p>
                                        <p className="mb-0 leading-tight">Account Name: {info.accountName}</p>
                                        <p className="mb-0 leading-tight">Account Number: {info.accountNumber}</p>
                                        {info.iban && (
                                            <p className="mb-0 leading-tight">IBAN No: {info.iban}</p>
                                        )}
                                        {info.swiftCode && (
                                            <p className="mb-0 leading-tight">SWIFT Code: {info.swiftCode}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Signature on right (only if receiver section is OFF) */}
                    {hasSignature && !showReceiverSection && renderSignature()}
                </div>
            )}

            {/* Receiver Signature Section + Authorized Signature (comes after payment instructions) */}
            {showReceiverSection && (
                <div className="flex justify-between items-start gap-3">
                    <ReceiverSignatureSection data={data} />
                    {hasSignature && renderSignature()}
                </div>
            )}

            {/* If no payment info and no receiver section, show signature alone */}
            {!hasPaymentInfo && !showReceiverSection && hasSignature && (
                <div className="flex justify-end">
                    {renderSignature()}
                </div>
            )}
        </div>
    );
};

export default PaymentInstructionsSection;

