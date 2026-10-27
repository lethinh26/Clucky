export type Product = {
  slug: string;
  name: string;
  category: 'Gà rán' | 'Burger' | 'Combo';
  price: number;
  description: string;
  image: string;
  alt: string;
};

export const products: Product[] = [
  { slug: 'ga-ran-truyen-thong', name: 'Gà rán truyền thống', category: 'Gà rán', price: 89000, description: 'Lớp vỏ giòn rụm, thịt gà mềm mọng.', image: 'https://images.unsplash.com/photo-1562967916-eb82221dfb92?auto=format&fit=crop&w=900&q=85', alt: 'Gà rán truyền thống' },
  { slug: 'burger-ga-gion', name: 'Burger gà giòn', category: 'Burger', price: 69000, description: 'Gà giòn, rau tươi và sốt nhà làm.', image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=900&q=85', alt: 'Burger gà giòn' },
  { slug: 'combo-clucky', name: 'Combo Clucky', category: 'Combo', price: 129000, description: 'Một phần gà, khoai và nước cho ngày bận rộn.', image: 'https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?auto=format&fit=crop&w=900&q=85', alt: 'Combo Clucky' },
  { slug: 'ga-cay-mat-ong', name: 'Gà cay mật ong', category: 'Gà rán', price: 99000, description: 'Vị cay nhẹ, thơm ngọt và giòn lâu.', image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=900&q=85', alt: 'Gà cay mật ong' },
  { slug: 'burger-pho-mai-ga', name: 'Burger phô mai gà', category: 'Burger', price: 79000, description: 'Gà giòn, phô mai tan chảy và sốt đặc biệt.', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=85', alt: 'Burger phô mai gà' },
  { slug: 'combo-hai-nguoi', name: 'Combo hai người', category: 'Combo', price: 219000, description: 'Đủ đầy cho một cuộc hẹn thật ngon.', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=900&q=85', alt: 'Combo hai người' },
];

export const formatPrice = (price: number) => `${new Intl.NumberFormat('vi-VN').format(price)}đ`;
export const getProduct = (slug: string) => products.find((product) => product.slug === slug);
