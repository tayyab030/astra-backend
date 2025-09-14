from rest_framework import serializers

from tasks.models import Project

class ProjectSerializer(serializers.ModelSerializer):
    status = serializers.ChoiceField(
            choices=[c[0] for c in Project.STATUS_CHOICES],  # ["on_track", "at_risk", ...]
            error_messages={
                "invalid_choice": "Status must be one of: on_track, at_risk, off_track, on_hold, complete."
            }
        )
    class Meta:
        model = Project
        fields = ["id", "title", "starred", "status", "color", "description", "due_date"] 
        extra_kwargs = {
            "id": {"read_only": True},
            "created_at": {"read_only": True},
            "updated_at": {"read_only": True},
        } 

