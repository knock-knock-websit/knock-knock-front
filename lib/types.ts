export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  price: number;
  compareAtPrice?: number | null;
  minPrice?: number;
  maxPrice?: number;
  imageUrl?: string | null;
  images?: ProductImage[];
  inventory: number;
  isFavorite: boolean;
  tagType: "popular" | "preorder" | "new" | "none";
  visual: string;
  tone: string;
};

export type ProductImage = {
  id: string;
  imageUrl: string;
  altText: string;
  sortOrder: number;
  isPrimary: boolean;
};

export type ProductColorImage = {
  optionId: string;
  optionName: string;
  imageUrl: string;
};

export type ProductSpecificationOption = {
  id: string;
  name: string;
  sortOrder: number;
};

export type ProductSpecification = {
  id: string;
  name: string;
  sortOrder: number;
  options: ProductSpecificationOption[];
};

export type ProductVariantOptionValue = {
  specificationId: string;
  specificationName: string;
  optionId: string;
  optionName: string;
};

export type ProductVariant = {
  id: string;
  sku: string;
  optionValueIds: string[];
  optionValues: ProductVariantOptionValue[];
  price: number;
  compareAtPrice: number | null;
  stock: number;
  imageUrl: string | null;
  purchasable: boolean;
};

export type CartSpecification = {
  specificationId: string;
  specificationName: string;
  optionId: string;
  optionName: string;
};

export type MemberCartItem = {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  productCategory: string;
  unitPrice: number;
  quantity: number;
  specifications: CartSpecification[];
  totalPrice: number;
  specificationImageUrl: string | null;
  availableStock: number;
  createdAt: string;
  updatedAt: string;
};

export type MemberCart = {
  items: MemberCartItem[];
  totalQuantity: number;
  totalAmount: number;
};

export type ProductDetail = Product & {
  categoryId: string;
  brand: string;
  seoTitle: string;
  seoDescription: string;
  specificationsEnabled: boolean;
  specifications: ProductSpecification[];
  colorImages: ProductColorImage[];
  variants: ProductVariant[];
};

export type ProductPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ProductListResponse = {
  success: boolean;
  message: string;
  data: Product[];
  pagination: ProductPagination;
};

export type ProductCategory = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  level: number;
  sortOrder: number;
  directProductCount: number;
  productCount: number;
  children: ProductCategory[];
};

export type BankTransferSettings = {
  bankCode: string;
  bankName: string;
  branchName: string;
  accountName: string;
  accountNumber: string;
  note: string;
};

export type OrderItem = {
  id: string;
  productId: string;
  variantId: string | null;
  name: string;
  imageUrl: string | null;
  specifications: Array<{ specificationName: string; optionName: string }>;
  price: number;
  quantity: number;
};

export type MemberOrder = {
  id: string;
  orderNo: string;
  memberName: string;
  customerEmail: string;
  recipientName: string;
  recipientPhone: string;
  total: number;
  subtotal: number;
  discount: number;
  shipping: number;
  paymentMethod: string;
  paymentStatus: "pending" | "paid" | "refunded" | "failed";
  shippingStatus: "unfulfilled" | "preparing" | "shipped" | "delivered";
  shippingMethod: string;
  pickupStoreName: string;
  pickupStoreId: string;
  pickupStoreAddress: string;
  pickupStorePhone: string;
  promotionName: string | null;
  couponCode: string | null;
  orderNote: string;
  trackingNo: string;
  bankCode: string;
  bankName: string;
  bankBranchName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankTransferNote: string;
  remittingBank: string;
  transferAccountLastFive: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
};

export type OrderPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CreateOrderResponse = {
  id: string;
  status: "pending";
  total: number;
  currency: "TWD";
  subtotal: number;
  discount: number;
  shipping: number;
  promotion: { id: string; name: string } | null;
  paymentMethod: "bank_transfer";
  bankTransfer: BankTransferSettings;
  items: Array<{
    productId: string;
    variantId: string;
    name: string;
    imageUrl: string | null;
    specifications: Array<{ specificationName: string; optionName: string }>;
    price: number;
    quantity: number;
    total: number;
  }>;
};

export type CheckoutPreview = {
  subtotal: number;
  eligibleAmount: number;
  discount: number;
  shipping: number;
  shippingDiscount: number;
  total: number;
  promotion: { id: string; name: string } | null;
  couponCode: string | null;
  userCouponId: string | null;
};

export type PublicCoupon = {
  id: string;
  name: string;
  description: string;
  discountType: "fixed" | "percentage" | "free_shipping";
  discountValue: number;
  maxDiscount: number | null;
  minOrderAmount: number;
  scopeType: "all" | "products" | "categories";
  startAt: string;
  expiresAt: string;
  remaining: number | null;
  claimed: boolean;
};

export type UserCoupon = PublicCoupon & {
  promotionId: string;
  status: "available" | "used" | "expired";
  receivedAt: string;
  usedAt: string | null;
};

export type PublicCarousel = {
  id: string;
  title: string;
  imageUrl: string;
  description: string;
  linkUrl: string;
};
