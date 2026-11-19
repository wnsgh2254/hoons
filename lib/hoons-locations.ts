export const HOONS_LOCATIONS = [
  {
    id: 'collective',
    name: 'Hoons Collective',
    suburb: 'Eastwood',
    address: '39 West Parade, Eastwood NSW 2122',
    image: '/images/locations/collective.webp',
    // Photo: Max Vakhtbovych, https://www.pexels.com/photo/photo-of-the-interior-of-a-salon-7750109/
  },
  {
    id: 'the-hoons',
    name: 'The Hoons',
    suburb: 'Eastwood',
    address: '21–25 Rowe Street, Eastwood NSW 2122',
    image: '/images/locations/the-hoons.webp',
    // Photo: Лена Gromakova, https://www.pexels.com/photo/interior-of-hairdresser-saloon-9146943/
  },
  {
    id: 'gallery',
    name: 'Hoons The Gallery',
    suburb: 'Strathfield',
    address: 'Shop 138, 20–34 Albert Road, Strathfield NSW 2135',
    image: '/images/locations/gallery.webp',
    // Photo: Maria Orlova, https://www.pexels.com/photo/modern-hairdressing-salon-interior-design-with-leather-chairs-4969838/
  },
  {
    id: 'ardor',
    name: 'Ardor by Hoons',
    suburb: 'Chatswood',
    address: 'Shop 237, 1 Katherine Street, Chatswood NSW 2067',
    image: '/images/locations/ardor.webp',
    // Photo: Lisa Fotios, https://www.pexels.com/photo/salon-chair-beside-oil-heater-in-front-of-mirror-inside-room-1895701/
  },
] as const;

export type HoonsLocationId = (typeof HOONS_LOCATIONS)[number]['id'];
