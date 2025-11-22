from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),

    # API de itens (lista + criação)
    path('api/itens/', views.item_list_create, name='item_list_create'),

    # marcar item como devolvido (uso interno)
    path('api/itens/<int:item_id>/', views.item_mark_returned, name='item_mark_returned'),

    # novo endpoint de Blind Claim (reivindicação de item)
    path('api/itens/<int:item_id>/claim/', views.item_claim_create, name='item_claim_create'),
]
