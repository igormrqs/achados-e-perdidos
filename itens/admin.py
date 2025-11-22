from django.contrib import admin
from .models import Item


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    # Como estudante, pensei na administração focada no fluxo:
    # ver rapidamente status+aprovado e permitir filtrar fácil.
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

    # Permite marcar "aprovado" direto na lista, sem entrar no detalhe.
    list_editable = ('aprovado',)

