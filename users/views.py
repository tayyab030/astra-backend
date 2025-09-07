from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from .serializers import UserSignupSerializer
from rest_framework_simplejwt.tokens import RefreshToken

class SignupView(APIView):
    def post(self, request):
        serializer = UserSignupSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()

            # Generate JWT token
            refresh = RefreshToken.for_user(user)

            return Response({
                'message': 'User created successfully',
                'user': {
                    'id': user.id,
                    'full_name': user.full_name,
                    'email': user.email,
                },
                'token': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
