import { notFound } from "next/navigation";
import { getProduct } from "@/lib/shop";
import { ProductDetail } from "./ProductDetail";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getProduct(id);
  if (!product) notFound();

  return <ProductDetail product={product} />;
}
