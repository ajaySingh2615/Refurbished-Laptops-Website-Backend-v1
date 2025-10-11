# 🛒 Cart System API Documentation

## Overview

Professional cart system supporting both authenticated users and guest users with advanced features like cart abandonment tracking, wishlist functionality, and comprehensive pricing calculations.

## Base URL

```
/api/cart
```

## Authentication

- **Authenticated Users**: Full cart persistence across devices
- **Guest Users**: Session-based carts with automatic conversion on login
- **Session Management**: Automatic session ID generation for guests

## Endpoints

### 1. Get Cart

**GET** `/api/cart`

Get the current user's cart with all items and product details.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 123,
    "sessionId": null,
    "status": "active",
    "currency": "INR",
    "subtotal": 50000.0,
    "taxAmount": 9000.0,
    "discountAmount": 5000.0,
    "shippingAmount": 0.0,
    "totalAmount": 54000.0,
    "itemCount": 2,
    "items": [
      {
        "id": 1,
        "productId": 1,
        "productVariantId": 1,
        "quantity": 1,
        "unitPrice": 25000.0,
        "unitMrp": 30000.0,
        "unitDiscountPercent": 16,
        "lineTotal": 25000.0,
        "lineTax": 4500.0,
        "lineDiscount": 5000.0,
        "selectedAttributes": {
          "color": "Space Gray",
          "ramGb": 16,
          "storage": "512GB SSD"
        },
        "productTitle": "MacBook Pro 13-inch",
        "productBrand": "Apple",
        "productModel": "MacBook Pro",
        "productCondition": "Excellent",
        "image": "https://res.cloudinary.com/...",
        "imageAlt": "MacBook Pro 13-inch Space Gray"
      }
    ]
  }
}
```

### 2. Add Item to Cart

**POST** `/api/cart/add`

Add a product to the cart.

**Request Body:**

```json
{
  "productId": 1,
  "productVariantId": 1, // Optional
  "quantity": 1,
  "selectedAttributes": {
    // Optional
    "color": "Space Gray",
    "ramGb": 16
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Item added to cart",
  "data": {
    "id": 1,
    "cartId": 1,
    "productId": 1,
    "productVariantId": 1,
    "quantity": 1,
    "unitPrice": 25000.0,
    "lineTotal": 25000.0,
    "lineTax": 4500.0,
    "lineDiscount": 5000.0
  }
}
```

### 3. Update Cart Item

**PUT** `/api/cart/items/:itemId`

Update the quantity of a cart item.

**Request Body:**

```json
{
  "quantity": 2
}
```

**Response:**

```json
{
  "success": true,
  "message": "Cart item updated",
  "data": {
    "id": 1,
    "quantity": 2,
    "lineTotal": 50000.0,
    "lineTax": 9000.0,
    "lineDiscount": 10000.0
  }
}
```

### 4. Remove Item from Cart

**DELETE** `/api/cart/items/:itemId`

Remove an item from the cart.

**Response:**

```json
{
  "success": true,
  "message": "Item removed from cart"
}
```

### 5. Clear Cart

**DELETE** `/api/cart/clear`

Remove all items from the cart.

**Response:**

```json
{
  "success": true,
  "message": "Cart cleared"
}
```

### 6. Apply Coupon

**POST** `/api/cart/coupon`

Apply a coupon code to the cart.

**Request Body:**

```json
{
  "couponCode": "SAVE10"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Coupon applied successfully"
}
```

### 7. Get Cart Summary

**GET** `/api/cart/summary`

Get a lightweight cart summary for header/mini cart display.

**Response:**

```json
{
  "success": true,
  "data": {
    "itemCount": 2,
    "totalAmount": 54000.0,
    "items": [
      {
        "id": 1,
        "productTitle": "MacBook Pro 13-inch",
        "quantity": 1,
        "unitPrice": 25000.0,
        "image": "https://res.cloudinary.com/..."
      }
    ]
  }
}
```

### 8. Track Cart Abandonment

**POST** `/api/cart/track-abandonment`

Track cart abandonment for marketing campaigns.

**Request Body:**

```json
{
  "stage": "viewed" // viewed, added_item, checkout_started, payment_failed
}
```

**Response:**

```json
{
  "success": true,
  "message": "Abandonment tracked"
}
```

### 9. Save Cart (Authenticated Only)

**POST** `/api/cart/save`

Save current cart as a wishlist.

**Request Body:**

```json
{
  "cartId": 1,
  "name": "My Wishlist",
  "description": "Laptops I want to buy",
  "isPublic": false
}
```

**Response:**

```json
{
  "success": true,
  "message": "Cart saved successfully",
  "data": {
    "id": 1,
    "userId": 123,
    "name": "My Wishlist",
    "description": "Laptops I want to buy",
    "isPublic": false,
    "itemCount": 2
  }
}
```

### 10. Get Saved Carts (Authenticated Only)

**GET** `/api/cart/saved`

Get user's saved carts (wishlist).

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "My Wishlist",
      "description": "Laptops I want to buy",
      "isPublic": false,
      "itemCount": 2,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### 11. Merge Carts (Authenticated Only)

**POST** `/api/cart/merge`

Merge guest cart with user cart after login.

**Request Body:**

```json
{
  "sessionId": "guest-session-123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Carts merged successfully"
}
```

## Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "message": "Product ID is required"
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "message": "Authentication required"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Failed to add item to cart",
  "error": "Detailed error message (development only)"
}
```

## Features

### 🛍️ **Cart Management**

- Add/remove/update items
- Support for product variants
- Quantity management
- Cart clearing

### 💰 **Pricing & Calculations**

- Automatic GST calculation (18% default)
- Discount management
- MRP vs. selling price tracking
- Line-level and cart-level totals

### 👤 **User Experience**

- Guest cart support with session management
- Cart persistence across devices
- Automatic cart merging on login
- Cart expiration (30 days for users, 7 days for guests)

### 📊 **Business Intelligence**

- Cart abandonment tracking
- Recovery campaign support
- Analytics and reporting
- Wishlist functionality

### 🔧 **Technical Features**

- JSON attribute storage for variants
- Optimized database queries
- Comprehensive error handling
- Development-friendly error messages

## Session Management

### Guest Users

- Automatic session ID generation
- Cookie-based session persistence
- 7-day session expiration
- Seamless conversion to authenticated cart

### Authenticated Users

- User ID-based cart association
- 30-day cart persistence
- Cross-device cart synchronization
- Automatic guest cart merging

## Database Schema

### Core Tables

- `carts` - Main cart container
- `cart_items` - Individual cart items
- `cart_abandonment` - Abandonment tracking
- `saved_carts` - Wishlist functionality
- `cart_coupons` - Discount management

### Key Relationships

- Users ↔ Carts (1:many)
- Carts ↔ Cart Items (1:many)
- Products ↔ Cart Items (1:many)
- Product Variants ↔ Cart Items (1:many)

## Usage Examples

### Frontend Integration

```javascript
// Add item to cart
const response = await fetch("/api/cart/add", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    productId: 1,
    productVariantId: 1,
    quantity: 1,
  }),
});

// Get cart summary for header
const cartSummary = await fetch("/api/cart/summary");
```

### Session Handling

```javascript
// The system automatically handles session IDs
// No manual session management required
// Guest users get automatic session cookies
// Authenticated users use their user ID
```

This cart system provides enterprise-level functionality while maintaining simplicity for development and user experience.
