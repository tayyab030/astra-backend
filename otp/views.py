from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from django.utils import timezone
from django.contrib.auth import get_user_model
from .serializers import OTPCreateSerializer, OTPVerifySerializer, OTPSerializer
from .models import OTP

User = get_user_model()


class OTPViewSet(ModelViewSet):
    """
    ModelViewSet for OTP operations
    
    Provides CRUD operations and custom actions for OTP management
    """
    queryset = OTP.objects.all()
    serializer_class = OTPSerializer
    permission_classes = [AllowAny]
    lookup_field = 'token'
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create_otp':
            return OTPCreateSerializer
        elif self.action == 'verify_otp':
            return OTPVerifySerializer
        return OTPSerializer
    
    def get_queryset(self):
        """Filter queryset based on query parameters"""
        queryset = OTP.objects.all()
        
        # Filter by user_id if provided
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        # Filter by otp_type if provided
        otp_type = self.request.query_params.get('otp_type')
        if otp_type:
            queryset = queryset.filter(otp_type=otp_type)
        
        # Filter by is_used if provided
        is_used = self.request.query_params.get('is_used')
        if is_used is not None:
            queryset = queryset.filter(is_used=is_used.lower() == 'true')
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        """
        List OTPs with optional filtering
        
        GET /api/otp/?user_id=1&otp_type=email&is_used=false
        """
        return super().list(request, *args, **kwargs)
    
    def retrieve(self, request, *args, **kwargs):
        """
        Retrieve a specific OTP by token
        
        GET /api/otp/{token}/
        """
        try:
            # Validate UUID format first
            token = kwargs.get('token')
            if token:
                import uuid
                try:
                    uuid.UUID(token)
                except ValueError:
                    return Response(
                        {
                            'error': 'Invalid token format',
                            'message': 'Token must be a valid UUID format',
                            'provided_token': token
                        }, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
        except Exception:
            pass  # Let the parent method handle other cases
            
        return super().retrieve(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """
        Delete an OTP
        
        DELETE /api/otp/{token}/
        """
        try:
            # Validate UUID format first
            token = kwargs.get('token')
            if token:
                import uuid
                try:
                    uuid.UUID(token)
                except ValueError:
                    return Response(
                        {
                            'error': 'Invalid token format',
                            'message': 'Token must be a valid UUID format',
                            'provided_token': token
                        }, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
        except Exception:
            pass  # Let the parent method handle other cases
            
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=False, methods=['post'], url_path='create')
    def create_otp(self, request):
        """
        Create a new OTP for user verification
        
        POST /api/otp/create/
        {
            "user_id": 1,
            "otp_type": "email"  # optional, defaults to "email"
        }
        """
        serializer = OTPCreateSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                otp = serializer.save()
                
                # In a real application, you would send the OTP via email/SMS here
                # For now, we'll just return it in the response for testing
                response_data = {
                    'message': 'OTP created successfully',
                    'otp': OTPSerializer(otp).data,
                    'expires_at': otp.get_expires_at(),
                    'expired_previous_otps': getattr(otp, '_expired_previous_count', 0)
                }
                
                return Response(response_data, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                return Response(
                    {'error': f'Failed to create OTP: {str(e)}'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], url_path='verify')
    def verify_otp(self, request):
        """
        Verify an OTP code and activate user if verification is successful
        
        POST /api/otp/verify/
        {
            "user_id": 1,
            "otp_code": "123456",
            "otp_type": "email"  # optional, defaults to "email"
        }
        """
        serializer = OTPVerifySerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                otp = serializer.save()
                
                # Get the user and activate them
                user = User.objects.get(id=otp.user.id)
                user.is_active = True
                user.save()
                
                response_data = {
                    'message': 'OTP verified successfully and user activated',
                    'verified': True,
                    'user_activated': True,
                    'otp_token': str(otp.token),
                    'verified_at': timezone.now(),
                    'attempts_used': otp.attempt_count + 1,  # +1 because this was the successful attempt
                    'max_attempts': otp.max_attempts
                }
                
                return Response(response_data, status=status.HTTP_200_OK)
                
            except Exception as e:
                return Response(
                    {'error': f'Failed to verify OTP: {str(e)}'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        # Handle validation errors with proper status codes
        error_data = serializer.errors
        error_type = error_data.get('otp_code', {}).get('error_type', 'unknown') if isinstance(error_data.get('otp_code'), dict) else 'unknown'
        
        if error_type == 'max_attempts_exceeded':
            return Response(error_data, status=status.HTTP_429_TOO_MANY_REQUESTS)
        elif error_type == 'expired':
            return Response(error_data, status=status.HTTP_410_GONE)
        else:
            return Response(error_data, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'], url_path='status')
    def otp_status(self, request, token=None):
        """
        Check the status of an OTP by token
        
        GET /api/otp/{token}/status/
        """
        try:
            # Validate UUID format first
            import uuid
            try:
                uuid.UUID(token)
            except ValueError:
                return Response(
                    {
                        'error': 'Invalid token format',
                        'message': 'Token must be a valid UUID format',
                        'provided_token': token
                    }, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # token is the lookup field
            otp = OTP.objects.get(token=token)
            
            status_data = {
                'is_used': otp.is_used,
                'is_expired': otp.is_expired(),
                'created_at': otp.created_at,
                'expires_at': otp.get_expires_at(),
                'remaining_time_seconds': otp.get_remaining_time(),
                'otp_type': otp.otp_type,
                'attempt_count': otp.attempt_count,
                'max_attempts': otp.max_attempts,
                'remaining_attempts': otp.get_remaining_attempts(),
                'is_max_attempts_reached': otp.is_max_attempts_reached(),
                'user_id': otp.user.id
            }
            
            return Response(status_data, status=status.HTTP_200_OK)
            
        except OTP.DoesNotExist:
            return Response(
                {'error': 'OTP not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'], url_path='stats')
    def otp_stats(self, request):
        """
        Get OTP statistics for a user
        
        GET /api/otp/stats/?user_id=1
        """
        from .utils import get_otp_usage_stats
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        user_id = request.query_params.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'user_id parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(id=user_id)
            stats = get_otp_usage_stats(user)
            return Response(stats, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'], url_path='cleanup')
    def cleanup_otps(self, request):
        """
        Clean up expired OTPs and delete inactive users with no valid OTPs
        
        POST /api/otp/cleanup/
        """
        from .utils import cleanup_expired_otps
        
        try:
            result = cleanup_expired_otps()
            return Response(
                {
                    'message': 'Cleanup completed successfully',
                    'expired_otps_deleted': result['expired_otps_deleted'],
                    'inactive_users_deleted': result['inactive_users_deleted'],
                    'total_cleanup_count': result['total_cleanup_count']
                }, 
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to cleanup OTPs: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
