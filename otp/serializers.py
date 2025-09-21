from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import OTP
import random
import string

User = get_user_model()


class OTPSerializer(serializers.ModelSerializer):
    """Serializer for OTP model with read-only fields"""
    
    class Meta:
        model = OTP
        fields = ['id', 'otp_code', 'otp_type', 'created_at', 'expires_in', 'is_used', 'token']
        read_only_fields = ['id', 'otp_code', 'created_at', 'is_used', 'token']


class OTPCreateSerializer(serializers.Serializer):
    """Serializer for creating new OTP"""
    
    user_id = serializers.IntegerField(required=True)
    otp_type = serializers.ChoiceField(
        choices=OTP.TYPES_CHOICES,
        default='email',
        required=False
    )
    
    def validate_user_id(self, value):
        """Validate that the user exists in the system"""
        try:
            user = User.objects.get(id=value)
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError("User with this ID does not exist.")
    
    def validate(self, attrs):
        """Additional validation for OTP creation"""
        user_id = attrs.get('user_id')
        otp_type = attrs.get('otp_type', 'email')
        
        # Store user and otp_type for use in create method
        if user_id:
            user = User.objects.get(id=user_id)
            attrs['user'] = user
            attrs['otp_type'] = otp_type
        
        return attrs
    
    def create(self, validated_data):
        """Create a new OTP instance and expire previous active OTPs"""
        user = validated_data['user']
        otp_type = validated_data.get('otp_type', 'email')
        
        # Expire all previous active OTPs of the same type for this user
        expired_count = OTP.expire_previous_otps(user, otp_type)
        
        # Generate 6-digit OTP code
        otp_code = ''.join(random.choices(string.digits, k=6))
        
        # Create new OTP instance with default expiry time
        otp = OTP.objects.create(
            user=user,
            otp_code=otp_code,
            otp_type=otp_type
        )
        
        # Store the count of expired OTPs for potential use in views
        otp._expired_previous_count = expired_count
        
        return otp


class OTPVerifySerializer(serializers.Serializer):
    """Serializer for verifying OTP"""
    
    user_id = serializers.IntegerField(required=True)
    otp_code = serializers.CharField(max_length=6, min_length=6, required=True)
    otp_type = serializers.ChoiceField(
        choices=OTP.TYPES_CHOICES,
        default='email',
        required=False
    )
    
    def validate_user_id(self, value):
        """Validate that the user exists in the system"""
        try:
            user = User.objects.get(id=value)
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError("User with this ID does not exist.")
    
    def validate(self, attrs):
        """Validate OTP verification"""
        user_id = attrs['user_id']
        otp_code = attrs['otp_code']
        otp_type = attrs.get('otp_type', 'email')
        
        try:
            user = User.objects.get(id=user_id)
            otp = OTP.objects.get(
                user=user,
                otp_code=otp_code,
                otp_type=otp_type,
                is_used=False
            )
            
            # Check if OTP is expired
            if otp.is_expired():
                raise serializers.ValidationError({
                    'otp_code': "OTP has expired. Please request a new one.",
                    'expired_at': otp.get_expires_at(),
                    'remaining_time': 0,
                    'error_type': 'expired'
                })
            
            # Check if max attempts reached
            if otp.is_max_attempts_reached():
                # Expire the OTP due to max attempts
                otp.expire_otp()
                raise serializers.ValidationError({
                    'otp_code': "Maximum verification attempts exceeded. OTP has been expired. Please request a new one.",
                    'attempts_used': otp.attempt_count,
                    'max_attempts': otp.max_attempts,
                    'error_type': 'max_attempts_exceeded'
                })
            
            attrs['otp_instance'] = otp
            return attrs
            
        except OTP.DoesNotExist:
            # Try to find OTP with wrong code to provide better error message
            try:
                user = User.objects.get(id=user_id)
                otp = OTP.objects.get(
                    user=user,
                    otp_type=otp_type,
                    is_used=False
                )
                
                # Check if max attempts reached for wrong code
                if otp.is_max_attempts_reached():
                    otp.expire_otp()
                    raise serializers.ValidationError({
                        'otp_code': "Maximum verification attempts exceeded. OTP has been expired. Please request a new one.",
                        'attempts_used': otp.attempt_count,
                        'max_attempts': otp.max_attempts,
                        'error_type': 'max_attempts_exceeded'
                    })
                
                # Wrong OTP code - increment attempt count
                current_attempts = otp.increment_attempt()
                remaining_attempts = otp.get_remaining_attempts()
                
                error_message = f"Invalid OTP code. {remaining_attempts} attempt(s) remaining."
                if remaining_attempts == 0:
                    otp.expire_otp()
                    error_message = "Maximum verification attempts exceeded. OTP has been expired. Please request a new one."
                
                raise serializers.ValidationError({
                    'otp_code': error_message,
                    'attempts_used': current_attempts,
                    'max_attempts': otp.max_attempts,
                    'remaining_attempts': remaining_attempts,
                    'error_type': 'invalid_code'
                })
                
            except OTP.DoesNotExist:
                raise serializers.ValidationError({
                    'otp_code': "Invalid OTP code or OTP type.",
                    'error_type': 'not_found'
                })
    
    def save(self):
        """Mark OTP as used after successful verification"""
        otp = self.validated_data['otp_instance']
        
        # Double-check expiration before marking as used
        if otp.is_expired():
            raise serializers.ValidationError("OTP has expired during verification process.")
        
        # Double-check max attempts before marking as used
        if otp.is_max_attempts_reached():
            raise serializers.ValidationError("Maximum verification attempts exceeded during verification process.")
        
        otp.is_used = True
        otp.save()
        return otp
