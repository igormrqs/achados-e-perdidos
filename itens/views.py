from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse, HttpResponseBadRequest
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import ensure_csrf_cookie
from datetime import datetime
import json

from .models import Item


@ensure_csrf_cookie
def home(request):
    """
    Renderiza a página principal do site de Achados e Perdidos.
    O @ensure_csrf_cookie garante que o cookie de CSRF seja enviado
    para o navegador (vamos usar no fetch do JavaScript).
    """
    return render(request, "itens/index.html")


@require_http_methods(["GET", "POST"])
def item_list_create(request):
    """
    GET  -> retorna lista de itens em JSON
    POST -> cria um novo item a partir de um JSON enviado pelo frontend
    """
    if request.method == "GET":
        itens = Item.objects.order_by("-data_encontrado", "-data_criacao")
        data = [
            {
                "id": item.id,
                "name": item.nome,
                "location": item.local_encontrado or "",
                "date": item.data_encontrado.isoformat(),  # 'YYYY-MM-DD'
            }
            for item in itens
        ]
        return JsonResponse(data, safe=False)

    # Se for POST:
    try:
        body = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return HttpResponseBadRequest("JSON inválido")

    name = body.get("name")
    location = body.get("location")
    date_str = body.get("date")  # 'YYYY-MM-DD'

    if not (name and location and date_str):
        return HttpResponseBadRequest("Campos obrigatórios faltando")

    try:
        data_encontrado = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return HttpResponseBadRequest("Formato de data inválido")

    item = Item.objects.create(
        nome=name,
        local_encontrado=location,
        data_encontrado=data_encontrado,
    )

    data = {
        "id": item.id,
        "name": item.nome,
        "location": item.local_encontrado or "",
        "date": item.data_encontrado.isoformat(),
    }
    return JsonResponse(data, status=201)


@require_http_methods(["DELETE"])
def item_delete(request, item_id):
    """
    DELETE -> remove o item do banco (podemos depois trocar para "status = Devolvido").
    """
    item = get_object_or_404(Item, id=item_id)
    item.delete()
    return JsonResponse({"status": "ok"})
