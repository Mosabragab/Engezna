# Apple Review Notes
## Engezna - Food & Grocery Delivery App

---

## Review Notes (Copy to App Store Connect)

```
Thank you for reviewing Engezna!

Engezna is a local delivery platform connecting customers with restaurants and grocery stores in Egypt. The app allows users to browse local stores, place orders, and track deliveries.

DEMO ACCOUNT:
- Email: reviewer@engezna.com
- Password: AppleReview2026!

KEY FEATURES TO TEST:
1. Home Screen: Browse local stores by category
2. Store Details: View products and menus
3. Cart: Add items and proceed to checkout
4. Custom Orders: Request quotes from multiple stores
5. Order Tracking: View order status and history

LOCATION:
The app serves Egypt. Select "Beni Suef" governorate to see available demo stores.

PAYMENT:
- Cash on Delivery is available for testing the checkout flow
- Online payment requires a real Egyptian card (optional to test)

PERMISSIONS:
- Push Notifications: For order updates (optional)
- No GPS/Location access required

NOTES:
- The app does NOT use real-time GPS tracking
- User location is based on manually selected governorate/city
- No background location access
- Arabic and English languages fully supported

For any questions during review:
Email: support@engezna.com

Thank you!
```

---

## App Store Connect Settings

### Demo Account Credentials
| Field | Value |
|-------|-------|
| Username | reviewer@engezna.com |
| Password | AppleReview2026! |

### Contact Information
| Field | Value |
|-------|-------|
| First Name | Mosab |
| Last Name | Ragab |
| Phone | +20 [Phone Number] |
| Email | support@engezna.com |

---

## Common Review Rejection Reasons & Prevention

### 1. Guideline 4.2 - Minimum Functionality
**Prevention:** Our app provides comprehensive features:
- Multiple store browsing
- Product search and filtering
- Shopping cart functionality
- Order history and tracking
- Custom order requests
- User profile management

### 2. Guideline 5.1.1 - Data Collection
**Prevention:**
- Privacy Policy clearly explains data collection
- No unnecessary data collection
- No real-time GPS tracking
- Clear consent for push notifications

### 3. Guideline 2.1 - App Completeness
**Prevention:**
- All features are fully functional
- No placeholder content
- No broken links
- Demo stores with real products available

### 4. Guideline 4.0 - Design
**Prevention:**
- Native iOS design patterns followed
- RTL support for Arabic
- Accessibility considerations
- Minimum 44pt touch targets

---

## Test Scenarios for Reviewers

### Scenario 1: Browse and Order (Customer Flow)
1. Open app → Home screen loads with stores
2. Select a store → View products
3. Add items to cart
4. Proceed to checkout
5. Select "Cash on Delivery"
6. Place order → Order confirmation appears

### Scenario 2: Custom Order Request
1. Go to "Custom Orders" from home screen
2. Describe what you need
3. Submit request
4. View quotes from stores (if any respond)

### Scenario 3: Order History
1. Go to "My Orders"
2. View past orders
3. See order details and status

### Scenario 4: Language Switching
1. Go to Settings/Profile
2. Change language (Arabic ↔ English)
3. Verify all content updates

---

## Pre-Submission Checklist

- [ ] Demo account created and tested
- [ ] Privacy Policy URL active and accessible
- [ ] Support URL active and accessible
- [ ] All screenshots match current app version
- [ ] App description accurate and up-to-date
- [ ] Age rating correctly set (4+)
- [ ] All required app icons uploaded
- [ ] Export compliance answered
- [ ] Advertising identifier (IDFA) declaration accurate
- [ ] Content rights declaration completed

---

## Important URLs

| Purpose | URL |
|---------|-----|
| Privacy Policy (EN) | https://engezna.com/en/privacy |
| Privacy Policy (AR) | https://engezna.com/ar/privacy |
| Terms of Service (EN) | https://engezna.com/en/terms |
| Terms of Service (AR) | https://engezna.com/ar/terms |
| Support | https://engezna.com/en/help |
| Marketing | https://engezna.com |

---

## Response Templates for Common Issues

### If Asked About Location Services
```
Engezna does not use real-time location tracking. Users manually select their governorate and city in their profile settings. This selection is used only to display relevant stores in their area. The app does not access the device's GPS or track user movements.
```

### If Asked About Data Collection
```
We collect only the minimum information necessary:
- Name (for order identification)
- Email (for account and communications)
- Phone (for delivery coordination)
- Address (for order delivery)
- Selected governorate/city (for showing local stores)

We do not collect or track real-time location data.
```

### If Asked About Payment Processing
```
Engezna offers two payment methods:
1. Cash on Delivery - No payment processing required
2. Online Payment - Processed through [Payment Provider] with PCI-DSS compliance

All payment data is handled by certified payment processors. We do not store card details.
```

---

*Last Updated: January 2026*
