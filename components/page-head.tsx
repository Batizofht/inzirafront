import React from 'react';
import { isWeb } from '@/lib/platform';

// Head only works on web - dynamically import to avoid native crashes
let Head: React.ComponentType<{ children?: React.ReactNode }> | null = null;
if (isWeb) {
  try {
    const expoRouter = require('expo-router');
    Head = expoRouter.Head || null;
  } catch {
    Head = null;
  }
}

const SafeHead = ({ children }: { children?: React.ReactNode }) => {
  if (!isWeb || !Head) return null;
  return <Head>{children}</Head>;
};

interface PageHeadProps {
  title: string;
  description: string;
  keywords?: string;
  author?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  noIndex?: boolean;
}

export function PageHead({
  title,
  description,
  keywords,
  author = 'Inzira',
  image = 'https://inzira.co/og-image.png',
  url,
  type = 'website',
  noIndex = false,
}: PageHeadProps) {
  const fullTitle = title.includes('Inzira') ? title : `${title} | Inzira`;
  const canonicalUrl = url || 'https://inzira.co';

  return (
    <SafeHead>
      {/* Primary Meta */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="author" content={author} />
      <meta name="robots" content={noIndex ? 'noindex, nofollow' : 'index, follow'} />

      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="Inzira" />
      <meta property="og:locale" content="en_RW" />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={canonicalUrl} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />
      <meta property="twitter:site" content="@inzirarw" />
      <meta property="twitter:creator" content="@inzirarw" />

      {/* Article specific (if type is article) */}
      {type === 'article' && (
        <>
          <meta property="article:publisher" content="https://facebook.com/inzirarw" />
          <meta property="article:author" content="https://inzira.co" />
        </>
      )}
    </SafeHead>
  );
}

// Pre-configured page heads for common pages
export const HomeSEO = () => (
  <PageHead
    title="Inzira - Rwanda's #1 Verified Car Marketplace"
    description="Buy and sell cars, motorcycles, and vehicles in Rwanda. Browse verified listings from trusted sellers. Find your dream vehicle today!"
    keywords="cars rwanda, buy car rwanda, sell car rwanda, vehicle marketplace, used cars, new cars, motorcycles, car dealer, Kigali"
    url="https://inzira.co/"
  />
);

export const ExploreSEO = () => (
  <PageHead
    title="Explore Vehicles - Browse Cars, Motorcycles & More"
    description="Explore thousands of verified vehicle listings in Rwanda. Filter by category, price, brand, and location to find your perfect match."
    keywords="browse cars, vehicle listings, cars for sale, motorcycles rwanda, vehicle search"
    url="https://inzira.co/explore"
  />
);

export const SearchSEO = ({ query }: { query?: string }) => (
  <PageHead
    title={query ? `Search: ${query} - Inzira` : "Search Vehicles - Inzira"}
    description={query ? `Search results for "${query}" on Inzira. Find cars, motorcycles and vehicles in Rwanda.` : "Search for cars, motorcycles, and vehicles in Rwanda. Advanced filters to find exactly what you need."}
    keywords="search cars, find vehicles, car search rwanda"
    url="https://inzira.co/search"
    noIndex={!!query} // No-index search result pages with queries
  />
);

export const SellSEO = () => (
  <PageHead
    title="Sell Your Vehicle - Free Listing on Inzira"
    description="Sell your car, motorcycle, or vehicle in Rwanda. Create a free listing and reach thousands of potential buyers. Get the best price for your vehicle."
    keywords="sell car rwanda, sell motorcycle, vehicle listing, car seller, sell my car"
    url="https://inzira.co/sell"
  />
);

export const ServicesSEO = () => (
  <PageHead
    title="Our Services - Vehicle Marketplace Solutions"
    description="Discover Inzira services for buyers and sellers. Vehicle verification, featured listings, premium subscriptions, and secure transactions."
    keywords="vehicle marketplace services, car verification, featured listings, premium services"
    url="https://inzira.co/services"
  />
);

export const AboutSEO = () => (
  <PageHead
    title="About Us - Rwanda's Premier Vehicle Marketplace"
    description="Learn about Inzira, Rwanda's #1 Verified Car Marketplace. Our mission is to revolutionize buying and selling vehicles with trust and transparency."
    keywords="about inzira, vehicle marketplace rwanda, car company, about us"
    url="https://inzira.co/about"
  />
);

export const ContactSEO = () => (
  <PageHead
    title="Contact Us - Get in Touch with Inzira"
    description="Contact Inzira for support, partnerships, or inquiries. We're here to help with your vehicle buying and selling needs in Rwanda."
    keywords="contact inzira, support, help, customer service"
    url="https://inzira.co/contact"
  />
);

export const SupportSEO = () => (
  <PageHead
    title="Help & Support - Inzira Customer Service"
    description="Get help with buying, selling, and using Inzira. Browse FAQs, guides, and contact our support team for assistance."
    keywords="inzira help, support, faq, how to sell car, how to buy car"
    url="https://inzira.co/support"
  />
);

export const InsuranceSEO = () => (
  <PageHead
    title="Vehicle Insurance - Protect Your Car in Rwanda | Inzira"
    description="Get comprehensive vehicle insurance coverage in Rwanda. Third party, comprehensive, and third party+ options available. Protect your investment with trusted partners through Inzira."
    keywords="vehicle insurance rwanda, car insurance kigali, comprehensive coverage, third party insurance, inzira insurance"
    url="https://inzira.co/insurance"
  />
);

export const LoginSEO = () => (
  <PageHead
    title="Sign In - Access Your Inzira Account"
    description="Sign in to your Inzira account to buy or sell vehicles in Rwanda. New users can register for free."
    noIndex={true}
    url="https://inzira.co/auth/login"
  />
);

export const RegisterSEO = () => (
  <PageHead
    title="Create Account - Join Inzira Today"
    description="Create your free Inzira account. Start buying or selling vehicles in Rwanda's premier marketplace."
    noIndex={true}
    url="https://inzira.co/auth/register"
  />
);

// Dynamic vehicle page SEO
export const VehicleSEO = ({
  title,
  brand,
  model,
  year,
  price,
  description,
  image,
  id,
}: {
  title: string;
  brand: string;
  model: string;
  year: number | string;
  price: number;
  description?: string;
  image?: string;
  id: string;
}) => {
  const seoTitle = `${year} ${brand} ${model} - $${price.toLocaleString()} | Inzira`;
  const seoDescription = description || `Buy ${year} ${brand} ${model} for $${price.toLocaleString()}. Verified listing on Inzira - Rwanda's #1 Verified Car Marketplace.`;
  const seoImage = image || 'https://inzira.co/og-image.png';

  return (
    <PageHead
      title={seoTitle}
      description={seoDescription.slice(0, 160)}
      keywords={`${brand} ${model}, ${year} ${brand}, buy ${brand} rwanda, ${brand} for sale, used ${brand}, car listing`}
      image={seoImage}
      url={`https://inzira.co/vehicle/${id}`}
      type="product"
    />
  );
};

// Dynamic category page SEO
export const CategorySEO = ({
  category,
  slug,
  count,
}: {
  category: string;
  slug: string;
  count?: number;
}) => {
  const countText = count ? `${count}+ ` : '';
  
  return (
    <PageHead
      title={`${category} for Sale in Rwanda - ${countText}Listings | Inzira`}
      description={`Browse ${countText}${category.toLowerCase()} listings in Rwanda. Find verified sellers and great deals on ${category.toLowerCase()}.`}
      keywords={`${category.toLowerCase()} rwanda, buy ${category.toLowerCase()}, ${category.toLowerCase()} for sale, ${slug} listings`}
      url={`https://inzira.co/category/${slug}`}
    />
  );
};
