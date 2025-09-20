from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from django.db.models import Max
from django.db import IntegrityError
from tasks.models import Section, Project

class SectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Section
        fields = ["id", "title", "project", "order"]
        extra_kwargs = {
            "id": {"read_only": True},
            "created_at": {"read_only": True},
            "updated_at": {"read_only": True},
            "project": {"read_only": True},
            "order": {"read_only": True},
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        request = self.context.get("request")
        if request and request.method == "POST":
            # Make order read-only only for POST (creation)
            self.fields["order"].read_only = True
        else:
            # Allow order to be editable for PUT/PATCH (updates)
            self.fields["order"].read_only = False

    def create(self, validated_data):
        """Handle section creation with project_id validation and order calculation"""
        project_id = self.context.get('project_id')
        if not project_id:
            raise ValidationError("project_id is required for section creation")
        
        # Validate that project_id is a valid integer
        try:
            project_id = int(project_id)
        except (ValueError, TypeError):
            raise ValidationError("Invalid project ID. Expected a number.")
        
        # Validate that the project exists and get it
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            raise ValidationError(f"Project with id {project_id} does not exist")
        
        # Calculate next order
        last_order = project.sections.aggregate(max_order=Max('order'))['max_order']
        next_order = (last_order + 10) if last_order is not None else 0
        
        # Set project_id and calculated order
        validated_data['project_id'] = project_id
        validated_data['order'] = next_order
        
        try:
            return super().create(validated_data)
        except IntegrityError as e:
            if 'unique constraint' in str(e).lower():
                raise ValidationError(f"Order {next_order} already exists for this project. Please try again.")
            raise ValidationError("An error occurred while creating the section.")
    
    def update(self, instance, validated_data):
        """Handle section update with order uniqueness validation"""
        project_id = validated_data.get('project_id', instance.project_id)
        new_order = validated_data.get('order', instance.order)
        
        # Check if order is being changed and if it conflicts with existing order
        if 'order' in validated_data and new_order != instance.order:
            # Check if another section in the same project already has this order
            existing_section = Section.objects.filter(
                project_id=project_id, 
                order=new_order
            ).exclude(id=instance.id).first()
            
            if existing_section:
                raise ValidationError(f"Order {new_order} already exists for this project. Order must be unique for each section in a project.")
        
        try:
            return super().update(instance, validated_data)
        except IntegrityError as e:
            if 'unique constraint' in str(e).lower():
                raise ValidationError(f"Order {new_order} already exists for this project. Please choose a different order.")
            raise ValidationError("An error occurred while updating the section.")    
