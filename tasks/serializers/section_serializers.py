from rest_framework import serializers
from tasks.models import Section

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
        if request and request.method != "PUT":
            self.fields["order"].read_only = True

    def create(self, validated_data):
        # Get project_id from context and set it for the section
        project_id = self.context.get('project_id')
        if project_id:
            validated_data['project_id'] = project_id
        return super().create(validated_data)    
