import { TravelItem } from '@/components/travel/TravelCard';

export const travelCategories = [
  'All',
  'Beaches',
  'Mountains',
  'City',
  'Historic',
  'Adventure',
];

export const travelItems: TravelItem[] = [
  {
    id: '1',
    title: 'Bali Escape',
    location: 'Bali, Indonesia',
    image: { uri: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80&auto=format&fit=crop' },
    price: '$899',
    rating: 4.8,
    category: 'Beaches',
  },
  {
    id: '2',
    title: 'Swiss Alps Retreat',
    location: 'Zermatt, Switzerland',
    image: { uri: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80&auto=format&fit=crop' },
    price: '$1299',
    rating: 4.9,
    category: 'Mountains',
  },
  {
    id: '3',
    title: 'Tokyo Nights',
    location: 'Tokyo, Japan',
    image: { uri: 'https://images.unsplash.com/photo-1498654200943-1088dd4438ae?w=1200&q=80&auto=format&fit=crop' },
    price: '$1099',
    rating: 4.7,
    category: 'City',
  },
  {
    id: '4',
    title: 'Machu Picchu Trek',
    location: 'Cusco, Peru',
    image: { uri: 'https://images.unsplash.com/photo-1549887534-1541e932d7f7?w=1200&q=80&auto=format&fit=crop' },
    price: '$1399',
    rating: 4.9,
    category: 'Historic',
  },
  {
    id: '5',
    title: 'Sahara Adventure',
    location: 'Merzouga, Morocco',
    image: { uri: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80&auto=format&fit=crop' },
    price: '$999',
    rating: 4.6,
    category: 'Adventure',
  },
];
