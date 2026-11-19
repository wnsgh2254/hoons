'use client';

import { editDemoCatalog, readHoonsDemo } from './hoons-booking-demo';
import { demoCatalogServices, demoServiceAssignments, demoServiceCategories, type DemoService, type DemoServiceAssignment } from './hoons-demo-services';
import { hoonsAdminStaff } from './hoons-staff-preview';

function adminService(service: DemoService) {
  return {
    id: service.adminId,
    name: service.paymentType ? `${service.name} (${service.paymentType})` : service.name,
    category: service.category,
    price: service.price,
    duration_minutes: service.minutes,
    is_active: service.active,
    visible_to: service.visibleTo,
    description: service.description,
    shop_id: null,
    sort_order: service.sortOrder,
    created_at: '',
  };
}

export function hoonsAdminServices() {
  return demoCatalogServices(readHoonsDemo().catalog).filter(({ archived }) => !archived).map(adminService);
}

function assignmentRows() {
  const state = readHoonsDemo();
  return hoonsAdminStaff(state).filter(({ is_active }) => is_active).flatMap((member) =>
    demoServiceAssignments(state.catalog, member.staffKey).map(({ service, assignment }) => ({
      id: member.id * 1_000_000 + service.adminId,
      designer_id: member.id,
      service_id: service.adminId,
      price: assignment.price,
      duration_minutes: assignment.minutes,
      is_active: assignment.active,
      notes: assignment.notes,
      services: adminService(service),
      staffKey: member.staffKey,
      serviceKey: service.id,
    })),
  );
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function serviceUpdate(current: DemoService, body: Record<string, unknown>): DemoService {
  const rawName = typeof body.name === 'string' ? body.name.trim() : current.name;
  const suffix = /\s*\((card|cash)\)$/i.exec(rawName);
  const name = rawName.replace(/\s*\((card|cash)\)$/i, '').trim();
  const price = numberValue(body.price, current.price);
  const minutes = numberValue(body.duration_minutes, current.minutes);
  if (!name || price < 0 || !Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
    throw new Error('서비스명, 금액 및 소요시간을 확인해 주세요.');
  }
  return {
    ...current,
    name,
    price,
    minutes,
    deposit: Math.min(current.deposit, price),
    paymentType: suffix?.[1]?.toLowerCase() === 'cash' ? 'cash'
      : suffix ? 'card' : current.paymentType,
    category: typeof body.category === 'string' ? body.category.trim() || 'Others' : current.category,
    description: body.description === null || typeof body.description === 'string' ? body.description : current.description,
    active: typeof body.is_active === 'boolean' ? body.is_active : current.active,
    visibleTo: body.visible_to === 'admin' || body.visible_to === 'customer' || body.visible_to === 'both'
      ? body.visible_to : current.visibleTo,
  };
}

export const fetchHoonsServicePreview: typeof fetch = async (input, init) => {
  const path = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const { pathname, searchParams } = new URL(path, window.location.origin);
  const method = init?.method?.toUpperCase() ?? 'GET';
  init?.signal?.throwIfAborted();

  if (method === 'GET') {
    if (pathname === '/api/services/categories') {
      return Response.json({ categories: demoServiceCategories(readHoonsDemo().catalog).map((name) => ({ name })) });
    }
    if (pathname === '/api/services') return Response.json({ services: hoonsAdminServices() });
    if (pathname === '/api/staff') {
      return Response.json({ staff: hoonsAdminStaff(readHoonsDemo()).filter(({ is_active }) => is_active) });
    }
    if (pathname === '/api/designer-services') {
      const designerId = searchParams.get('designer_id');
      return Response.json({ designerServices: assignmentRows().filter((row) => !designerId || String(row.designer_id) === designerId) });
    }
    return Response.json({ error: '데모에서 사용할 수 없는 요청입니다.' }, { status: 404 });
  }

  try {
    const body: Record<string, unknown> = init?.body ? JSON.parse(String(init.body)) : {};
    let updatedService: DemoService | undefined;

    if (pathname === '/api/services/categories') {
      await editDemoCatalog((catalog) => {
        const categories = demoServiceCategories(catalog);
        const services = { ...catalog.services };
        if (method === 'PATCH' && Array.isArray(body.items)) {
          const names = body.items.flatMap((item) => typeof item?.name === 'string' && item.name.trim() ? [item.name.trim()] : []);
          return { ...catalog, categories: [...new Set([...names, ...categories])] };
        }

        const current = method === 'DELETE' ? searchParams.get('name') : body.renameFrom;
        const next = method === 'DELETE' ? 'Others' : body.renameTo;
        if (typeof current !== 'string' || typeof next !== 'string' || !next.trim()) {
          throw new Error('분류명을 확인해 주세요.');
        }
        if (method === 'PATCH' && current !== next && categories.includes(next)) {
          throw new Error('이미 같은 이름의 분류가 있습니다.');
        }
        for (const service of demoCatalogServices(catalog)) {
          if (service.category === current) services[service.id] = { ...service, category: next };
        }
        return { ...catalog, services, categories: [...new Set(categories.map((name) => name === current ? next : name))] };
      });
    } else if (pathname === '/api/services/reorder' && method === 'PATCH') {
      const items = Array.isArray(body.items) ? body.items : [];
      await editDemoCatalog((catalog) => {
        const services = { ...catalog.services };
        for (const service of demoCatalogServices(catalog)) {
          const item = items.find((row) => Number(row?.id) === service.adminId);
          if (item) services[service.id] = { ...service, sortOrder: numberValue(item.sort_order, service.sortOrder) };
        }
        return { ...catalog, services };
      });
    } else if (pathname === '/api/designer-services') {
      await editDemoCatalog((catalog) => {
        const row = method === 'POST' ? undefined : assignmentRows().find((item) =>
          item.id === Number(method === 'DELETE' ? searchParams.get('id') : body.id),
        );
        const member = hoonsAdminStaff(readHoonsDemo()).find((item) =>
          item.is_active && item.id === (method === 'POST' ? Number(body.designer_id) : row?.designer_id),
        );
        const service = demoCatalogServices(catalog).find((item) =>
          !item.archived && item.adminId === (method === 'POST' ? Number(body.service_id) : row?.service_id),
        );
        if (!member || !service) throw new Error('직원 또는 서비스를 찾을 수 없습니다.');

        const current = demoServiceAssignments(catalog, member.staffKey).find((item) => item.service.id === service.id)?.assignment;
        if (method === 'POST' && current) throw new Error('이미 등록된 서비스입니다.');
        const price = numberValue(body.price, current?.price ?? service.price);
        const minutes = numberValue(body.duration_minutes, current?.minutes ?? service.minutes);
        if (price < 0 || !Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
          throw new Error('금액과 소요시간을 확인해 주세요.');
        }

        const assignment: DemoServiceAssignment = {
          price, minutes,
          active: typeof body.is_active === 'boolean' ? body.is_active : current?.active ?? true,
          notes: body.notes === null || typeof body.notes === 'string' ? body.notes : current?.notes ?? null,
        };
        return { ...catalog, assignments: {
          ...catalog.assignments,
          [member.staffKey]: {
            ...catalog.assignments?.[member.staffKey],
            [service.id]: method === 'DELETE' ? null : assignment,
          },
        } };
      });
    } else if (pathname === '/api/services' || /^\/api\/services\/\d+$/.test(pathname)) {
      await editDemoCatalog((catalog) => {
        const services = demoCatalogServices(catalog);
        if (method === 'POST' && pathname === '/api/services') {
          const adminId = Math.max(...services.map((service) => service.adminId)) + 1;
          updatedService = serviceUpdate({
            id: 'demo-service-' + adminId, adminId, name: '', category: 'Others', price: 0, minutes: 0,
            deposit: 0, active: true, visibleTo: 'both', description: null, sortOrder: services.length + 1,
          }, body);
        } else {
          const adminId = Number(pathname.split('/').pop());
          const service = services.find((item) => item.adminId === adminId && !item.archived);
          if (!service) throw new Error('서비스를 찾을 수 없습니다.');
          updatedService = method === 'DELETE'
            ? { ...service, active: false, archived: true }
            : serviceUpdate(service, body);
        }
        return { ...catalog, services: { ...catalog.services, [updatedService.id]: updatedService } };
      });
    } else {
      return Response.json({ error: '데모에서 사용할 수 없는 요청입니다.' }, { status: 404 });
    }

    return Response.json(updatedService ? { service: adminService(updatedService) } : { success: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : '데모 변경을 저장할 수 없습니다.' }, { status: 400 });
  }
};
