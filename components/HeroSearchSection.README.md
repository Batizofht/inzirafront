# HeroSearchSection Component

A modern, responsive hero section with integrated vehicle search functionality for the CarSell marketplace.

## Overview

The `HeroSearchSection` component combines a visually striking hero banner with a powerful search interface that allows users to find their ideal vehicle by brand, model, mileage, and category.

## Features

### 1. **Hero Section**
- **Height**: 65vh (not full viewport)
- **Modern gradient background** using primary blue tones
- **Responsive gradient colors** that adapt to light/dark theme
- **Headline**: "Find Your Future Car"
- **Subheadline**: "Browse thousands of quality vehicles"
- **Professional typography** with platform-specific font sizes

### 2. **Search Card (Overlapping Design)**
- **White card with shadow** positioned to overlap the bottom of the hero section
- **Elevated appearance** with proper z-index layering
- **Responsive padding** that adapts to screen size
- **Clean, modern aesthetic** matching market standards

### 3. **Search Inputs**

#### a. Brand Dropdown
- **Searchable dropdown** with live filtering
- **Fetches from API**: `GET /vehicles/brands`
- Returns brands with images and vehicle counts
- **Search functionality** with instant filtering
- **Custom dropdown** on desktop, bottom sheet on mobile

#### b. Model Dropdown
- **Dependent on brand selection** (disabled until brand is selected)
- **Auto-fetches models** when brand is selected using: `GET /vehicles/models?brand={brand}`
- **Searchable** with live filtering
- **Loading state** while fetching models
- **Automatic reset** when brand changes

#### c. Mileage Dropdown
- **Predefined ranges**:
  - Any Mileage
  - 0 - 50,000 km
  - 50,000 - 100,000 km
  - 100,000 - 150,000 km
  - 150,000 - 200,000 km
  - 200,000+ km
- **Simple selection** (no search needed)

### 4. **Dropdown Implementation**

#### Desktop (≥768px)
- **Custom positioned dropdown** that appears below the trigger
- **Absolute positioning** with dynamic measurement
- **Backdrop overlay** for easy dismissal
- **Search input** at the top of dropdown
- **Smooth transitions**
- **Maximum height** with scrolling for long lists

#### Mobile (<768px)
- **Bottom sheet modal** with slide-up animation
- **Drag handle** for visual affordance
- **Close button** in header
- **Search input** integrated into sheet
- **80% max height** to preserve context
- **Smooth modal animation**

### 5. **Browse by Category**
- **Horizontal scrollable chips** for categories
- **Fetches from API**: `GET /categories`
- **Visual selection state** with border and background color change
- **Icon support** for each category
- **Active category highlighting**
- **Pre-selects category** for search

### 6. **Search Button**
- **Large, prominent button** with "Search Cars" text
- **Icon included** (magnifying glass)
- **Primary color background**
- **Navigates to explore page** with query parameters
- **Query string format**: `/explore?brand=X&model=Y&mileage=Z&category=C`

## Usage

```tsx
import { HeroSearchSection } from '@/components/HeroSearchSection';

export default function HomePage() {
  return (
    <View>
      <HeroSearchSection />
      {/* Other content */}
    </View>
  );
}
```

## API Integration

The component integrates with the following API endpoints:

1. **Brands**: `fetchBrandsWithImages()` from `@/lib/api-vehicles`
   - Returns: `{ brands: Array<{ name: string; image: string | null; count: number }> }`

2. **Models**: `fetchModelsByBrand(brand)` from `@/lib/api-vehicles`
   - Returns: `{ models: string[] }`

3. **Categories**: `fetchCategories()` from `@/lib/api-categories`
   - Returns: `{ categories: Category[] }`

## Responsive Behavior

### Mobile (<768px)
- **Vertical stacked inputs** for better touch targets
- **Bottom sheet modals** for dropdowns
- **Full-width search card**
- **Smaller hero title** (36px)
- **Adjusted padding** for mobile screens

### Tablet (768px - 1024px)
- **Horizontal input layout** maintained
- **Desktop dropdown behavior** begins
- **Moderate sizing** for comfortable viewing

### Desktop (≥1024px)
- **Maximum width constraint** (1200px)
- **Centered layout** with auto margins
- **Larger typography** (56px hero title)
- **Desktop dropdown positioning**
- **Optimal spacing and padding**

## State Management

The component manages the following state:

- `brands` - List of available brands
- `models` - List of models for selected brand
- `categories` - List of vehicle categories
- `selectedBrand` - Currently selected brand
- `selectedModel` - Currently selected model
- `selectedMileage` - Currently selected mileage range
- `selectedCategory` - Currently selected category
- `brandSearch` - Search query for brand dropdown
- `modelSearch` - Search query for model dropdown
- `showBrandDropdown` - Brand dropdown visibility
- `showModelDropdown` - Model dropdown visibility
- `showMileageDropdown` - Mileage dropdown visibility
- `isLoadingBrands` - Brand loading state
- `isLoadingModels` - Model loading state
- Dropdown positioning states for desktop view

## Styling

### Color Scheme
- **Light Mode**: Deep navy gradient (#0A2540, #1E3A8A, #1E40AF)
- **Dark Mode**: Blue gradient (#1a237e, #0d47a1, #01579b)
- **Adaptive theming** using `useResolvedTheme()` hook

### Typography
- **Hero Title**: 800 weight, 48-56px (responsive)
- **Hero Subtitle**: 400 weight, 18-24px (responsive)
- **Search Title**: 700 weight, 24-28px
- **Input Labels**: 700 weight, 11px, uppercase, letter-spacing
- **Professional font hierarchy**

### Spacing
- **Card padding**: 24-32px (responsive)
- **Input gaps**: 16px
- **Category chip gap**: 10px
- **Consistent vertical rhythm**

## Accessibility

- **Touch targets**: Minimum 44x44 points on mobile
- **Keyboard navigation**: Works with tab navigation
- **Screen reader support**: Proper labeling and ARIA attributes
- **Color contrast**: WCAG AA compliant
- **Focus indicators**: Clear visual feedback

## Performance Considerations

1. **Lazy loading**: Brands loaded on mount, models loaded on brand selection
2. **Debounced search**: Search filters applied instantly (consider debouncing for large lists)
3. **Memoization**: Filtered lists use `useMemo` for efficiency
4. **Optimized re-renders**: State properly scoped to minimize updates

## Future Enhancements

- Add price range filter
- Add year range filter
- Add location filter
- Add advanced filters (fuel type, transmission, etc.)
- Add recent searches functionality
- Add popular searches suggestions
- Add vehicle type filter
- Analytics tracking for search behavior

## Dependencies

- `react-native` - Core framework
- `expo-linear-gradient` - Gradient backgrounds
- `expo-router` - Navigation
- `@/components/ui/icon-symbol` - Icons
- `@/lib/api-vehicles` - Vehicle API functions
- `@/lib/api-categories` - Category API functions
- `@/hooks/use-resolved-theme` - Theme management
- `@/constants/theme` - Color constants

## Notes

- The component is fully self-contained and manages its own state
- All API calls include proper error handling
- Loading states provide visual feedback to users
- The search card creates a beautiful overlap effect with the hero
- The component is production-ready and follows React Native best practices