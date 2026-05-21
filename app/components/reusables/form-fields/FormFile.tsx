"use client";

import { useEffect } from "react";

// RHF
import { useFormContext } from "react-hook-form";

// ShadCn components
import {
    FormField,
    FormItem,
    FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";

// Brand assets
import { DEFAULT_INVOICE_LOGO } from "@/lib/brandAssets";

// Types
import { NameType } from "@/types";

type FormFileProps = {
    name: NameType;
    label?: string;
    placeholder?: string;
};

const FormFile = ({ name, label }: FormFileProps) => {
    const { control, setValue } = useFormContext();

    useEffect(() => {
        setValue(name, DEFAULT_INVOICE_LOGO);
    }, [name, setValue]);

    return (
        <FormField
            control={control}
            name={name}
            render={() => (
                <FormItem>
                    <Label>{label}:</Label>
                    <img
                        id="logoImage"
                        src={DEFAULT_INVOICE_LOGO}
                        style={{
                            objectFit: "contain",
                            width: "10rem",
                            height: "7rem",
                        }}
                        alt="Company logo"
                    />
                    <FormMessage />
                </FormItem>
            )}
        />
    );
};

export default FormFile;
