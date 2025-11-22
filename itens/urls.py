from django.urls import path
from . import views

urlpatterns = [
    # Página principal (site externo)
    path('', views.home, name='home'),

    # API lista/criação
    path('api/itens/', views.item_list_create, name='item_list_create'),

    # API para marcar item como devolvido (mesmo endpoint que o "apagar")
    path('api/itens/<int:item_id>/', views.item_mark_returned, name='item_mark_returned'),
]
