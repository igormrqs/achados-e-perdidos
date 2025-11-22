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
    Página principal do site de Achados e Perdidos.
    Garante que o cookie de CSRF seja enviado.
    """
    return render(request, "itens/index.html")


@require_http_methods(["GET", "POST"])
def item_list_create(request):
    """
    GET  -> retorna itens EM ESTOQUE e APROVADOS em JSON
    POST -> cria novo item vindo do site externo (começa como NÃO aprovado)
    """
    if request.method == "GET":
        # Como estudante, aqui eu decidi filtrar:
        # - apenas itens "Em estoque"
        # - apenas itens aprovados pelo colaborador interno
        itens = (
            Item.objects
            .filter(status="Em estoque", aprovado=True)
            .order_by("-data_encontrado", "-data_criacao")
        )

        data = [
            {
                "id": item.id,
                "name": item.nome,
                "location": item.local_encontrado or "",
                "date": item.data_encontrado.isoformat(),  # 'YYYY-MM-DD'
                "category": item.categoria or "",
                "description": item.descricao or "",
                "status": item.status,
            }
            for item in itens
        ]
        return JsonResponse(data, safe=False)

    # Se for POST (cadastro via site externo):
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

    # Itens vindos do site entram como "Em estoque" e "aprovado=False"
    item = Item.objects.create(
        nome=name,
        local_encontrado=location,
        data_encontrado=data_encontrado,
        # deixa categoria/descricao para o colaborador ajustar depois
        aprovado=False,
    )

    # Eu nem preciso mandar o item de volta para aparecer na lista,
    # porque ele ainda não está aprovado. Vou só retornar algo simples.
    data = {
        "id": item.id,
        "nome": item.nome,
        "mensagem": "Item criado e aguardando aprovação interna.",
    }
    return JsonResponse(data, status=201)



@require_http_methods(["DELETE"])
def item_mark_returned(request, item_id):
    """
    Marca o item como 'Devolvido' em vez de apagar do banco.
    Assim mantemos o histórico para o sistema interno.
    """
    item = get_object_or_404(Item, id=item_id)
    item.status = "Devolvido"
    item.save(update_fields=["status"])

    return JsonResponse({"status": "ok", "new_status": item.status})
