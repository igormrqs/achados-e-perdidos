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


# ----------------- Páginas HTML -----------------


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


@ensure_csrf_cookie
def internal_dashboard(request):
    """
    Painel simples para uso interno (colaborador).

    Nesta página vou consumir APIs internas para listar e atualizar
    as reivindicações de itens.
    """
    return render(request, "itens/internal_dashboard.html")


# ----------------- API pública de itens -----------------


@csrf_exempt  # por enquanto deixo sem CSRF para simplificar o desenvolvimento
@require_http_methods(["GET", "POST"])
def item_list_create(request):
    """
    API simples para lista/criação de itens.

    GET  -> retorna itens em estoque E aprovados, em JSON.
    POST -> cria um novo item vindo de uma futura interface interna
            (hoje não usamos pelo site público).

    Fluxo atual:
    - Itens são cadastrados por servidores internos (via admin ou painel);
    - Apenas itens com aprovado=True aparecem na listagem pública.
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
    Marca um item como 'Devolvido' (pensado para uso interno).

    No site público ainda não chamamos isso, mas está pronto
    para ser usado pelo painel interno no futuro.
    """
    item = get_object_or_404(Item, id=item_id)
    item.status = "Devolvido"
    item.save(update_fields=["status"])

    return JsonResponse({"status": "ok", "new_status": item.status})


# ----------------- API pública de Blind Claim -----------------


@csrf_exempt
@require_http_methods(["POST"])
def item_claim_create(request, item_id):
    """
    Cria uma 'Reivindicação' (Blind Claim) para um item específico.

    Fluxo:
    - usuário externo seleciona um item na lista;
    - preenche nome, contato e detalhes que comprovam que o item é dele;
    - a equipe interna vê essa reivindicação no admin ou no painel interno.
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


# ----------------- API interna (painel de reivindicações) -----------------


@csrf_exempt
@require_http_methods(["GET"])
def internal_claims_list(request):
    """
    Retorna todas as reivindicações, com alguns dados do item associado.

    Essa API é usada pelo painel interno para o colaborador
    visualizar as solicitações feitas pelo site público.
    """
    reivindicacoes = (
        Reivindicacao.objects
        .select_related("item")
        .order_by("-data_envio")
    )

    data = []
    for rev in reivindicacoes:
        data.append({
            "id": rev.id,
            "status": rev.status,
            "data_envio": rev.data_envio.isoformat(),
            "nome_requerente": rev.nome_requerente,
            "contato": rev.contato or "",
            "detalhes": rev.detalhes,
            "item": {
                "id": rev.item.id,
                "nome": rev.item.nome,
                "local_encontrado": rev.item.local_encontrado or "",
                "data_encontrado": rev.item.data_encontrado.isoformat(),
                "status": rev.item.status,
                "aprovado": rev.item.aprovado,
            },
        })

    return JsonResponse(data, safe=False)


@csrf_exempt
@require_http_methods(["POST"])
def internal_claim_update_status(request, claim_id):
    """
    Atualiza o status de uma reivindicação via painel interno.

    Se a reivindicação for marcada como 'Aprovada', atualizo também
    o status do item para 'Reivindicado'.
    """
    try:
        body = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return HttpResponseBadRequest("JSON inválido")

    new_status = body.get("status")

    valid_status = {choice[0] for choice in Reivindicacao.STATUS_CHOICES}
    if new_status not in valid_status:
        return HttpResponseBadRequest("Status inválido")

    rev = get_object_or_404(Reivindicacao, id=claim_id)
    rev.status = new_status
    rev.save(update_fields=["status"])

    # se aprovado, atualizo item
    item = rev.item
    if new_status == "Aprovada":
        item.status = "Reivindicado"
        item.save(update_fields=["status"])

    return JsonResponse({
        "id": rev.id,
        "status": rev.status,
        "item_status": item.status,
    })


@csrf_exempt
@require_http_methods(["POST"])
def internal_item_back_to_stock(request, item_id):
    """
    Uso interno: volta um item para 'Em estoque' em caso de erro.

    Exemplo de uso:
    - colaborador aprovou uma reivindicação errada;
    - depois ajusta o status da reivindicação e, se necessário,
      volta o item para 'Em estoque' manualmente.
    """
    item = get_object_or_404(Item, id=item_id)
    item.status = "Em estoque"
    item.save(update_fields=["status"])

    return JsonResponse({
        "id": item.id,
        "status": item.status,
    })
