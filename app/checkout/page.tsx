import { Suspense } from "react";
import CheckoutPage from "@/components/checkout-page";

export const metadata = { title: "結帳" };
export default function CheckoutRoute() { return <Suspense><CheckoutPage /></Suspense>; }
