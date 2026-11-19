export type ServiceQuote = {
  id: string;
  name: string;
  minutes: number;
  price: number;
  deposit: number;
};

export type DemoService = ServiceQuote & {
  adminId: number;
  category: string;
  description: string | null;
  active: boolean;
  archived?: boolean;
  visibleTo: 'customer' | 'admin' | 'both';
  paymentType?: 'card' | 'cash';
  sortOrder: number;
};

export type DemoServiceAssignment = {
  price: number;
  minutes: number | null;
  active: boolean;
  notes: string | null;
};

export type DemoServiceCatalog = {
  services?: Record<string, DemoService>;
  assignments?: Record<string, Record<string, DemoServiceAssignment | null>>;
  categories?: string[];
};

const SAMPLE_SERVICES = [
  { id: 'cut', name: 'Signature haircut', minutes: 45, price: 80, deposit: 0, category: 'Cut' },
  { id: 'cut-style', name: 'Restyle haircut', minutes: 60, price: 105, deposit: 20, category: 'Cut' },
  { id: 'colour', name: 'Gloss & colour', minutes: 105, price: 165, deposit: 40, category: 'Color' },
  { id: 'perm', name: 'Digital perm', minutes: 150, price: 240, deposit: 60, category: 'Perm' },
  { id: 'fringe', name: 'Fringe trim', minutes: 15, price: 25, deposit: 0, category: 'Cut' },
  { id: 'blow-dry', name: 'Wash & blow-dry', minutes: 45, price: 65, deposit: 0, category: 'Dry' },
  { id: 'root-colour', name: 'Root colour', minutes: 90, price: 130, deposit: 30, category: 'Color' },
  { id: 'scalp-care', name: 'Scalp treatment', minutes: 60, price: 100, deposit: 20, category: 'Clinic' },
];

export const BASE_DEMO_SERVICES: DemoService[] = SAMPLE_SERVICES.map((service, index) => ({
  ...service, adminId: 30_001 + index, description: null, active: true, visibleTo: 'both', sortOrder: index + 1,
}));

const BASE_CATEGORIES = ['Cut', 'Dry', 'Perm', 'Color', 'Clinic', 'Others'];
const EXAMPLE_ASSIGNMENTS: Record<string, Record<string, Partial<DemoServiceAssignment>>> = {
  junho: { cut: {}, 'cut-style': { price: 115 }, colour: {}, fringe: {} },
  mia: { cut: {}, colour: {}, 'root-colour': {}, 'blow-dry': {} },
  lauren: { cut: {}, 'cut-style': {}, 'blow-dry': {}, 'scalp-care': {} },
  director: { cut: { price: 100 }, 'cut-style': {}, perm: {}, colour: {} },
  noah: { cut: {}, colour: {}, 'root-colour': { price: 145 }, perm: {} },
  sophie: { cut: {}, fringe: {}, 'blow-dry': {}, 'scalp-care': { minutes: 70 } },
};

export function demoCatalogServices(catalog: DemoServiceCatalog) {
  const services = new Map(BASE_DEMO_SERVICES.map((service) => [service.id, service]));
  for (const service of Object.values(catalog.services ?? {})) services.set(service.id, service);
  return Array.from(services.values()).sort((a, b) => a.sortOrder - b.sortOrder || a.adminId - b.adminId);
}

export function demoServiceCategories(catalog: DemoServiceCatalog) {
  return [...new Set([
    ...(catalog.categories ?? BASE_CATEGORIES),
    ...demoCatalogServices(catalog).filter(({ archived }) => !archived).map(({ category }) => category),
  ])];
}

export function demoServiceAssignments(catalog: DemoServiceCatalog, staffId: string) {
  const defaults = EXAMPLE_ASSIGNMENTS[staffId] ?? { cut: {} };
  const overrides = catalog.assignments?.[staffId] ?? {};
  return demoCatalogServices(catalog).flatMap((service) => {
    if (service.archived || overrides[service.id] === null) return [];
    const sample = defaults[service.id];
    const override = overrides[service.id];
    if (!sample && !override) return [];
    const assignment: DemoServiceAssignment = override ?? {
      price: service.price, minutes: service.minutes, active: true, notes: null, ...sample,
    };
    return [{ service, assignment }];
  });
}

export function demoServicesForStaff(catalog: DemoServiceCatalog, staffId: string): ServiceQuote[] {
  return demoServiceAssignments(catalog, staffId)
    .filter(({ service, assignment }) => service.active && service.visibleTo !== 'admin' && assignment.active)
    .map(({ service, assignment }) => ({
      id: service.id,
      name: service.name,
      minutes: assignment.minutes ?? service.minutes,
      price: assignment.price,
      deposit: Math.min(service.deposit, assignment.price),
    }));
}
