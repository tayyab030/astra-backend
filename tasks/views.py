from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from tasks.serializers.project_serializers import ProjectSerializer
from tasks.models import Project
from tasks.serializers.section_serializers import SectionSerializer
from tasks.models import Section

# all projects api
# this viewset is used to create, retrieve, update and delete projects
class ProjectViewSet(ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter projects by authenticated user"""
        return Project.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        """Automatically set the user when creating a project"""
        serializer.save(user=self.request.user)

    def get_serializer_context(self):
        return {'request': self.request}
    
# all sections api
class SectionViewSet(ModelViewSet):
    serializer_class = SectionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter sections by project_id from nested URL and ensure project belongs to authenticated user"""
        project_id = self.kwargs.get('project_pk')  # Nested router uses 'project_pk'
        if project_id:
            # Validate that project_id is a valid integer
            try:
                project_id = int(project_id)
            except (ValueError, TypeError):
                raise NotFound("Invalid project ID. Expected a number.")
            
            # Validate that the project exists and belongs to the authenticated user
            project = get_object_or_404(Project, id=project_id, user=self.request.user)
            return Section.objects.filter(project_id=project_id).order_by('order')
        return Section.objects.none()  # Return empty queryset if no project_id
    
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
