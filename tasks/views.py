from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from tasks.serializers.project_serializers import ProjectSerializer, ProjectDetailSerializer
from tasks.models import Project
from rest_framework import status

# all projects api
@api_view()
def project_list(request):
    projects = Project.objects.all()
    serializer = ProjectSerializer(projects, many=True)
    return Response(serializer.data)

@api_view()
def project_detail(request, pk):    
    try:
        # Convert pk to integer to handle string/float inputs
        pk_int = int(pk)
        project = get_object_or_404(Project, id=pk_int)
        serializer = ProjectDetailSerializer(project)
        return Response(serializer.data)
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

