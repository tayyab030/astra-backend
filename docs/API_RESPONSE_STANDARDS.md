# Standardized API Response System

This document describes the standardized API response format implemented across all ASTRA backend APIs.

## Response Format

All API responses follow a consistent structure with the following fields:

### Success Response

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  },
  "errors": null,
  "meta": {
    // Optional metadata (pagination, etc.)
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description",
  "data": null,
  "errors": {
    "field_name": ["Error message 1", "Error message 2"]
  }
}
```

## Response Types

### 1. Success Responses

#### `APIResponse.success()`

- **Status Code**: 200 OK
- **Use Case**: General successful operations
- **Example**:

```json
{
  "success": true,
  "message": "Tasks retrieved successfully",
  "data": [
    { "id": 1, "title": "Task 1", "status": "pending" },
    { "id": 2, "title": "Task 2", "status": "completed" }
  ],
  "errors": null
}
```

#### `APIResponse.created()`

- **Status Code**: 201 Created
- **Use Case**: Resource creation
- **Example**:

```json
{
  "success": true,
  "message": "Task created successfully",
  "data": {
    "id": 12,
    "title": "Write documentation",
    "status": "pending",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "errors": null
}
```

#### `APIResponse.updated()`

- **Status Code**: 200 OK
- **Use Case**: Resource updates
- **Example**:

```json
{
  "success": true,
  "message": "Task updated successfully",
  "data": {
    "id": 12,
    "title": "Write documentation",
    "status": "completed",
    "updated_at": "2024-01-15T11:30:00Z"
  },
  "errors": null
}
```

#### `APIResponse.deleted()`

- **Status Code**: 200 OK
- **Use Case**: Resource deletion
- **Example**:

```json
{
  "success": true,
  "message": "Task deleted successfully",
  "data": null,
  "errors": null
}
```

#### `APIResponse.paginated()`

- **Status Code**: 200 OK
- **Use Case**: Paginated data retrieval
- **Example**:

```json
{
  "success": true,
  "message": "Tasks retrieved successfully",
  "data": [
    { "id": 1, "title": "Task 1", "status": "pending" },
    { "id": 2, "title": "Task 2", "status": "completed" }
  ],
  "errors": null,
  "meta": {
    "pagination": {
      "page": 1,
      "page_size": 10,
      "total_count": 25,
      "total_pages": 3,
      "has_next": true,
      "has_previous": false
    }
  }
}
```

### 2. Error Responses

#### `APIResponse.validation_error()`

- **Status Code**: 400 Bad Request
- **Use Case**: Validation failures
- **Example**:

```json
{
  "success": false,
  "message": "Validation error",
  "data": null,
  "errors": {
    "email": ["Invalid email format"],
    "password": ["Password must be at least 8 characters"]
  }
}
```

#### `APIResponse.not_found()`

- **Status Code**: 404 Not Found
- **Use Case**: Resource not found
- **Example**:

```json
{
  "success": false,
  "message": "Task not found",
  "data": {
    "resource": "Task"
  },
  "errors": null
}
```

#### `APIResponse.unauthorized()`

- **Status Code**: 401 Unauthorized
- **Use Case**: Authentication required
- **Example**:

```json
{
  "success": false,
  "message": "Authentication required",
  "data": null,
  "errors": null
}
```

#### `APIResponse.forbidden()`

- **Status Code**: 403 Forbidden
- **Use Case**: Access denied
- **Example**:

```json
{
  "success": false,
  "message": "Access denied",
  "data": null,
  "errors": null
}
```

#### `APIResponse.server_error()`

- **Status Code**: 500 Internal Server Error
- **Use Case**: Server errors
- **Example**:

```json
{
  "success": false,
  "message": "Internal server error",
  "data": {
    "error_details": "Database connection failed"
  },
  "errors": null
}
```

## Usage in Views

### Basic Usage

```python
from core.utils import APIResponse, format_serializer_errors

def my_view(request):
    # Success case
    data = {"id": 1, "name": "Example"}
    return APIResponse.success(
        data=data,
        message="Data retrieved successfully"
    )

    # Error case
    return APIResponse.validation_error(
        errors={"field": ["Error message"]},
        message="Validation failed"
    )
```

### With Serializers

```python
def create_task(request):
    serializer = TaskSerializer(data=request.data)
    if serializer.is_valid():
        task = serializer.save()
        return APIResponse.created(
            data=serializer.data,
            message="Task created successfully"
        )
    else:
        return APIResponse.validation_error(
            errors=format_serializer_errors(serializer.errors),
            message="Task creation failed"
        )
```

### With Exception Handling

```python
def get_task(request, task_id):
    try:
        task = Task.objects.get(id=task_id)
        serializer = TaskSerializer(task)
        return APIResponse.success(
            data=serializer.data,
            message="Task retrieved successfully"
        )
    except Task.DoesNotExist:
        return APIResponse.not_found(
            message="Task not found",
            resource="Task"
        )
```

## Benefits

1. **Consistency**: All APIs return responses in the same format
2. **Predictability**: Frontend developers know exactly what to expect
3. **Error Handling**: Standardized error format makes error handling easier
4. **Debugging**: Consistent structure makes debugging more straightforward
5. **Documentation**: Self-documenting API responses

## Implementation Status

✅ **Core Views**: User registration and authentication  
✅ **OTP Views**: OTP creation, verification, and management  
✅ **Task Views**: Project, section, and task CRUD operations  
✅ **Response Utilities**: Comprehensive utility functions  
✅ **Error Formatting**: DRF serializer error formatting

## Future Enhancements

- Add response caching utilities
- Implement response compression
- Add API versioning support
- Create response middleware for automatic formatting
