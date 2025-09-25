from djoser.serializers import UserCreateSerializer as BaseUserCreateSerializer, TokenCreateSerializer
from django.contrib.auth import authenticate, get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

class UserCreateSerializer(BaseUserCreateSerializer):
    class Meta(BaseUserCreateSerializer.Meta):
        fields = ["id", "username", "email", "password", "first_name", "last_name"]
        extra_kwargs = {
            'first_name': {'required': False, 'allow_blank': True},
            'last_name': {'required': False, 'allow_blank': True},
        }
class CustomTokenCreateSerializer(serializers.Serializer):
    login = serializers.CharField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate(self, attrs):
        login = attrs.get("login")
        password = attrs.get("password")

        if not login or not password:
            raise serializers.ValidationError("Both login and password are required.")

        user = None

        # Try email login
        try:
            user_obj = User.objects.get(email__iexact=login)
            username = user_obj.get_username()
            user = authenticate(
                request=self.context.get("request"),
                username=username,
                password=password
            )
        except User.DoesNotExist:
            # Try username login
            user = authenticate(
                request=self.context.get("request"),
                username=login,
                password=password
            )

        if not user:
            raise serializers.ValidationError("Invalid credentials")

        refresh = RefreshToken.for_user(user)

        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
            }
        }