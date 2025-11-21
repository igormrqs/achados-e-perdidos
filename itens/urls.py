from django.urls import path
from . import views

urlpatterns = [
    # Página principal (site externo)
    path('', views.home, name='home'),

    # API simples para lista/criação de itens
    path('api/itens/', views.item_list_create, name='item_list_create'),

    # API para apagar item (ou marcar como devolvido, por enquanto vamos remover)
    path('api/itens/<int:item_id>/', views.item_delete, name='item_delete'),
]
