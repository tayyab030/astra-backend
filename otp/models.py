from django.db import models
from django.utils import timezone
from datetime import timedelta
from core.models import User
import uuid

class OTP(models.Model):
    # Constants
    DEFAULT_EXPIRY_SECONDS = 300  # 5 minutes default expiry
    TYPES_CHOICES = [
        ("email", "Email"),
        ("sms", "SMS"),
        ("authenticator", "Authenticator App"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otp_user')

    otp_code = models.CharField(max_length=6, editable=False,)
    otp_type = models.CharField(max_length=20, choices=TYPES_CHOICES, default="email")
    created_at = models.DateTimeField(auto_now_add=True)
    expires_in = models.IntegerField(default=DEFAULT_EXPIRY_SECONDS)  # seconds (5 min)
    is_used = models.BooleanField(default=False)
    token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    attempt_count = models.PositiveIntegerField(default=0)
    max_attempts = models.PositiveIntegerField(default=3)

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
    
    def increment_attempt(self):
        """Increment the attempt count and return the new count"""
        self.attempt_count += 1
        self.save()
        return self.attempt_count
    
    def is_max_attempts_reached(self):
        """Check if maximum attempts have been reached"""
        return self.attempt_count >= self.max_attempts
    
    def get_remaining_attempts(self):
        """Get the number of remaining attempts"""
        return max(0, self.max_attempts - self.attempt_count)
    
    def expire_otp(self):
        """Mark OTP as used (expired) due to max attempts reached"""
        self.is_used = True
        self.save()
    
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

