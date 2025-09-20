from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from rest_framework.exceptions import NotFound
from django.shortcuts import get_object_or_404
from tasks.serializers.project_serializers import ProjectSerializer
from tasks.models import Project
from tasks.serializers.section_serializers import SectionSerializer
from tasks.models import Section

# all projects api
# this viewset is used to create, retrieve, update and delete projects
class ProjectViewSet(ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer

    def get_serializer_context(self):
        return {'request': self.request}
    
# all sections api
class SectionViewSet(ModelViewSet):
    serializer_class = SectionSerializer
    
    def get_queryset(self):
        """Filter sections by project_id from nested URL"""
        project_id = self.kwargs.get('project_pk')  # Nested router uses 'project_pk'
        if project_id:
            # Validate that project_id is a valid integer
            try:
                project_id = int(project_id)
            except (ValueError, TypeError):
                raise NotFound("Invalid project ID. Expected a number.")
            
            # Validate that the project exists, raise 404 if not
            get_object_or_404(Project, id=project_id)
            return Section.objects.filter(project_id=project_id).order_by('order')
        return Section.objects.all().order_by('order')
    
    def get_serializer_context(self):
        """Add request context and project_id to serializer"""
        context = {'request': self.request}
        project_id = self.kwargs.get('project_pk')  # Nested router uses 'project_pk'
        if project_id:
            # Validate that project_id is a valid integer
            try:
                project_id = int(project_id)
                context['project_id'] = project_id
            except (ValueError, TypeError):
                # Let the serializer handle the validation error
                pass
        return context

# 2:27:00         https://www.youtube.com/watch?v=_WSzE8xjxMY&t=49s&ab_channel=evlearn