from django.contrib import admin
from .models import Item


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'nome',
        'categoria',
        'status',
        'local_encontrado',
        'data_encontrado',
        'data_criacao',
    )
    list_filter = ('status', 'categoria', 'data_encontrado')
    search_fields = ('nome', 'descricao', 'local_encontrado')
