from django.db import models
from django.utils import timezone
from datetime import timedelta
from core.models import User
import uuid

class OTP(models.Model):
    TYPES_CHOICES = [
        ("email", "Email"),
        ("sms", "SMS"),
        ("authenticator", "Authenticator App"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)

    otp_code = models.CharField(max_length=6, editable=False,)
    otp_type = models.CharField(max_length=20, choices=TYPES_CHOICES, default="email")
    created_at = models.DateTimeField(auto_now_add=True)
    expires_in = models.IntegerField(default=300)  # seconds (5 min)
    is_used = models.BooleanField(default=False)
    token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)

    def is_expired(self):
        return timezone.now() > self.created_at + timedelta(seconds=self.expires_in)
    
    def get_expires_at(self):
        """Get the exact expiration time"""
        return self.created_at + timedelta(seconds=self.expires_in)
    
    def get_remaining_time(self):
        """Get remaining time in seconds before expiration"""
        if self.is_expired():
            return 0
        remaining = self.get_expires_at() - timezone.now()
        return int(remaining.total_seconds())
    
    @classmethod
    def expire_previous_otps(cls, user, otp_type):
        """
        Expire all previous active OTPs of the same type for a user
        
        Args:
            user: User instance
            otp_type: Type of OTP to expire
            
        Returns:
            int: Number of OTPs that were expired
        """
        previous_otps = cls.objects.filter(
            user=user,
            otp_type=otp_type,
            is_used=False
        )
        return previous_otps.update(is_used=True)

