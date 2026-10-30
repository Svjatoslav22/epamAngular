import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { LocationResponse } from '@app/models/locations/location-response.model';
import { DishListResponse } from '@app/models/dishes/dish-list-response.model';

export const MOCK_LOCATIONS: LocationResponse[] = [
  {
    id: 'demo-location-1',
    address: 'Rustaveli Avenue 48',
    description: 'Cozy vegetarian restaurant in the city center with a beautiful summer terrace.',
    totalCapacity: 40,
    averageOccupancy: '75%',
    imageUrl: 'assets/img/locations/rustaveli-avenue-48.jpg',
    rating: 4.9,
  },
  {
    id: 'demo-location-2',
    address: 'Baratashvili Street 14',
    description: 'Modern space with eco-friendly design and organic menu offerings.',
    totalCapacity: 30,
    averageOccupancy: '60%',
    imageUrl: 'assets/img/locations/baratashvili-street-14.jpg',
    rating: 4.8,
  },
  {
    id: 'demo-location-3',
    address: 'Abashidze Street 9',
    description: 'Quiet family atmosphere featuring seasonal specialty plant-based dishes.',
    totalCapacity: 25,
    averageOccupancy: '50%',
    imageUrl: 'assets/img/locations/abashidze-street-9.jpg',
    rating: 4.7,
  },
];

export const MOCK_DISHES: DishListResponse[] = [
  {
    id: 'dish-spring-salad',
    name: 'Spring Salad',
    price: 12,
    weight: '430 g',
    imageUrl: 'assets/img/dishes/spring-salad.jpg',
    dishType: 'Appetizers',
    state: 'Available',
    description: 'Crisp seasonal greens, fresh cucumbers, radish, and aromatic herb vinaigrette.',
    calories: '180 kcal',
    proteins: '4 g',
    fats: '10 g',
    carbohydrates: '14 g',
    vitamins: 'A, C, K',
  },
  {
    id: 'dish-avocado-bowl',
    name: 'Avocado Pine Nut Bowl',
    price: 14.5,
    weight: '380 g',
    imageUrl: 'assets/img/dishes/avocado-pine-nut-bowl.jpg',
    dishType: 'MainCourse',
    state: 'Available',
    description: 'Hass avocado, toasted pine nuts, quinoa, baby spinach, cherry tomatoes with citrus dressing.',
    calories: '340 kcal',
    proteins: '9 g',
    fats: '22 g',
    carbohydrates: '28 g',
    vitamins: 'E, B6, C',
  },
  {
    id: 'dish-strawberry-salad',
    name: 'Fresh Strawberry Mint Salad',
    price: 11,
    weight: '350 g',
    imageUrl: 'assets/img/dishes/fresh-strawberry-mint-salad.jpg',
    dishType: 'Desserts',
    state: 'Available',
    description: 'Sweet local strawberries, fresh mint leaves, baby arugula, light balsamic glaze.',
    calories: '150 kcal',
    proteins: '2 g',
    fats: '5 g',
    carbohydrates: '22 g',
    vitamins: 'C, Folate',
  },
  {
    id: 'dish-potato-lentil',
    name: 'Roasted Sweet Potato & Lentil Salad',
    price: 13,
    weight: '400 g',
    imageUrl: 'assets/img/dishes/roasted-sweet-potato-and-lentil-salad.jpg',
    dishType: 'MainCourse',
    state: 'Available',
    description: 'Warm roasted sweet potatoes, beluga lentils, kale, pumpkin seeds with tahini dressing.',
    calories: '390 kcal',
    proteins: '14 g',
    fats: '12 g',
    carbohydrates: '55 g',
    vitamins: 'A, Iron, B1',
  },
];

export const publicMockInterceptor: HttpInterceptorFn = (req, next) => {
  const url = req.url.split('?')[0];

  // Helper response wrapper
  const send = (data: unknown): Observable<HttpResponse<unknown>> =>
    of(new HttpResponse({ status: 200, url: req.url, body: data }));

  // 1. GET /locations
  if (req.method === 'GET' && url.endsWith('/locations')) {
    return send(MOCK_LOCATIONS);
  }

  // 2. GET /locations/:id
  const locationMatch = url.match(/\/locations\/([^/]+)$/);
  if (req.method === 'GET' && locationMatch && !locationMatch[1].includes('.')) {
    const locId = locationMatch[1];
    const found = MOCK_LOCATIONS.find((l) => l.id === locId) || MOCK_LOCATIONS[0];
    return send(found);
  }

  // 3. GET /locations/:id/dishes
  if (req.method === 'GET' && url.includes('/locations/') && url.endsWith('/dishes')) {
    return send(MOCK_DISHES);
  }

  // 4. GET /dishes/popular
  if (req.method === 'GET' && url.endsWith('/dishes/popular')) {
    return send(MOCK_DISHES);
  }

  // 5. GET /dishes
  if (req.method === 'GET' && url.endsWith('/dishes')) {
    const dishType = req.params.get('dishType');
    let filtered = MOCK_DISHES;
    if (dishType) {
      filtered = filtered.filter((d) => d.dishType.toLowerCase() === dishType.toLowerCase());
    }
    return send(filtered);
  }

  // 6. GET /available-tables
  if (req.method === 'GET' && url.endsWith('/available-tables')) {
    return send([
      { id: 'table-1', number: 1, capacity: 2, isAvailable: true, timeRanges: [] },
      { id: 'table-2', number: 2, capacity: 4, isAvailable: true, timeRanges: [] },
      { id: 'table-3', number: 3, capacity: 6, isAvailable: true, timeRanges: [] },
    ]);
  }

  // 7. GET /feedback
  if (req.method === 'GET' && url.endsWith('/feedback')) {
    const locId = req.params.get('locationId') || 'demo-location-2';
    const type = req.params.get('type') || 'Service';
    return send({
      items: [
        {
          userId: 'mock-user-1',
          locationId: locId,
          reservationId: 'mock-res-1',
          username: 'Anna Kowalska',
          rating: 5,
          comment: 'Wonderful atmosphere and delicious organic dishes! Loved the seasonal menu.',
          createdAt: '2026-10-25T14:30:00.000Z',
          type,
        },
        {
          userId: 'mock-user-2',
          locationId: locId,
          reservationId: 'mock-res-2',
          username: 'Mark Miller',
          rating: 5,
          comment: 'Very cozy place. Service was quick and attentive. Will definitely come back.',
          createdAt: '2026-10-22T11:15:00.000Z',
          type,
        },
      ],
      totalPages: 1,
      currentPage: 1,
    });
  }

  // 8. GET /users/:id/profile-image
  if (req.method === 'GET' && url.includes('/users/') && url.endsWith('/profile-image')) {
    return send({ presignedUrl: 'assets/img/avatar.png' });
  }

  // 9. GET /users/:id/name
  if (req.method === 'GET' && url.includes('/users/') && url.endsWith('/name')) {
    return send({ name: 'Guest User' });
  }

  // 10. GET /me
  if (req.method === 'GET' && url.endsWith('/me')) {
    try {
      const storedUser = localStorage.getItem('user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      if (user) return send(user);
    } catch {
      // fallback
    }
    return send({
      id: 'demo-owner',
      firstName: 'Yevhenii',
      lastName: 'Demo',
      email: 'owner@demo.test',
      role: 'Customer',
    });
  }

  // 11. PUT /me
  if (req.method === 'PUT' && url.endsWith('/me')) {
    return send({ message: 'Profile updated' });
  }

  // 12. GET /reservations
  if (req.method === 'GET' && url.endsWith('/reservations')) {
    return send([]);
  }

  // 13. POST /feedback
  if (req.method === 'POST' && url.endsWith('/feedback')) {
    return send({ success: true });
  }

  // 14. GET /reservations/:id/feedback
  if (req.method === 'GET' && url.includes('/reservations/') && url.endsWith('/feedback')) {
    return send({ service: null, cuisineExperience: null });
  }

  return next(req);
};

