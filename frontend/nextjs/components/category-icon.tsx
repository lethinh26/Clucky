import React from 'react';

export type CategoryKey = 'all' | 'chicken' | 'burger' | 'combo' | 'sides' | 'drinks';

export interface CategoryIconProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'id'> {
  name?: CategoryKey | string;
  id?: number | string;
  categoryId?: number;
  size?: number;
  active?: boolean;
  activeTheme?: 'on-dark' | 'on-light';
}

export const categoryIconMap: Record<number, CategoryKey> = {
  0: 'all',
  1: 'chicken',
  2: 'burger',
  3: 'combo',
  4: 'sides',
  5: 'drinks',
};

const categoryNameMap: Record<string, CategoryKey> = {
  'all': 'all',
  'tất cả': 'all',
  'chicken': 'chicken',
  'gà rán': 'chicken',
  'burger': 'burger',
  'combo': 'combo',
  'sides': 'sides',
  'món phụ': 'sides',
  'drinks': 'drinks',
  'đồ uống': 'drinks',
};

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  name,
  id,
  categoryId,
  size = 20,
  active = false,
  activeTheme = 'on-dark',
  className = '',
  style,
  alt,
  ...restProps
}) => {
  let resolvedKey: CategoryKey = 'all';
  const numId = typeof id === 'number' ? id : typeof categoryId === 'number' ? categoryId : Number(id);
  if (!isNaN(numId) && categoryIconMap[numId]) {
    resolvedKey = categoryIconMap[numId];
  } else if (name) {
    const normalized = String(name).trim().toLowerCase();
    if (categoryNameMap[normalized]) {
      resolvedKey = categoryNameMap[normalized];
    } else if ((['all', 'chicken', 'burger', 'combo', 'sides', 'drinks'] as CategoryKey[]).includes(name as CategoryKey)) {
      resolvedKey = name as CategoryKey;
    }
  }

  let defaultFilter = 'drop-shadow(0 2px 4px rgba(22, 16, 13, 0.08))';
  let defaultOpacity = 1;
  let defaultTransform = 'scale(1)';

  if (activeTheme === 'on-light') {
    if (active) {
      defaultFilter = 'drop-shadow(0 2px 5px rgba(143, 18, 22, 0.18))';
      defaultTransform = 'scale(1.08)';
      defaultOpacity = 1;
    } else {
      defaultFilter = 'drop-shadow(0 1px 2px rgba(22, 16, 13, 0.05))';
      defaultOpacity = 0.65;
      defaultTransform = 'scale(1)';
    }
  } else if (active) {
    // on-dark theme: active state turns to crisp white
    defaultFilter = 'brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.25))';
  }

  return (
    <img
      src={`/icons/categories/${resolvedKey}.svg`}
      alt={alt || `Biểu tượng ${resolvedKey}`}
      width={size}
      height={size}
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        filter: defaultFilter,
        opacity: defaultOpacity,
        transform: defaultTransform,
        transition: 'filter 0.2s ease, opacity 0.2s ease, transform 0.2s ease',
        ...style,
      }}
      {...restProps}
    />
  );
};

export default CategoryIcon;
