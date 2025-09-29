"""
Utility functions for standardized API responses
"""
from rest_framework.response import Response
from rest_framework import status
from typing import Any, Dict, Optional, List


class APIResponse:
    """
    Standardized API response utility class
    """
    
    @staticmethod
    def success(
        data: Any = None,
        message: str = "Operation completed successfully",
        status_code: int = status.HTTP_200_OK,
        meta: Optional[Dict] = None
    ) -> Response:
        """
        Create a standardized success response
        
        Args:
            data: The response data
            message: Success message
            status_code: HTTP status code
            meta: Additional metadata (pagination, etc.)
        
        Returns:
            Response: Standardized success response
        """
        response_data = {
            "success": True,
            "message": message,
            "data": data,
            "errors": None
        }
        
        if meta:
            response_data["meta"] = meta
            
        return Response(response_data, status=status_code)
    
    @staticmethod
    def error(
        message: str = "An error occurred",
        errors: Optional[Dict[str, List[str]]] = None,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        data: Any = None
    ) -> Response:
        """
        Create a standardized error response
        
        Args:
            message: Error message
            errors: Field-specific validation errors
            status_code: HTTP status code
            data: Additional error data
        
        Returns:
            Response: Standardized error response
        """
        response_data = {
            "success": False,
            "message": message,
            "data": data,
            "errors": errors
        }
        
        return Response(response_data, status=status_code)
    
    @staticmethod
    def validation_error(
        errors: Dict[str, List[str]],
        message: str = "Validation error"
    ) -> Response:
        """
        Create a standardized validation error response
        
        Args:
            errors: Field-specific validation errors
            message: Error message
        
        Returns:
            Response: Standardized validation error response
        """
        return APIResponse.error(
            message=message,
            errors=errors,
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    @staticmethod
    def not_found(
        message: str = "Resource not found",
        resource: str = "Resource"
    ) -> Response:
        """
        Create a standardized not found response
        
        Args:
            message: Error message
            resource: Name of the resource that was not found
        
        Returns:
            Response: Standardized not found response
        """
        return APIResponse.error(
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
            data={"resource": resource}
        )
    
    @staticmethod
    def unauthorized(
        message: str = "Authentication required"
    ) -> Response:
        """
        Create a standardized unauthorized response
        
        Args:
            message: Error message
        
        Returns:
            Response: Standardized unauthorized response
        """
        return APIResponse.error(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED
        )
    
    @staticmethod
    def forbidden(
        message: str = "Access denied"
    ) -> Response:
        """
        Create a standardized forbidden response
        
        Args:
            message: Error message
        
        Returns:
            Response: Standardized forbidden response
        """
        return APIResponse.error(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN
        )
    
    @staticmethod
    def server_error(
        message: str = "Internal server error",
        error_details: Optional[str] = None
    ) -> Response:
        """
        Create a standardized server error response
        
        Args:
            message: Error message
            error_details: Additional error details (for debugging)
        
        Returns:
            Response: Standardized server error response
        """
        data = None
        if error_details:
            data = {"error_details": error_details}
            
        return APIResponse.error(
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            data=data
        )
    
    @staticmethod
    def created(
        data: Any = None,
        message: str = "Resource created successfully"
    ) -> Response:
        """
        Create a standardized created response
        
        Args:
            data: The created resource data
            message: Success message
        
        Returns:
            Response: Standardized created response
        """
        return APIResponse.success(
            data=data,
            message=message,
            status_code=status.HTTP_201_CREATED
        )
    
    @staticmethod
    def updated(
        data: Any = None,
        message: str = "Resource updated successfully"
    ) -> Response:
        """
        Create a standardized updated response
        
        Args:
            data: The updated resource data
            message: Success message
        
        Returns:
            Response: Standardized updated response
        """
        return APIResponse.success(
            data=data,
            message=message,
            status_code=status.HTTP_200_OK
        )
    
    @staticmethod
    def deleted(
        message: str = "Resource deleted successfully"
    ) -> Response:
        """
        Create a standardized deleted response
        
        Args:
            message: Success message
        
        Returns:
            Response: Standardized deleted response
        """
        return APIResponse.success(
            data=None,
            message=message,
            status_code=status.HTTP_200_OK
        )
    
    @staticmethod
    def paginated(
        data: List[Any],
        message: str = "Data retrieved successfully",
        page: int = 1,
        page_size: int = 20,
        total_count: int = 0,
        total_pages: int = 0
    ) -> Response:
        """
        Create a standardized paginated response
        
        Args:
            data: List of data items
            message: Success message
            page: Current page number
            page_size: Number of items per page
            total_count: Total number of items
            total_pages: Total number of pages
        
        Returns:
            Response: Standardized paginated response
        """
        meta = {
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_count": total_count,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_previous": page > 1
            }
        }
        
        return APIResponse.success(
            data=data,
            message=message,
            meta=meta
        )


def format_serializer_errors(errors: Dict) -> Dict[str, List[str]]:
    """
    Format Django REST Framework serializer errors into a consistent format
    
    Args:
        errors: DRF serializer errors
    
    Returns:
        Dict: Formatted errors with field names as keys and error messages as lists
    """
    formatted_errors = {}
    
    for field, error_messages in errors.items():
        if isinstance(error_messages, list):
            formatted_errors[field] = error_messages
        else:
            formatted_errors[field] = [str(error_messages)]
    
    return formatted_errors
