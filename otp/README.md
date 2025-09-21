# OTP API Documentation

This module provides a comprehensive OTP (One-Time Password) system for user verification.

## Features

- **OTP Generation**: Create secure 6-digit OTP codes
- **Multiple OTP Types**: Support for email, SMS, and authenticator app OTPs
- **Expiration Management**: Configurable expiration times (1 minute to 1 hour)
- **Auto-Expire Previous**: Creating new OTP automatically expires previous active OTPs
- **Validation**: Comprehensive validation with proper error handling
- **Cleanup**: Automatic cleanup of expired OTPs
- **Security**: UUID-based tokens and proper validation

## API Endpoints

### 1. List OTPs

**GET** `/api/otp/`

Lists all OTPs with optional filtering.

**Query Parameters:**

- `user_id` (int): Filter by user ID
- `otp_type` (str): Filter by OTP type (email, sms, authenticator)
- `is_used` (bool): Filter by usage status

**Example:**

```
GET /api/otp/?user_id=1&otp_type=email&is_used=false
```

### 2. Retrieve OTP

**GET** `/api/otp/{token}/`

Retrieves a specific OTP by its token.

### 3. Delete OTP

**DELETE** `/api/otp/{token}/`

Deletes a specific OTP by its token.

### 4. Create OTP

**POST** `/api/otp/create/`

Creates a new OTP for user verification.

**Request Body:**

```json
{
  "user_id": 1,
  "otp_type": "email", // optional, defaults to "email"
  "expires_in": 300 // optional, defaults to 30 minutes (in seconds)
}
```

**Response (201 Created):**

```json
{
  "message": "OTP created successfully",
  "otp": {
    "id": 1,
    "otp_code": "123456",
    "otp_type": "email",
    "created_at": "2024-01-01T12:00:00Z",
    "expires_in": 300,
    "is_used": false,
    "token": "550e8400-e29b-41d4-a716-446655440000"
  },
  "expires_at": "2024-01-01T12:30:00Z",
  "expired_previous_otps": 2
}
```

### 5. Verify OTP

**POST** `/api/otp/verify/`

Verifies an OTP code.

**Request Body:**

```json
{
  "user_id": 1,
  "otp_code": "123456",
  "otp_type": "email" // optional, defaults to "email"
}
```

**Response (200 OK):**

```json
{
  "message": "OTP verified successfully",
  "verified": true,
  "otp_token": "550e8400-e29b-41d4-a716-446655440000",
  "verified_at": "2024-01-01T12:15:00Z"
}
```

### 6. Check OTP Status

**GET** `/api/otp/{token}/status/`

Checks the status of an OTP by its token.

**Response (200 OK):**

```json
{
  "is_used": false,
  "is_expired": false,
  "created_at": "2024-01-01T12:00:00Z",
  "expires_at": "2024-01-01T12:30:00Z",
  "remaining_time_seconds": 300,
  "otp_type": "email"
}
```

### 7. Get OTP Statistics

**GET** `/api/otp/stats/?user_id=1`

Get OTP usage statistics for a user.

**Response (200 OK):**

```json
{
  "total_otps": 15,
  "used_otps": 12,
  "active_otps": 1,
  "otps_last_24h": 3,
  "otps_last_7d": 8
}
```

### 8. Cleanup Expired OTPs

**POST** `/api/otp/cleanup/`

Clean up expired OTPs from the database.

**Response (200 OK):**

```json
{
  "message": "Successfully cleaned up 5 expired OTPs"
}
```

## Error Responses

### 400 Bad Request

**Invalid OTP Code:**

```json
{
  "otp_code": ["Invalid OTP code or OTP type."]
}
```

**Expired OTP:**

```json
{
  "otp_code": ["OTP has expired. Please request a new one."],
  "expired_at": "2024-01-01T12:30:00Z",
  "remaining_time": 0
}
```

**Missing Fields:**

```json
{
  "user_id": ["User with this ID does not exist."],
  "otp_code": ["This field is required."]
}
```

### 404 Not Found

```json
{
  "error": "OTP not found"
}
```

### 500 Internal Server Error

```json
{
  "error": "Failed to create OTP: Error message"
}
```

## Usage Examples

### Python (using requests)

```python
import requests

# List OTPs with filtering
response = requests.get('http://localhost:8000/api/otp/', params={
    'user_id': 1,
    'otp_type': 'email',
    'is_used': False
})

# Get specific OTP by token
otp_response = requests.get('http://localhost:8000/api/otp/{token}/')

# Create OTP
response = requests.post('http://localhost:8000/api/otp/create/', json={
    'user_id': 1,
    'otp_type': 'email',
    'expires_in': 300
})

if response.status_code == 201:
    otp_data = response.json()
    print(f"OTP Code: {otp_data['otp']['otp_code']}")

# Verify OTP
verify_response = requests.post('http://localhost:8000/api/otp/verify/', json={
    'user_id': 1,
    'otp_code': '123456'
})

if verify_response.status_code == 200:
    print("OTP verified successfully!")

# Delete OTP
delete_response = requests.delete('http://localhost:8000/api/otp/{token}/')
```

### JavaScript (using fetch)

```javascript
// List OTPs with filtering
const listOTPs = async (filters = {}) => {
  const params = new URLSearchParams(filters);
  const response = await fetch(`/api/otp/?${params}`, {
    method: "GET",
  });

  return await response.json();
};

// Get specific OTP by token
const getOTP = async (token) => {
  const response = await fetch(`/api/otp/${token}/`, {
    method: "GET",
  });

  return await response.json();
};

// Create OTP
const createOTP = async (userId) => {
  const response = await fetch("/api/otp/create/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: userId,
      otp_type: "email",
      expires_in: 300,
    }),
  });

  return await response.json();
};

// Verify OTP
const verifyOTP = async (userId, otpCode) => {
  const response = await fetch("/api/otp/verify/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: userId,
      otp_code: otpCode,
    }),
  });

  return await response.json();
};

// Check OTP Status
const checkOTPStatus = async (token) => {
  const response = await fetch(`/api/otp/${token}/status/`, {
    method: "GET",
  });

  return await response.json();
};

// Delete OTP
const deleteOTP = async (token) => {
  const response = await fetch(`/api/otp/${token}/`, {
    method: "DELETE",
  });

  return await response.json();
};

// Get OTP Statistics
const getOTPStats = async (userId) => {
  const response = await fetch(`/api/otp/stats/?user_id=${userId}`, {
    method: "GET",
  });

  return await response.json();
};
```

## Management Commands

### Cleanup Expired OTPs

```bash
# Clean up expired OTPs
python manage.py cleanup_otps

# Dry run to see what would be deleted
python manage.py cleanup_otps --dry-run
```

## Configuration

### Settings

The OTP system uses the following default settings:

- **OTP Length**: 6 digits
- **Default Expiration**: 30 minutes (300 seconds)
- **Minimum Expiration**: 1 minute (60 seconds)
- **Maximum Expiration**: 1 hour (3600 seconds)

### Email Configuration

To send OTPs via email, configure your email settings in `settings.py`:

```python
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'your-smtp-host'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'your-email@example.com'
EMAIL_HOST_PASSWORD = 'your-password'
DEFAULT_FROM_EMAIL = 'your-email@example.com'
```

## Security Considerations

1. **Rate Limiting**: Consider implementing rate limiting to prevent OTP spam
2. **IP Tracking**: Track IP addresses for suspicious activity
3. **Email Validation**: Ensure email addresses are properly validated
4. **Cleanup**: Regularly clean up expired OTPs
5. **Logging**: Log OTP creation and verification attempts for security monitoring

## Testing

The OTP system includes comprehensive validation and error handling. Test the following scenarios:

1. **Valid OTP Creation**: Create OTP with valid email
2. **Invalid Email**: Try creating OTP with non-existent email
3. **OTP Verification**: Verify OTP with correct code
4. **Expired OTP**: Try verifying expired OTP
5. **Used OTP**: Try verifying already used OTP
6. **Invalid Code**: Try verifying with wrong OTP code

## Future Enhancements

- SMS integration (Twilio, AWS SNS)
- Rate limiting middleware
- OTP attempt tracking
- Email templates customization
- Webhook support for OTP events
