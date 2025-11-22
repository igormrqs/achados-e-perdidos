from django.contrib import admin

from .models import Item, Reivindicacao


# ============================================================
# Admin do Django – quero que ele ajude de verdade o colaborador,
# não só seja "uma tela feia para desenvolvedor".
# Por isso configuro list_display, filtros etc.
# ============================================================

@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'nome',
        'categoria',
        'status',
        'aprovado',
        'local_encontrado',
        'data_encontrado',
        'data_criacao',
    )
    list_filter = ('status', 'categoria', 'aprovado', 'data_encontrado')
    search_fields = ('nome', 'descricao', 'local_encontrado')
    list_editable = ('categoria', 'status', 'aprovado')


@admin.register(Reivindicacao)
class ReivindicacaoAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'item',
        'nome_requerente',
        'status',
        'data_envio',
    )
    list_filter = ('status', 'data_envio')
    search_fields = ('nome_requerente', 'contato', 'detalhes')
    autocomplete_fields = ('item',)
