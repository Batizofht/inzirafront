import React from 'react';
import { Platform } from 'react-native';

interface VehicleStructuredDataProps {
  vehicle: {
    title: string;
    brand: string;
    model: string;
    year: number | string;
    price: number;
    description?: string;
    images?: string[];
    location?: string;
    mileage?: string;
    fuelType?: string;
    url: string;
  };
}

export function VehicleStructuredData({ vehicle }: VehicleStructuredDataProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Car',
    name: vehicle.title,
    brand: {
      '@type': 'Brand',
      name: vehicle.brand,
    },
    model: vehicle.model,
    vehicleModelDate: vehicle.year,
    offers: {
      '@type': 'Offer',
      price: vehicle.price,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: vehicle.url,
    },
    image: vehicle.images?.[0],
    description: vehicle.description,
    fuelType: vehicle.fuelType,
    mileageFromOdometer: vehicle.mileage
      ? {
          '@type': 'QuantitativeValue',
          value: vehicle.mileage.replace(/\D/g, ''),
          unitCode: 'KMT',
        }
      : undefined,
    areaServed: vehicle.location
      ? {
          '@type': 'Place',
          name: vehicle.location,
        }
      : undefined,
  };

  // Only render structured data on web platform
  if (Platform.OS !== 'web') return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

interface LocalBusinessStructuredDataProps {
  name?: string;
  description?: string;
  url?: string;
  telephone?: string;
  email?: string;
  address?: {
    street?: string;
    city: string;
    country: string;
  };
}

export function LocalBusinessStructuredData({
  name = 'Inzira',
  description = "Rwanda's #1 Verified Car Marketplace",
  url = 'https://inzira.co',
  telephone = '+250788378766',
  email = 'support@inzira.co',
  address = { city: 'Kigali', country: 'Rwanda' },
}: LocalBusinessStructuredDataProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': url,
    name,
    description,
    url,
    telephone,
    email,
    address: {
      '@type': 'PostalAddress',
      addressLocality: address.city,
      addressCountry: address.country,
    },
    priceRange: '$$$',
    areaServed: {
      '@type': 'Country',
      name: 'Rwanda',
    },
    sameAs: [
      'https://facebook.com/inzirarw',
      'https://twitter.com/inzirarw',
      'https://instagram.com/inzirarw',
    ],
  };

  // Only render structured data on web platform
  if (Platform.OS !== 'web') return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

// SEO Helper to generate page-specific meta tags as an object
// Use this in your page components to pass to head or meta tags
export function generateSEOMeta({
  title,
  description,
  image = 'https://inzira.co/og-image.jpg',
  url = 'https://inzira.co',
}: {
  title: string;
  description: string;
  image?: string;
  url?: string;
}) {
  const fullTitle = title.includes('Inzira') ? title : `${title} | Inzira`;

  return {
    title: fullTitle,
    description,
    openGraph: {
      title: fullTitle,
      description,
      image,
      url,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      image,
    },
  };
}
