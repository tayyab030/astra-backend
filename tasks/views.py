from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from tasks.serializers.project_serializers import ProjectSerializer
from tasks.models import Project
from rest_framework import status

# all projects api
@api_view(["GET", "POST"])
def project_list(request):
    if request.method == "GET":
        projects = Project.objects.all()
        serializer = ProjectSerializer(projects, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    elif request.method == "POST":
        serializer = ProjectSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

@api_view(["GET", "PUT", "DELETE"])
def project_detail(request, pk):
    pk_int = int(pk)
    project = get_object_or_404(Project, id=pk_int)
    if request.method == "GET":
        try:
            # Convert pk to integer to handle string/float inputs
            serializer = ProjectSerializer(project)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except ValueError:
            # Handle case where pk cannot be converted to integer
            return Response(
                {"error": "Invalid project ID. Expected an integer."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except ValidationError as e:
            # Handle any validation errors from the serializer
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    elif request.method == "PUT":
        serializer = ProjectSerializer(project, data=request.data)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
    elif request.method == "DELETE":
        project.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

