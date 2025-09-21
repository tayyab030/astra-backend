"""
Utility functions for OTP operations
"""
import random
import string
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags


def generate_otp_code(length=6):
    """
    Generate a random OTP code of specified length
    
    Args:
        length (int): Length of the OTP code (default: 6)
    
    Returns:
        str: Generated OTP code
    """
    return ''.join(random.choices(string.digits, k=length))


def send_otp_email(user_email, otp_code, otp_type='email'):
    """
    Send OTP code via email
    
    Args:
        user_email (str): User's email address
        otp_code (str): Generated OTP code
        otp_type (str): Type of OTP (default: 'email')
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        subject = 'Your OTP Code - Astra'
        
        # Create HTML email template
        html_message = f"""
        <html>
        <body>
            <h2>Your OTP Code</h2>
            <p>Hello,</p>
            <p>Your OTP code is: <strong style="font-size: 24px; color: #007bff;">{otp_code}</strong></p>
            <p>This code will expire in 5 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
            <br>
            <p>Best regards,<br>Astra Team</p>
        </body>
        </html>
        """
        
        plain_message = strip_tags(html_message)
        
        send_mail(
            subject,
            plain_message,
            settings.DEFAULT_FROM_EMAIL,
            [user_email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
        
    except Exception as e:
        print(f"Error sending OTP email: {str(e)}")
        return False


def send_otp_sms(phone_number, otp_code):
    """
    Send OTP code via SMS (placeholder for SMS service integration)
    
    Args:
        phone_number (str): User's phone number
        otp_code (str): Generated OTP code
    
    Returns:
        bool: True if SMS sent successfully, False otherwise
    """
    # This is a placeholder. In a real application, you would integrate
    # with an SMS service provider like Twilio, AWS SNS, etc.
    try:
        # Example integration with Twilio (uncomment and configure):
        # from twilio.rest import Client
        # 
        # client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        # 
        # message = client.messages.create(
        #     body=f'Your OTP code is: {otp_code}',
        #     from_=settings.TWILIO_PHONE_NUMBER,
        #     to=phone_number
        # )
        
        print(f"SMS OTP {otp_code} would be sent to {phone_number}")
        return True
        
    except Exception as e:
        print(f"Error sending OTP SMS: {str(e)}")
        return False


def cleanup_expired_otps():
    """
    Clean up expired OTPs from the database and delete inactive users with no valid OTPs
    This can be run as a periodic task using Celery or Django management command
    """
    from .models import OTP
    from django.contrib.auth import get_user_model
    from django.utils import timezone
    from datetime import timedelta
    
    User = get_user_model()
    
    # Delete OTPs that are older than 24 hours
    cutoff_time = timezone.now() - timedelta(hours=24)
    expired_otps = OTP.objects.filter(created_at__lt=cutoff_time)
    otp_count = expired_otps.count()
    expired_otps.delete()
    
    # Find users with is_active=False and no valid OTP rows
    # A valid OTP is one that is not used and not expired
    inactive_users = User.objects.filter(is_active=False)
    deleted_users_count = 0
    
    for user in inactive_users:
        # Check if user has any valid (non-expired, non-used) OTPs
        valid_otps = OTP.objects.filter(
            user=user,
            is_used=False
        ).exclude(
            created_at__lt=timezone.now() - timedelta(seconds=OTP.DEFAULT_EXPIRY_SECONDS)  # 5 minutes default expiry
        )
        
        # If no valid OTPs exist, delete the user
        if not valid_otps.exists():
            user.delete()
            deleted_users_count += 1
    
    return {
        'expired_otps_deleted': otp_count,
        'inactive_users_deleted': deleted_users_count,
        'total_cleanup_count': otp_count + deleted_users_count
    }


def get_otp_usage_stats(user):
    """
    Get OTP usage statistics for a user
    
    Args:
        user: User instance
    
    Returns:
        dict: Statistics about OTP usage
    """
    from .models import OTP
    from django.utils import timezone
    from datetime import timedelta
    
    now = timezone.now()
    last_24h = now - timedelta(hours=24)
    last_7d = now - timedelta(days=7)
    
    stats = {
        'total_otps': OTP.objects.filter(user=user).count(),
        'used_otps': OTP.objects.filter(user=user, is_used=True).count(),
        'active_otps': OTP.objects.filter(user=user, is_used=False).count(),
        'otps_last_24h': OTP.objects.filter(user=user, created_at__gte=last_24h).count(),
        'otps_last_7d': OTP.objects.filter(user=user, created_at__gte=last_7d).count(),
    }
    
    return stats
