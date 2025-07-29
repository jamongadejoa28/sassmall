export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  PRODUCTS: '/products',
  PRODUCT_DETAIL: '/products/:id',
  CART: '/cart',
  CHECKOUT: '/checkout',
  ORDERS: '/orders',
  ORDER_DETAIL: '/orders/:orderId',
  ORDER_PAYMENT: '/orders/:orderId/payment',
  ORDER_COMPLETE: '/orders/:orderId/complete',
  PROFILE: '/profile',
  MY_PAGE: '/mypage',
  PROFILE_EDIT: '/profile/edit',
} as const;

export const ADMIN_ROUTES = {
  DASHBOARD: '/admin/dashboard',
  USERS: '/admin/users',
  PRODUCTS: '/admin/products',
  ORDERS: '/admin/orders',
  INQUIRIES: '/admin/inquiries',
  SETTINGS: '/admin/settings',
} as const;
