import { OrderDetailPage } from "@/components/member-pages";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <OrderDetailPage orderId={id} />; }
