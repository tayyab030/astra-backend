from rest_framework import serializers

from tasks.models import Project

class ProjectSerializer(serializers.ModelSerializer):
    status = serializers.ChoiceField(
            choices=[c[0] for c in Project.STATUS_CHOICES],  # ["on_track", "at_risk", ...]
            error_messages={
                "invalid_choice": "Status must be one of: on_track, at_risk, off_track, on_hold, complete."
            }
        )
    icon = serializers.ChoiceField(
            choices=[c[0] for c in Project.ICON_CHOICES],  # ["", "List", "BarChart", ...]
            error_messages={
                "invalid_choice": "Icon must be one of: List, BarChart, Layers, Calendar, Rocket, Users, TrendingUp, Star, Bug, Lightbulb, Globe, Settings, FileText, Monitor, CheckCircle, Target, Code, Megaphone, MessageCircle, Briefcase, or blank."
            }
        )
    class Meta:
        model = Project
        fields = ["id", "title", "starred", "status", "color", "description", "due_date", "icon"] 
        extra_kwargs = {
            "id": {"read_only": True},
            "created_at": {"read_only": True},
            "updated_at": {"read_only": True},
        } 

