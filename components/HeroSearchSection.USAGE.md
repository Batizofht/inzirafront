# HeroSearchSection - Usage Guide

## Quick Start

The `HeroSearchSection` component is a self-contained component that requires no props. Simply import and use it in your page.

### Basic Usage

```tsx
import { HeroSearchSection } from '@/components/HeroSearchSection';

export default function HomePage() {
  return (
    <View>
      <HeroSearchSection />
    </View>
  );
}
```

## Integration Examples

### In a Homepage (app/index.tsx)

```tsx
import { ScrollView, View } from 'react-native';
import { HeroSearchSection } from '@/components/HeroSearchSection';
import { FeaturedVehicles } from '@/components/FeaturedVehicles';
import { PopularCategories } from '@/components/PopularCategories';

export default function Index() {
  return (
    <ScrollView>
      <HeroSearchSection />
      
      <View style={{ paddingHorizontal: 20, paddingVertical: 40 }}>
        <FeaturedVehicles />
        <PopularCategories />
      </View>
    </ScrollView>
  );
}
```

### With Web Layout

```tsx
import { WebLayout } from '@/components/web-layout';
import { HeroSearchSection } from '@/components/HeroSearchSection';

export default function HomePage() {
  return (
    <WebLayout>
      <HeroSearchSection />
      {/* Rest of your content */}
    </WebLayout>
  );
}
```

### With Custom Container

```tsx
import { View, StyleSheet } from 'react-native';
import { HeroSearchSection } from '@/components/HeroSearchSection';

export default function HomePage() {
  return (
    <View style={styles.container}>
      <HeroSearchSection />
      {/* Other sections */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
});
```

## Features in Action

### Search Flow

1. **User selects a brand** → Automatically loads models for that brand
2. **User selects a model** → Model is dependent on brand selection
3. **User selects mileage** → Optional filter
4. **User clicks category** → Pre-selects category for search
5. **User clicks "Search Cars"** → Navigates to `/explore` with filters

### Example Navigation Result

When a user selects:
- Brand: Toyota
- Model: Camry
- Mileage: 50,000 - 100,000 km
- Category: Sedan

The component will navigate to:
```
/explore?brand=Toyota&model=Camry&mileage=50000-100000&category=sedan
```

## API Requirements

### Backend Endpoints Required

Ensure your backend has these endpoints configured:

1. **GET /vehicles/brands**
   ```json
   {
     "status": 200,
     "data": {
       "brands": [
         { "name": "Toyota", "image": "/path/to/image.jpg", "count": 150 },
         { "name": "Honda", "image": "/path/to/image.jpg", "count": 120 }
       ]
     }
   }
   ```

2. **GET /vehicles/models?brand={brand}**
   ```json
   {
     "status": 200,
     "data": {
       "models": ["Camry", "Corolla", "RAV4", "Highlander"]
     }
   }
   ```

3. **GET /categories**
   ```json
   {
     "status": 200,
     "data": {
       "categories": [
         {
           "id": "1",
           "name": "Sedan",
           "slug": "sedan",
           "icon": "🚗",
           "isActive": true,
           "sortOrder": 1
         }
       ]
     }
   }
   ```

## Responsive Behavior

The component automatically adapts to different screen sizes:

### Mobile (<768px)
- Vertical stacked inputs
- Bottom sheet modals for dropdowns
- Touch-optimized spacing

### Tablet (768px - 1024px)
- Horizontal input layout
- Desktop-style dropdowns

### Desktop (≥1024px)
- Maximum width of 1200px
- Centered layout
- Positioned dropdowns

## Theming

The component automatically adapts to light/dark theme:

```tsx
// The component uses useResolvedTheme() internally
// No additional configuration needed

// Light mode: Deep navy gradient
// Dark mode: Blue gradient

// Colors automatically switch based on system/app theme
```

## Troubleshooting

### Dropdowns not appearing on desktop

Make sure the component has enough space below it for dropdowns to appear. The dropdown uses absolute positioning.

```tsx
// Good - enough space
<ScrollView>
  <HeroSearchSection />
  <View style={{ minHeight: 500 }}>
    {/* Content */}
  </View>
</ScrollView>

// Bad - might clip dropdown
<View style={{ height: 400, overflow: 'hidden' }}>
  <HeroSearchSection />
</View>
```

### Models not loading

Check that:
1. Backend endpoint `/vehicles/models?brand={brand}` is working
2. Brand name is passed correctly (case-sensitive)
3. Network connection is stable

### Navigation not working

Ensure you have an `/explore` route defined in your app:

```tsx
// app/explore.tsx or app/explore/index.tsx
export default function ExplorePage() {
  return <View>{/* Your explore page */}</View>;
}
```

## Advanced Customization

If you need to customize the component, you can:

1. **Fork the component** and modify styles
2. **Wrap it** with additional UI elements
3. **Extend it** with additional filters

### Example: Adding a wrapper

```tsx
import { View, StyleSheet } from 'react-native';
import { HeroSearchSection } from '@/components/HeroSearchSection';

export function CustomHero() {
  return (
    <View style={styles.wrapper}>
      <HeroSearchSection />
      
      {/* Add promotional banner below */}
      <View style={styles.banner}>
        <Text>Special Offer: Get 20% off verified vehicles!</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  banner: {
    backgroundColor: '#FFD700',
    padding: 16,
    marginTop: -40,
    marginHorizontal: 20,
    borderRadius: 8,
  },
});
```

## Performance Tips

1. **Lazy load** the component if it's below the fold
2. **Prefetch data** on app start for faster loading
3. **Cache** brand and category data in AsyncStorage

```tsx
// Example: Prefetch data
import { useEffect } from 'react';
import { fetchBrandsWithImages, fetchCategories } from '@/lib/api-vehicles';

export default function App() {
  useEffect(() => {
    // Prefetch data on app start
    fetchBrandsWithImages().catch(console.error);
    fetchCategories().catch(console.error);
  }, []);

  return <HeroSearchSection />;
}
```

## Accessibility

The component includes:
- ✅ Proper touch targets (44x44 minimum)
- ✅ Screen reader labels
- ✅ Keyboard navigation support
- ✅ Color contrast compliance
- ✅ Focus indicators

## Testing

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { HeroSearchSection } from '@/components/HeroSearchSection';

describe('HeroSearchSection', () => {
  it('renders hero title', () => {
    const { getByText } = render(<HeroSearchSection />);
    expect(getByText('Find Your Future Car')).toBeTruthy();
  });

  it('opens brand dropdown on press', () => {
    const { getByText } = render(<HeroSearchSection />);
    const brandInput = getByText('Select Brand');
    fireEvent.press(brandInput);
    // Assert dropdown is visible
  });
});
```

## Migration from Old Hero Component

If you're replacing the old `hero-section.tsx`:

```diff
- import { HeroSection } from '@/components/hero-section';
+ import { HeroSearchSection } from '@/components/HeroSearchSection';

export default function HomePage() {
  return (
-   <HeroSection categories={categories} />
+   <HeroSearchSection />
  );
}
```

Key differences:
- ✨ Self-contained (no props needed)
- ✨ Auto-fetches data internally
- ✨ Better mobile UX with bottom sheets
- ✨ Modern gradient design
- ✨ Improved accessibility

## Support

For issues or questions:
1. Check the [README](./HeroSearchSection.README.md) for detailed documentation
2. Review the component source code for implementation details
3. Check backend API endpoints are properly configured