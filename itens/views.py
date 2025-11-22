# ============================================================
# Achados e Perdidos - UnDF
# Arquivo: views.py
#
# Eu (estudante de CC) estou centralizando aqui as views simples
# do app "itens". A ideia é manter tudo em função baseada (FBV),
# com comentários explicando as decisões.
# ============================================================

from datetime import datetime
import json

from django.http import JsonResponse, HttpResponseBadRequest
from django.shortcuts import render, get_object_or_404
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt

from .models import Item, Reivindicacao


@ensure_csrf_cookie
def home(request):
    """
    View da página principal do site externo.

    Renderiza o template itens/index.html.
    O decorator ensure_csrf_cookie garante que o navegador receba
    o cookie 'csrftoken', que posso usar no JavaScript quando
    eu decidir ativar CSRF nas APIs.
    """
    return render(request, "itens/index.html")


@csrf_exempt  # por enquanto deixo sem CSRF para simplificar o desenvolvimento
@require_http_methods(["GET", "POST"])
def item_list_create(request):
    """
    API simples para lista/criação de itens.

    GET  -> retorna itens em estoque E aprovados, em JSON.
    POST -> cria um novo item vindo do site externo (começa não aprovado).

    Fluxo pensado:
    - Usuário externo registra que encontrou um item.
    - A equipe interna revisa e marca "aprovado=True".
    - Só então esse item entra na listagem pública.
    """
    if request.method == "GET":
        itens = (
            Item.objects
            .filter(status="Em estoque", aprovado=True)
            .order_by("-data_encontrado", "-data_criacao")
        )

        data = []
        for item in itens:
            data.append({
                "id": item.id,
                "name": item.nome,
                "location": item.local_encontrado or "",
                "date": item.data_encontrado.isoformat(),  # 'YYYY-MM-DD'
                "category": item.categoria or "",
                "description": item.descricao or "",
                "status": item.status,
            })

        return JsonResponse(data, safe=False)

    # Se chegou aqui, é POST (por causa do decorator).
    try:
        body = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return HttpResponseBadRequest("JSON inválido")

    name = body.get("name")
    location = body.get("location")
    date_str = body.get("date")  # esperado 'YYYY-MM-DD'

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
        # status padrão já é "Em estoque"
        # aprovado=False (revisão interna antes de publicar)
        aprovado=False,
    )

    data = {
        "id": item.id,
        "nome": item.nome,
        "mensagem": "Item criado e aguardando aprovação interna.",
    }
    return JsonResponse(data, status=201)


@csrf_exempt
@require_http_methods(["DELETE"])
def item_mark_returned(request, item_id):
    """
    Endpoint pensado para uso interno (colaborador):

    marca um item como 'Devolvido' quando ele sai definitivamente
    do Achados e Perdidos.

    No site público a gente não chama isso ainda, mas ele já
    está pronto para ser usado pelo painel interno no futuro.
    """
    item = get_object_or_404(Item, id=item_id)
    item.status = "Devolvido"
    item.save(update_fields=["status"])

    return JsonResponse({"status": "ok", "new_status": item.status})


@csrf_exempt
@require_http_methods(["POST"])
def item_claim_create(request, item_id):
    """
    Cria uma 'Reivindicação' (Blind Claim) para um item específico.

    Fluxo:
    - usuário externo seleciona um item na lista;
    - preenche nome, contato e detalhes que comprovam que o item é dele;
    - a equipe interna vê essa reivindicação no admin e decide o que fazer.

    Por enquanto essa view só recebe dados e registra no banco.
    A parte visual (formulário no front) será feita em seguida.
    """
    item = get_object_or_404(Item, id=item_id)

    try:
        body = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return HttpResponseBadRequest("JSON inválido")

    nome = body.get("nome")
    contato = body.get("contato")
    detalhes = body.get("detalhes")

    if not (nome and detalhes):
        return HttpResponseBadRequest("Campos obrigatórios faltando")

    reivindicacao = Reivindicacao.objects.create(
        item=item,
        nome_requerente=nome,
        contato=contato or "",
        detalhes=detalhes,
    )

    data = {
        "id": reivindicacao.id,
        "mensagem": "Reivindicação registrada e enviada para análise da equipe interna.",
    }
    return JsonResponse(data, status=201)
