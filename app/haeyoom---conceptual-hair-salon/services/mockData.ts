import { Shop, Service, Designer, TimeSlot } from '../types';

export const SHOPS: Shop[] = [
  {
    id: 'shop_meadowbank',
    name: 'HAEYOOM Meadowbank',
    address: 'SHEPHERDS BAY PLAZA, Level LG, SHOP 6.11/11A Bay Dr, Meadowbank NSW 2114',
    phone: '02-555-0123',
    hours: '10:00 - 20:00',
    image: 'https://i.pinimg.com/1200x/24/78/0d/24780ddba9bd63fc622543639c163940.jpg',
  },
  {
    id: 'shop_haymarket',
    name: 'HAEYOOM Haymarket',
    address: 'Shop4, 770 George St, Sydney NSW 2000',
    phone: '02-790-0987',
    hours: '10:00 - 19:00',
    image: 'https://i.pinimg.com/1200x/10/48/a2/1048a22becabf97a20d9cab8c2f9a2e6.jpg',
  },
];

export const SERVICES: Service[] = [
  { id: 'cut_basic', name: 'Design Cut', price: 65, durationMin: 60, category: 'Cut', isActive: true },
  { id: 'cut_premium', name: 'Architectural Cut', price: 110, durationMin: 90, category: 'Cut', isActive: true },
  { id: 'perm_basic', name: 'Digital Perm', price: 300, durationMin: 180, category: 'Perm', isActive: true },
  { id: 'color_full', name: 'Full Color', price: 220, durationMin: 120, category: 'Color', isActive: true },
  { id: 'care_head', name: 'Head Spa', price: 150, durationMin: 60, category: 'Care', isActive: true },
];

export const DESIGNERS: Designer[] = [
  {
    id: 'des_1',
    shopId: 'shop_gangnam',
    name: 'KIM MIN-JUN',
    role: 'Director',
    profileImage: 'https://i.pinimg.com/736x/d8/44/7c/d8447c644a6a8cef4cd2612cc51608f6.jpg',
    description: 'Expert in structural cuts and modern texture.',
    specialties: ['Architectural Cut', 'Texture Perm'],
  },
  {
    id: 'des_2',
    shopId: 'shop_gangnam',
    name: 'LEE SEO-YUN',
    role: 'Senior Stylist',
    profileImage: 'https://i.pinimg.com/1200x/50/ea/43/50ea43053ac7ced97256cb97cb2f6087.jpg',
    description: 'Specializes in color correction and soft aesthetics.',
    specialties: ['Personal Color', 'Layered Cut'],
  },
  {
    id: 'des_3',
    shopId: 'shop_hannam',
    name: 'PARK JI-HO',
    role: 'Chief Director',
    profileImage: 'https://i.pinimg.com/736x/1b/2d/96/1b2d96a2fe7d31acb7caf804ab3dfd30.jpg',
    description: 'Creating timeless beauty with minimal touch.',
    specialties: ['Classic Cut', 'Volume Perm'],
  },
];

export const generateTimeSlots = (): TimeSlot[] => {
  const times = [];
  for (let i = 10; i < 20; i++) {
    times.push({ time: `${i}:00`, available: Math.random() > 0.3 });
    times.push({ time: `${i}:30`, available: Math.random() > 0.3 });
  }
  return times;
};