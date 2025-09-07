from rest_framework import serializers
from .models import User
from django.contrib.auth.hashers import make_password

class UserSignupSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['full_name', 'email', 'password', 'accepted_terms']

    def create(self, validated_data):
        # Hash password before saving
        validated_data['password'] = make_password(validated_data['password'])
        return super().create(validated_data)
