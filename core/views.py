from django.shortcuts import render
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from djoser.views import UserViewSet
from djoser.serializers import UserCreateSerializer
from .serializers import UserCreateSerializer as CustomUserCreateSerializer
from django.contrib.auth import get_user_model
from otp.models import OTP
from otp.utils import generate_otp_code, send_otp_email
from otp.serializers import OTPSerializer
import uuid

User = get_user_model()


class CustomUserViewSet(UserViewSet):
    """
    Custom UserViewSet that overrides the create method to:
    1. Set is_active=False for new users
    2. Create an OTP for the user
    3. Send OTP via email
    4. Return OTP token in response
    """
    
    def create(self, request, *args, **kwargs):
        """
        Override the create method to customize user registration
        """
        # Use the custom serializer for user creation that includes first_name and last_name
        serializer = CustomUserCreateSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                # Create user with is_active=False
                user_data = serializer.validated_data.copy()
                user_data['is_active'] = False
                
                # Ensure first_name and last_name are included
                first_name = user_data.pop('first_name', '')
                last_name = user_data.pop('last_name', '')
                
                # Create the user
                user = User.objects.create_user(**user_data)
                
                # Set first_name and last_name after creation
                user.first_name = first_name
                user.last_name = last_name
                user.save()
                
                # Generate OTP code
                otp_code = generate_otp_code()
                
                # Create OTP record
                otp = OTP.objects.create(
                    user=user,
                    otp_code=otp_code,
                    otp_type='email',
                    expires_in=1800  # 30 minutes
                )
                
                # Send OTP via email
                email_sent = send_otp_email(
                    user_email=user.email,
                    otp_code=otp_code,
                    otp_type='email'
                )
                
                # Prepare response data
                response_data = {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'is_active': user.is_active,
                    'date_joined': user.date_joined,
                    'otp_token': str(otp.token),
                    'otp_expires_at': otp.get_expires_at(),
                    'email_sent': email_sent,
                    'message': 'User created successfully. Please check your email for OTP verification.'
                }
                
                return Response(response_data, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                return Response(
                    {'error': f'Failed to create user: {str(e)}'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Create your views here.
