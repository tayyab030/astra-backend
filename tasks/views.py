from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework.views import APIView
from tasks.serializers.project_serializers import ProjectSerializer
from tasks.models import Project
from rest_framework import status
from tasks.serializers.section_serializers import SectionSerializer
from tasks.models import Section
from django.db.models import Max
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.viewsets import ModelViewSet

# all projects api
# this viewset is used to create, retrieve, update and delete projects
class ProjectViewSet(ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer

    def get_serializer_context(self):
        return {'request': self.request}
    
    
# class ProjectList(APIView):
    # def project_list(request):
        # def get(self, request):
        #     projects = Project.objects.all()
        #     serializer = ProjectSerializer(projects, many=True)
        #     return Response(serializer.data, status=status.HTTP_200_OK)
        # def post(self, request):
        #     serializer = ProjectSerializer(data=request.data)
        #     if serializer.is_valid(raise_exception=True):
        #         serializer.save()
        #         return Response(serializer.data, status=status.HTTP_201_CREATED)

# class ProjectDetail(APIView):
#     def get(self,request, pk):
#         pk_int = int(pk)
#         project = get_object_or_404(Project, id=pk_int)
#         try:
#             # Convert pk to integer to handle string/float inputs
#             serializer = ProjectSerializer(project)
#             return Response(serializer.data)
#         except ValueError:
#             # Handle case where pk cannot be converted to integer
#             return Response(
#                     {"error": "Invalid project ID. Expected an integer."}, 
#                     status=status.HTTP_400_BAD_REQUEST
#                 )
#         except ValidationError as e:
#             # Handle any validation errors from the serializer
#             return Response(
#                 {"error": str(e)}, 
#                 status=status.HTTP_400_BAD_REQUEST
#             )
#     def put(self, request, pk):
#         pk_int = int(pk)
#         project = get_object_or_404(Project, id=pk_int)
#         serializer = ProjectSerializer(project, data=request.data)
#         if serializer.is_valid(raise_exception=True):
#             serializer.save()
#             return Response(serializer.data, status=status.HTTP_200_OK)
#     def delete(self, request, pk):
#         pk_int = int(pk)
#         project = get_object_or_404(Project, id=pk_int)
#         project.delete()
#         return Response(status=status.HTTP_204_NO_CONTENT)

# all sections api

@api_view(["GET", "POST"])
def section_list(request, project_id):
    if request.method == "GET":
        sections = Section.objects.filter(project_id=project_id)
        serializer = SectionSerializer(sections, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    elif request.method == "POST":
        project = Project.objects.get(id=project_id)
        last_order = project.sections.aggregate(max_order=Max('order'))['max_order']
        next_order = (last_order + 1) if last_order is not None else 0
        serializer = SectionSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            serializer.save(project_id=project_id, order=next_order)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

@api_view(["GET", "PUT", "DELETE"])
def section_detail(request, pk):
    pk_int = int(pk)
    section = get_object_or_404(Section, id=pk_int)
    if request.method == "GET":
        serializer = SectionSerializer(section)
        return Response(serializer.data, status=status.HTTP_200_OK)
    elif request.method == "PUT":
        serializer = SectionSerializer(section, data=request.data)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
    elif request.method == "DELETE":
        section.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

# 1:52:00         https://www.youtube.com/watch?v=_WSzE8xjxMY&t=49s&ab_channel=evlearn